# 5K2K Wallpaper Pipeline

A 100%-Google-native pipeline that turns a source image into a pixel-exact
5120×2160 (64:27 / 21:9) wallpaper: AI super-resolution (Real-ESRGAN) for
texture synthesis, then an exact geometric crop/pad + Lanczos pass for the
final canvas.

This app is self-contained under `wallpaper-pipeline/` and deploys to
Firebase Hosting + Cloud Functions + Cloud Run — it is unrelated to, and does
not modify, the rest of this repo (which is the static jasontbarnes.com site).

## Architecture

```
 Browser (React/Vite)
   │  1. sign in (Firebase Auth / Google)
   │  2. call generateUploadUrl()  ──────────────► Cloud Function (Node, v2)
   │                                                  - creates jobs/{id} in Firestore
   │  ◄────────────────────────────────────────────  - returns V4 signed PUT URL
   │  3. PUT file directly to GCS
   ▼
 gs://<raw bucket>/{uid}/{jobId}/source
   │  4. GCS finalize event
   ▼
 Cloud Function: onRawUpload (Node, v2)
   │  - marks job "processing"
   │  - mints a signed GET url (source) + signed PUT url (destination)
   │  - calls Cloud Run processor with an OIDC ID token (private service)
   ▼
 Cloud Run: processor (Python/FastAPI, GPU)
   │  - downloads via signed GET, no GCS IAM needed
   │  - crop/pad to 64:27 → optional denoise → Real-ESRGAN upscale
   │    (only if source < target) → final Lanczos resize to 5120×2160
   │  - uploads via signed PUT
   ▼
 gs://<processed bucket>/{uid}/{jobId}/output.png
   │  5. onRawUpload reads the response, signs a 24h download URL,
   │     writes jobs/{id} = {status: done, downloadUrl, width, height}
   ▼
 Browser: Firestore onSnapshot fires → compare slider + download link
```

## Deviations from the original spec (and why)

The brief proposed two separate services — a Vertex AI/Cloud Run
super-resolution stage and a second Cloud Run OpenCV fitting stage — plus a
choice between Vertex AI Model Garden and a custom container. For a v1.0
build these were simplified:

- **One Cloud Run service, not two.** Upscaling and canvas-fitting are both
  just steps in one Python process (`services/processor`). Splitting them
  into separate services would add a network hop, double the cold-start
  cost, and require passing large images between services for no benefit —
  neither step is independently scaled or reused elsewhere.
- **Cloud Run (custom container), not Vertex AI Model Garden, for v1.** A
  Vertex AI Endpoint bills for provisioned capacity even when idle. Cloud
  Run scales to zero, which matches a low/bursty-traffic wallpaper tool.
  Model Garden is a reasonable v2 upgrade if throughput/concurrency needs
  grow; the processor's HTTP interface makes swapping the implementation
  behind it non-disruptive.
- **Cloud Functions never touch pixels.** The Node function only mints
  signed URLs and calls the processor with an ID token — it never downloads
  the image itself. This avoids the Cloud Functions memory/payload limits
  the direct-to-GCS upload was already designed to route around, and keeps
  the function's own IAM footprint small.
- **The processor holds zero GCS IAM.** It receives short-lived V4 signed
  URLs for the one object it needs to read and the one it needs to write,
  and talks to GCS over plain HTTPS (`httpx`), not the GCS SDK. Least
  privilege: compromising the container doesn't expose bucket-wide access.
- **Firestore, not Realtime Database**, for job state — Firestore is the
  current recommended default for new Firebase projects and its
  `onSnapshot` listener is what the frontend uses for live job status.
- **Firebase Auth (Google sign-in) is required**, not optional. GPU Cloud
  Run instances aren't free; gating uploads behind auth is the minimum
  viable abuse control for v1. (Adding a per-user rate limit in Firestore is
  a natural next step — not implemented here.)
