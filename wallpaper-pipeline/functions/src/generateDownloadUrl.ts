import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, getStorage } from "./admin";
import { PROCESSED_BUCKET, DOWNLOAD_URL_TTL_MS } from "./config";

interface RequestData {
  jobId: string;
}

export const generateDownloadUrl = onCall<RequestData>(
  { region: "us-central1", cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required");
    }

    const jobRef = getFirestore().collection("jobs").doc(request.data.jobId);
    const snap = await jobRef.get();
    if (!snap.exists) {
      throw new HttpsError("not-found", "Job not found");
    }

    const job = snap.data()!;
    if (job.uid !== request.auth.uid) {
      throw new HttpsError("permission-denied", "Not your job");
    }
    if (job.status !== "done") {
      throw new HttpsError("failed-precondition", `Job is not done (status: ${job.status})`);
    }

    const objectPath = `${job.uid}/${request.data.jobId}/output.png`;
    const [downloadUrl] = await getStorage()
      .bucket(PROCESSED_BUCKET)
      .file(objectPath)
      .getSignedUrl({
        version: "v4",
        action: "read",
        expires: Date.now() + DOWNLOAD_URL_TTL_MS,
      });

    await jobRef.update({ downloadUrl });

    return { downloadUrl };
  }
);
