"""
File Converter Backend — Google Cloud Run
Converts MD, JSON, BAS → PDF, DOCX, TXT, XLSX
Saves output to caller's Google Drive via service account delegation
Stores history in Firestore
"""

import os
import io
import json
import logging
import uuid
from datetime import datetime, timezone

from flask import Flask, request, jsonify
from flask_cors import CORS
from google.oauth2 import id_token
from google.auth.transport import requests as grequests
from google.cloud import firestore, storage
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
import google.auth

from converters.md_converter import convert_md
from converters.json_converter import convert_json
from converters.bas_converter import convert_bas

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# ── Config ────────────────────────────────────────────────────
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GCS_BUCKET       = os.environ.get("GCS_TEMP_BUCKET", "")
PROJECT_ID       = os.environ.get("GOOGLE_CLOUD_PROJECT", "")

MIME_MAP = {
    "pdf":  "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "txt":  "text/plain",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}

CONVERTER_MAP = {
    "md":   convert_md,
    "json": convert_json,
    "bas":  convert_bas,
    "txt":  convert_bas,   # treat plain text like BAS (passthrough)
}

db = firestore.Client()


# ── Auth helper ───────────────────────────────────────────────
def verify_token(req) -> dict:
    """Verify Google ID token and return payload, or raise."""
    auth_header = req.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise ValueError("Missing Authorization header")
    token = auth_header.split(" ", 1)[1]
    payload = id_token.verify_oauth2_token(
        token, grequests.Request(), GOOGLE_CLIENT_ID
    )
    return payload


# ── Drive helper ──────────────────────────────────────────────
def get_drive_service_with_user_token(access_token: str):
    """Build a Drive service using the user's OAuth access token."""
    from google.oauth2.credentials import Credentials
    creds = Credentials(token=access_token)
    return build("drive", "v3", credentials=creds, cache_discovery=False)


def ensure_folder(service, folder_name: str, parent_id: str | None = None) -> str:
    """Return folder ID, creating it if it does not exist."""
    query_parts = [
        f"name = '{folder_name}'",
        "mimeType = 'application/vnd.google-apps.folder'",
        "trashed = false",
    ]
    if parent_id:
        query_parts.append(f"'{parent_id}' in parents")

    results = service.files().list(
        q=" and ".join(query_parts),
        fields="files(id, name)",
        spaces="drive",
    ).execute()

    folders = results.get("files", [])
    if folders:
        return folders[0]["id"]

    meta = {
        "name": folder_name,
        "mimeType": "application/vnd.google-apps.folder",
    }
    if parent_id:
        meta["parents"] = [parent_id]

    folder = service.files().create(body=meta, fields="id").execute()
    return folder["id"]


def upload_to_drive(
    service, file_bytes: bytes, filename: str, mime_type: str,
    folder_id: str, shareable: bool = False
) -> dict:
    """Upload bytes to Drive and return {id, webViewLink}."""
    media = MediaIoBaseUpload(io.BytesIO(file_bytes), mimetype=mime_type, resumable=False)
    meta = {"name": filename, "parents": [folder_id]}

    uploaded = service.files().create(
        body=meta, media_body=media, fields="id,webViewLink,name"
    ).execute()

    if shareable:
        service.permissions().create(
            fileId=uploaded["id"],
            body={"role": "reader", "type": "anyone"},
        ).execute()

    return uploaded


# ── Routes ────────────────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()})


@app.route("/convert", methods=["POST"])
def convert():
    # 1. Auth
    try:
        payload = verify_token(request)
        user_id = payload["sub"]
        user_email = payload.get("email", "unknown")
    except Exception as e:
        logger.warning("Auth failed: %s", e)
        return jsonify({"error": "Unauthorized"}), 401

    # 2. Parse request
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    uploaded_file = request.files["file"]
    output_format = request.form.get("output_format", "pdf").lower()
    folder_name   = request.form.get("folder_name", "Conversions")
    folder_id_hint= request.form.get("folder_id", "")
    shareable     = request.form.get("shareable", "false").lower() == "true"

    if output_format not in MIME_MAP:
        return jsonify({"error": f"Unsupported output format: {output_format}"}), 400

    filename = uploaded_file.filename or "file"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "txt"

    if ext not in CONVERTER_MAP:
        return jsonify({"error": f"Unsupported input type: .{ext}"}), 400

    # 3. Read input
    try:
        content = uploaded_file.read()
    except Exception as e:
        return jsonify({"error": f"Failed to read file: {e}"}), 500

    # 4. Convert
    try:
        converter = CONVERTER_MAP[ext]
        output_bytes = converter(content, output_format)
    except Exception as e:
        logger.exception("Conversion error for %s -> %s", filename, output_format)
        return jsonify({"error": f"Conversion failed: {e}"}), 500

    # 5. Upload to Drive (using user's access token passed in separate header)
    access_token = request.headers.get("X-Drive-Token", "")
    output_name  = filename.rsplit(".", 1)[0] + "." + output_format
    drive_result = {}

    if access_token:
        try:
            drive_svc = get_drive_service_with_user_token(access_token)
            folder_id = ensure_folder(drive_svc, folder_name)
            uploaded  = upload_to_drive(
                drive_svc, output_bytes, output_name,
                MIME_MAP[output_format], folder_id, shareable
            )
            drive_result = {
                "driveFileId":   uploaded.get("id"),
                "driveViewLink": uploaded.get("webViewLink"),
                "outputName":    output_name,
            }
        except Exception as e:
            logger.error("Drive upload failed for user %s: %s", user_email, e)
            drive_result = {"driveError": str(e), "outputName": output_name}
    else:
        drive_result = {"outputName": output_name}

    return jsonify({"status": "success", **drive_result})


@app.route("/history", methods=["GET"])
def get_history():
    try:
        payload = verify_token(request)
        user_id = payload["sub"]
    except Exception:
        return jsonify({"error": "Unauthorized"}), 401

    try:
        runs_ref = (
            db.collection("users").document(user_id)
            .collection("conversion_runs")
            .order_by("timestamp", direction=firestore.Query.DESCENDING)
            .limit(100)
        )
        docs = runs_ref.stream()
        runs = [doc.to_dict() for doc in docs]
        return jsonify({"runs": runs})
    except Exception as e:
        logger.error("History fetch error: %s", e)
        return jsonify({"error": str(e)}), 500


@app.route("/history", methods=["POST"])
def save_history():
    try:
        payload = verify_token(request)
        user_id = payload["sub"]
    except Exception:
        return jsonify({"error": "Unauthorized"}), 401

    try:
        data = request.get_json(force=True)
        if not data:
            return jsonify({"error": "No data"}), 400

        run_id = str(uuid.uuid4())
        doc_ref = (
            db.collection("users").document(user_id)
            .collection("conversion_runs").document(run_id)
        )
        doc_ref.set({
            "runId":        run_id,
            "timestamp":    data.get("timestamp", datetime.now(timezone.utc).isoformat()),
            "outputFormat": data.get("outputFormat", ""),
            "folderName":   data.get("folderName", ""),
            "files":        data.get("files", []),
        })
        return jsonify({"status": "saved", "runId": run_id})
    except Exception as e:
        logger.error("History save error: %s", e)
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port, debug=False)
