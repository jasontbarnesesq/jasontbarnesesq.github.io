import { onCall, HttpsError } from "firebase-functions/v2/https";
import { v4 as uuidv4 } from "uuid";
import { getFirestore, getStorage } from "./admin";
import {
  RAW_BUCKET,
  UPLOAD_URL_TTL_MS,
  ALLOWED_CONTENT_TYPES,
} from "./config";

interface RequestData {
  contentType: string;
  settings: {
    cropMode: "cover" | "pad";
    denoise: number;
    model: "x4plus" | "x4plus_anime";
  };
}

function validate(data: RequestData) {
  if (!ALLOWED_CONTENT_TYPES.has(data.contentType)) {
    throw new HttpsError("invalid-argument", `Unsupported content type: ${data.contentType}`);
  }
  if (!["cover", "pad"].includes(data.settings?.cropMode)) {
    throw new HttpsError("invalid-argument", "Invalid cropMode");
  }
  if (typeof data.settings?.denoise !== "number" || data.settings.denoise < 0 || data.settings.denoise > 1) {
    throw new HttpsError("invalid-argument", "denoise must be between 0 and 1");
  }
  if (!["x4plus", "x4plus_anime"].includes(data.settings?.model)) {
    throw new HttpsError("invalid-argument", "Invalid model");
  }
}

export const generateUploadUrl = onCall<RequestData>(
  { region: "us-central1", cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required");
    }
    validate(request.data);

    const uid = request.auth.uid;
    const jobId = uuidv4();
    const objectPath = `${uid}/${jobId}/source`;

    const bucket = getStorage().bucket(RAW_BUCKET);
    const file = bucket.file(objectPath);

    const [uploadUrl] = await file.getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + UPLOAD_URL_TTL_MS,
      contentType: request.data.contentType,
    });

    await getFirestore().collection("jobs").doc(jobId).set({
      uid,
      status: "awaiting_upload",
      settings: request.data.settings,
      createdAt: new Date(),
    });

    return { jobId, uploadUrl, objectPath };
  }
);
