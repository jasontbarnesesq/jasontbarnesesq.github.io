import { onObjectFinalized } from "firebase-functions/v2/storage";
import { logger } from "firebase-functions/v2";
import { GoogleAuth } from "google-auth-library";
import { getFirestore, getStorage } from "./admin";
import {
  RAW_BUCKET,
  PROCESSED_BUCKET,
  PROCESSOR_URL,
  RAW_READ_URL_TTL_MS,
  DOWNLOAD_URL_TTL_MS,
  TARGET_WIDTH,
  TARGET_HEIGHT,
  MAX_UPLOAD_BYTES,
} from "./config";

const auth = new GoogleAuth();

interface ProcessorResponse {
  width: number;
  height: number;
  bytes: number;
}

export const onRawUpload = onObjectFinalized(
  { bucket: RAW_BUCKET, region: "us-central1", timeoutSeconds: 540, memory: "512MiB" },
  async (event) => {
    const filePath = event.data.name; // "{uid}/{jobId}/source"
    const parts = filePath.split("/");
    if (parts.length !== 3 || parts[2] !== "source") {
      logger.warn("Ignoring unexpected object path", filePath);
      return;
    }
    const [uid, jobId] = parts;

    const jobRef = getFirestore().collection("jobs").doc(jobId);
    const snap = await jobRef.get();
    if (!snap.exists) {
      logger.warn("No job document for upload", jobId);
      return;
    }
    const job = snap.data()!;
    if (job.uid !== uid) {
      logger.error("uid mismatch on job", jobId);
      return;
    }
    if (job.status !== "awaiting_upload") {
      logger.info("Job already processed/processing, skipping", jobId, job.status);
      return;
    }

    const size = Number(event.data.size || 0);
    if (size > MAX_UPLOAD_BYTES) {
      await jobRef.update({ status: "error", error: "File too large" });
      return;
    }

    await jobRef.update({ status: "processing", processingStartedAt: new Date() });

    try {
      if (!PROCESSOR_URL) {
        throw new Error("PROCESSOR_URL is not configured");
      }

      const rawFile = getStorage().bucket(RAW_BUCKET).file(filePath);
      const [inputSignedUrl] = await rawFile.getSignedUrl({
        version: "v4",
        action: "read",
        expires: Date.now() + RAW_READ_URL_TTL_MS,
      });

      const outputObjectPath = `${uid}/${jobId}/output.png`;
      const outFile = getStorage().bucket(PROCESSED_BUCKET).file(outputObjectPath);
      const [outputSignedUrl] = await outFile.getSignedUrl({
        version: "v4",
        action: "write",
        expires: Date.now() + RAW_READ_URL_TTL_MS,
      });

      const idTokenClient = await auth.getIdTokenClient(PROCESSOR_URL);
      const response = await idTokenClient.request<ProcessorResponse>({
        url: `${PROCESSOR_URL}/process`,
        method: "POST",
        data: {
          job_id: jobId,
          input_signed_url: inputSignedUrl,
          output_signed_url: outputSignedUrl,
          target_width: TARGET_WIDTH,
          target_height: TARGET_HEIGHT,
          crop_mode: job.settings.cropMode,
          denoise: job.settings.denoise,
          model: job.settings.model,
        },
        timeout: 530_000,
      });

      const [downloadUrl] = await outFile.getSignedUrl({
        version: "v4",
        action: "read",
        expires: Date.now() + DOWNLOAD_URL_TTL_MS,
      });

      await jobRef.update({
        status: "done",
        downloadUrl,
        width: response.data.width,
        height: response.data.height,
        completedAt: new Date(),
      });
    } catch (err) {
      logger.error("Processing failed", jobId, err);
      await jobRef.update({
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
);
