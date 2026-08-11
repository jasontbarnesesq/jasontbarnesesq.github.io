import { Job } from "../hooks/useJob";

const STEPS: { key: Job["status"]; label: string }[] = [
  { key: "awaiting_upload", label: "Uploading" },
  { key: "processing", label: "Upscaling & fitting" },
  { key: "done", label: "Done" },
];

export default function JobStatus({ job }: { job: Job }) {
  if (job.status === "error") {
    return <div className="job-status job-status--error">Processing failed: {job.error}</div>;
  }

  const activeIndex = STEPS.findIndex((s) => s.key === job.status);

  return (
    <ol className="job-status">
      {STEPS.map((step, i) => (
        <li key={step.key} className={i <= activeIndex ? "job-status__step--active" : ""}>
          {step.label}
        </li>
      ))}
    </ol>
  );
}
