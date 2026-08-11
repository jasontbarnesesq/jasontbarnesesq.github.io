#!/usr/bin/env bash
# Build and deploy the frontend to Firebase Hosting.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f frontend/.env ]; then
  echo "frontend/.env not found. Copy frontend/.env.example and fill in your Firebase web config." >&2
  exit 1
fi

(cd frontend && npm install && npm run build)
firebase deploy --only hosting