- **Aspect-correct fit, not a stretch-resize.** The reference snippet in the
  brief calls `cv2.resize(img, (5120, 2160))` directly, which stretches any
  image that isn't already 64:27. This implementation center-crops
  (`cover`) or letterboxes (`pad`) to the exact target aspect ratio first,
  *then* upscales/resizes — so faces and horizons don't warp.
- **AI upscaling is skipped when the source is already large enough.** If
  the cropped/padded source already meets or exceeds 5120×2160, the
  pipeline goes straight to the final Lanczos resize instead of paying for
  a GPU pass that wouldn't add information.
- **GCS lifecycle rules** on both buckets (raw uploads expire in 2 days,
  processed assets in 30) so storage cost doesn't grow unbounded — not in
  the original brief but necessary for an unattended v1.

## Directory layout

```
wallpaper-pipeline/
├── frontend/            Vite + React + TS — Firebase Hosting
├── functions/           Firebase Cloud Functions v2 (Node/TS) — orchestrator
├── services/processor/  FastAPI + Real-ESRGAN + OpenCV/Pillow — Cloud Run (GPU)
├── infra/               gcloud/firebase deploy scripts + GCS lifecycle policies
├── firebase.json, firestore.rules, firestore.indexes.json
└── .firebaserc.example
```

## Prerequisites

- A GCP project with billing enabled, linked to Firebase
  (`firebase projects:addfirebase`).
- `gcloud`, `firebase-tools`, `docker`/Cloud Build access, Node 20, Python
  3.11 for local dev.
- GPU quota for `nvidia-l4` in your chosen region if deploying with a GPU
  (`USE_GPU=true`, the default). Without approved quota, deploy with
  `USE_GPU=false` — the processor falls back to CPU + tiled inference
  automatically (`torch.cuda.is_available()` gates `half`/`tile` in
  `services/processor/pipeline/upscale.py`), just much slower.
- Enable Google as a sign-in provider in Firebase Auth.

## Deploy order

```bash
cp .firebaserc.example .firebaserc         # set your project id
cp functions/.env.example functions/.env
cp frontend/.env.example frontend/.env

export PROJECT_ID=your-gcp-project-id
export REGION=us-central1                  # must have nvidia-l4 quota if USE_GPU=true

./infra/setup.sh                           # enable APIs, create buckets, IAM, Firestore
./infra/deploy-processor.sh                # build+deploy Cloud Run, prints its URL

# put the printed processor URL into functions/.env as PROCESSOR_URL
./infra/deploy-functions.sh

# put your Firebase web app config into frontend/.env
./infra/deploy-frontend.sh
```

## Local development

- Frontend: `cd frontend && npm install && npm run dev` (point `.env` at a
  real or emulated Firebase project).
- Functions: `cd functions && npm install && npm run serve` (Firebase
  emulators for functions/firestore/auth).
- Processor: `docker build -t processor services/processor && docker run -p
  8080:8080 processor` (CPU-only unless you pass `--gpus all` and use a
  CUDA-enabled Docker host), then:
  ```bash
  curl -X POST localhost:8080/process -H 'content-type: application/json' -d '{
    "job_id": "test",
    "input_signed_url": "https://.../source.jpg",
    "output_signed_url": "https://.../output.png",
    "crop_mode": "cover", "denoise": 0.1, "model": "x4plus"
  }'
  ```

## Cost notes

- Cloud Run is configured `min-instances=0`, `concurrency=1` (a GPU/large
  PyTorch process shouldn't share a container instance across requests).
  Idle cost is $0; you only pay per invocation.
- `--no-cpu-throttling` is set for GPU deploys so background CUDA work
  isn't throttled between requests, at a slightly higher per-request cost.
- GCS lifecycle rules bound storage growth (see above).
- The dominant cost driver is GPU inference time. `x4plus` at large source
  images is the slow path; the "skip AI upscale when already large enough"
  optimization above is what keeps typical costs down.
