# File Converter — Setup Guide

## Architecture

```
Browser (GitHub Pages)
  └─ Google OAuth 2.0 (Identity Services)
  └─ Google Drive API (via user OAuth token)
  └─ HTTP → Cloud Run backend
       └─ Firestore  (conversion history per user)
       └─ Google Drive API (upload output files)
       └─ Conversion engines (ReportLab, python-docx, openpyxl)
```

---

## 1. Google Cloud Project

```bash
gcloud projects create YOUR_PROJECT_ID
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  firestore.googleapis.com \
  drive.googleapis.com \
  cloudbuild.googleapis.com \
  containerregistry.googleapis.com
```

---

## 2. OAuth Client ID

1. Visit **APIs & Services → Credentials → Create Credentials → OAuth client ID**
2. Application type: **Web application**
3. Authorized JavaScript origins:
   - `https://jasontbarnesesq.github.io`
   - `http://localhost:8080` (dev)
4. Authorized redirect URIs: same as origins (no redirect needed for implicit flow)
5. Copy the **Client ID** — you'll need it in two places

---

## 3. Firestore

```bash
gcloud firestore databases create --region=us-central1
```

Data model:
```
users/{userId}/conversion_runs/{runId}
  runId        string
  timestamp    ISO-8601 string
  outputFormat string (pdf|docx|txt|xlsx)
  folderName   string
  files[]
    name       string
    ext        string
    size       int
    status     success|error
    driveFileId  string|null
    driveViewLink string|null
    error      string|null
```

---

## 4. Deploy Backend to Cloud Run

```bash
cd file-converter/backend

# Option A — manual deploy
gcloud builds submit --config cloudbuild.yaml \
  --substitutions _GOOGLE_CLIENT_ID=YOUR_CLIENT_ID

# Option B — direct deploy (no build trigger)
gcloud run deploy file-converter \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --set-env-vars GOOGLE_CLIENT_ID=YOUR_CLIENT_ID,GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID
```

Note the **Service URL** output — e.g. `https://file-converter-abc123-uc.a.run.app`

---

## 5. Configure Frontend

Edit `file-converter/app.js` lines 11-13:

```js
const CONFIG = {
  GOOGLE_CLIENT_ID: 'YOUR_CLIENT_ID.apps.googleusercontent.com',
  BACKEND_URL: 'https://file-converter-abc123-uc.a.run.app',
  ...
};
```

Also update `index.html` line ~21:
```html
data-client_id="YOUR_CLIENT_ID.apps.googleusercontent.com"
```

---

## 6. Drive Token Forwarding

The frontend sends the user's Drive OAuth access token as `X-Drive-Token` header.
Add this to `app.js` `convertFile()`:

```js
headers: {
  'Authorization': `Bearer ${state.idToken}`,
  'X-Drive-Token': state.accessToken || '',
},
```

This is already wired up — just ensure `loadGapiAndRequestToken()` succeeds.

---

## 7. CORS

Cloud Run is pre-configured with `flask-cors` to allow `*` origins.
For production, restrict to your GitHub Pages domain in `main.py`:

```python
CORS(app, resources={r"/*": {"origins": "https://jasontbarnesesq.github.io"}})
```

---

## 8. Local Development

```bash
cd file-converter/backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env   # fill in values
export $(cat .env | xargs)

python main.py
# Server at http://localhost:8080
```

For the frontend, serve locally:
```bash
cd file-converter
python -m http.server 3000
# Visit http://localhost:3000
```

---

## Supported Conversions Matrix

| Input | PDF | DOC | TXT | XLS |
|-------|-----|-----|-----|-----|
| .md   | ✅  | ✅  | ✅  | ✅  |
| .json | ✅  | ✅  | ✅  | ✅  |
| .bas  | ✅  | ✅  | ✅  | ✅  |
| .txt  | ✅  | ✅  | ✅  | ✅  |

- **MD→PDF/DOC**: Renders headings, paragraphs, code blocks, tables
- **MD→XLS**: Extracts Markdown tables; falls back to line-per-row
- **JSON→XLS**: Array-of-objects → spreadsheet rows; object → key/value table
- **JSON→PDF**: Summary table (first 50 rows) + full pretty-printed JSON
- **BAS→PDF/DOC**: Syntax-highlighted BASIC source (keywords, strings, comments)
- **BAS→XLS**: Line-by-line with keyword/string/comment analysis columns
