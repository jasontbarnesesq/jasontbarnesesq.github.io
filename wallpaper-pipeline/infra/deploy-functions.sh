#!/usr/bin/env bash
# Deploy the Cloud Functions (v2) orchestrator. Requires functions/.env to be
# populated (see functions/.env.example) and firebase-tools installed & logged in.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f functions/.env ]; then
  echo "functions/.env not found. Copy functions/.env.example and fill in PROCESSOR_URL." >&2
  exit 1
fi

(cd functions && npm install && npm run build)
firebase deploy --only functions,firestore:rules
