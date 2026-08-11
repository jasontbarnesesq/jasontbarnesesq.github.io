#!/usr/bin/env bash
# Build and deploy the Cloud Run image-processing service.
# Requires: setup.sh already run. GPU quota (nvidia-l4) approved in REGION.
set -euo pipefail

: "${PROJECT_ID:?Set PROJECT_ID}"
: "${REGION:=us-central1}"
: "${SERVICE_NAME:=wallpaper-processor}"
: "${USE_GPU:=true}"

IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/wallpaper-pipeline/${SERVICE_NAME}"

echo "== Ensuring Artifact Registry repo exists =="
gcloud artifacts repositories describe wallpaper-pipeline --location="${REGION}" >/dev/null 2>&1 || \
  gcloud artifacts repositories create wallpaper-pipeline \
    --repository-format=docker --location="${REGION}"

echo "== Building image via Cloud Build =="
gcloud builds submit "$(dirname "$0")/../services/processor" --tag "${IMAGE}"

GPU_FLAGS=()
if [ "${USE_GPU}" = "true" ]; then
  GPU_FLAGS=(--gpu=1 --gpu-type=nvidia-l4 --no-cpu-throttling)
fi

echo "== Deploying to Cloud Run =="
gcloud run deploy "${SERVICE_NAME}" \
  --image="${IMAGE}" \
  --region="${REGION}" \
  --memory=16Gi \
  --cpu=4 \
  --concurrency=1 \
  --min-instances=0 \
  --max-instances=3 \
  --timeout=540 \
  --no-allow-unauthenticated \
  "${GPU_FLAGS[@]}"

echo "== Granting the Functions service account run.invoker =="
FUNCTIONS_SA="${PROJECT_ID}@appspot.gserviceaccount.com"
gcloud run services add-iam-policy-binding "${SERVICE_NAME}" \
  --region="${REGION}" \
  --member="serviceAccount:${FUNCTIONS_SA}" \
  --role="roles/run.invoker"

SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" --region="${REGION}" --format='value(status.url)')
echo ""
echo "Processor deployed: ${SERVICE_URL}"
echo "Set PROCESSOR_URL=${SERVICE_URL} in functions/.env"
