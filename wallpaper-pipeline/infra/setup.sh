#!/usr/bin/env bash
# One-time GCP/Firebase project setup for the 5K2K wallpaper pipeline.
# Run this once per project, before deploy-processor.sh / deploy-functions.sh.
set -euo pipefail

: "${PROJECT_ID:?Set PROJECT_ID, e.g. export PROJECT_ID=my-project}"
: "${REGION:=us-central1}"
: "${RAW_BUCKET:=workspace-uploads-raw-${PROJECT_ID}}"
: "${PROCESSED_BUCKET:=workspace-wallpapers-processed-${PROJECT_ID}}"

echo "== Setting project =="
gcloud config set project "${PROJECT_ID}"

echo "== Enabling APIs =="
gcloud services enable \
  run.googleapis.com \
  cloudfunctions.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  firestore.googleapis.com \
  storage.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  identitytoolkit.googleapis.com

echo "== Creating buckets (private, uniform bucket-level access) =="
for BUCKET in "${RAW_BUCKET}" "${PROCESSED_BUCKET}"; do
  if ! gsutil ls -b "gs://${BUCKET}" >/dev/null 2>&1; then
    gsutil mb -l "${REGION}" -b on "gs://${BUCKET}"
  fi
  gsutil pap set enforced "gs://${BUCKET}"
done

echo "== Applying lifecycle rules =="
gsutil lifecycle set "$(dirname "$0")/lifecycle-raw.json" "gs://${RAW_BUCKET}"
gsutil lifecycle set "$(dirname "$0")/lifecycle-processed.json" "gs://${PROCESSED_BUCKET}"

echo "== Initializing Firestore (Native mode) =="
gcloud firestore databases create --location="${REGION}" --type=firestore-native 2>/dev/null || \
  echo "Firestore database already exists, skipping."

echo "== Granting the App Engine/Functions default service account signBlob rights =="
FUNCTIONS_SA="${PROJECT_ID}@appspot.gserviceaccount.com"
gcloud iam service-accounts add-iam-policy-binding "${FUNCTIONS_SA}" \
  --member="serviceAccount:${FUNCTIONS_SA}" \
  --role="roles/iam.serviceAccountTokenCreator"

gsutil iam ch "serviceAccount:${FUNCTIONS_SA}:roles/storage.objectAdmin" "gs://${RAW_BUCKET}"
gsutil iam ch "serviceAccount:${FUNCTIONS_SA}:roles/storage.objectAdmin" "gs://${PROCESSED_BUCKET}"

cat <<EOF

Done. Next steps:
  1. RAW_BUCKET=${RAW_BUCKET} PROCESSED_BUCKET=${PROCESSED_BUCKET} ./infra/deploy-processor.sh
  2. Fill in functions/.env with the printed processor URL, then ./infra/deploy-functions.sh
  3. Fill in frontend/.env, then ./infra/deploy-frontend.sh
EOF
