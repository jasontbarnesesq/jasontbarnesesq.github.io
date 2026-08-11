import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export type JobStatus = "awaiting_upload" | "processing" | "done" | "error";

export interface Job {
  status: JobStatus;
  uid: string;
  downloadUrl?: string;
  width?: number;
  height?: number;
  error?: string;
  settings: {
    cropMode: "cover" | "pad";
    denoise: number;
    model: string;
  };
}

export function useJob(jobId: string | null): Job | null {
  const [job, setJob] = useState<Job | null>(null);

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      return;
    }
    const unsubscribe = onSnapshot(doc(db, "jobs", jobId), (snap) => {
      setJob(snap.exists() ? (snap.data() as Job) : null);
    });
    return unsubscribe;
  }, [jobId]);

  return job;
}
