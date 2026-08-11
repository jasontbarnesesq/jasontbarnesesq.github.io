import { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut, User } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { auth, googleProvider, functions } from "./firebase";
import UploadDropzone from "./components/UploadDropzone";
import SettingsPanel, { Settings } from "./components/SettingsPanel";
import JobStatus from "./components/JobStatus";
import CompareSlider from "./components/CompareSlider";
import { useJob } from "./hooks/useJob";

interface GenerateUploadUrlResponse {
  jobId: string;
  uploadUrl: string;
}

const DEFAULT_SETTINGS: Settings = {
  cropMode: "cover",
  denoise: 0.1,
  model: "x4plus",
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const job = useJob(jobId);

  useEffect(() => onAuthStateChanged(auth, (u) => {
    setUser(u);
    setAuthReady(true);
  }), []);

  const handleFileSelected = async (file: File) => {
    setSubmitError(null);
    setJobId(null);
    setPreviewUrl(URL.createObjectURL(file));
    setSubmitting(true);
    try {
      const generateUploadUrl = httpsCallable<
        { contentType: string; settings: Settings },
        GenerateUploadUrlResponse
      >(functions, "generateUploadUrl");

      const { data } = await generateUploadUrl({ contentType: file.type, settings });

      const putResponse = await fetch(data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!putResponse.ok) {
        throw new Error(`Upload failed (${putResponse.status})`);
      }

      setJobId(data.jobId);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!authReady) {
    return <div className="center">Loading…</div>;
  }

  if (!user) {
    return (
      <div className="center">
        <h1>5K2K Wallpaper Pipeline</h1>
        <p>Sign in to upload and process an image to 5120×2160.</p>
        <button onClick={() => signInWithPopup(auth, googleProvider)}>Sign in with Google</button>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app__header">
        <h1>5K2K Wallpaper Pipeline</h1>
        <div>
          <span>{user.displayName}</span>
          <button onClick={() => signOut(auth)}>Sign out</button>
        </div>
      </header>

      <main className="app__main">
        <SettingsPanel settings={settings} disabled={submitting || job?.status === "processing"} onChange={setSettings} />

        <UploadDropzone disabled={submitting || job?.status === "processing"} onFileSelected={handleFileSelected} />

        {submitError && <p className="error">{submitError}</p>}

        {job && <JobStatus job={job} />}

        {job?.status === "done" && job.downloadUrl && previewUrl && (
          <>
            <CompareSlider beforeSrc={previewUrl} afterSrc={job.downloadUrl} />
            <a className="download" href={job.downloadUrl} download>
              Download {job.width}×{job.height} PNG
            </a>
          </>
        )}
      </main>
    </div>
  );
}
