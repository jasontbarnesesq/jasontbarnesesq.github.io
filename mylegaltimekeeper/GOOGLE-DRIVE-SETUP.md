# Google Drive API Setup Guide

Follow these steps to enable automatic CSV uploads to Google Drive.

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** dropdown at the top
3. Click **"New Project"**
4. Name it: `Time Tracker App`
5. Click **"Create"**
6. Wait for the project to be created (notification appears in top-right)

## Step 2: Enable Google Drive API

1. Make sure your new project is selected
2. In the left sidebar, go to **"APIs & Services"** → **"Library"**
3. Search for: `Google Drive API`
4. Click on **"Google Drive API"**
5. Click **"Enable"**
6. Wait for it to enable

## Step 3: Configure OAuth Consent Screen

1. Go to **"APIs & Services"** → **"OAuth consent screen"**
2. Choose **"External"** (unless you have a Google Workspace)
3. Click **"Create"**
4. Fill in required fields:
   - **App name**: `Time Tracker`
   - **User support email**: Your email
   - **Developer contact**: Your email
5. Click **"Save and Continue"**
6. On "Scopes" page, click **"Save and Continue"** (skip adding scopes manually)
7. On "Test users" page, click **"Add Users"**
8. Add your Gmail address
9. Click **"Save and Continue"**
10. Review and click **"Back to Dashboard"**

## Step 4: Create OAuth Client ID

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"+ Create Credentials"** at the top
3. Select **"OAuth client ID"**
4. Application type: **"Web application"**
5. Name: `Time Tracker Web Client`
6. Under **"Authorized JavaScript origins"**, click **"+ Add URI"**
   - Add: `https://jasontbarnesesq.github.io`
7. Under **"Authorized redirect URIs"**, click **"+ Add URI"**
   - Add: `https://jasontbarnesesq.github.io/mylegaltimekeeper`
8. Click **"Create"**
9. A popup appears with your credentials:
   - **Copy the Client ID** (looks like: `123456789-abc123.apps.googleusercontent.com`)
   - Click **"OK"**

## Step 5: Create API Key

1. Still in **"Credentials"**, click **"+ Create Credentials"**
2. Select **"API key"**
3. A popup shows your API key
4. **Copy the API Key** (looks like: `AIzaSyA1B2C3D4E5F6G7H8I9J0K`)
5. Click **"Close"**
6. (Optional) Click the pencil icon next to your API key to restrict it:
   - Under "API restrictions", select "Restrict key"
   - Choose "Google Drive API"
   - Click "Save"

## Step 6: Update Your index.html File

1. Open your `index.html` file in a text editor
2. Find these lines near the top of the `<script>` section (around line 8-9):

```javascript
const GOOGLE_CLIENT_ID = 'YOUR_CLIENT_ID_HERE';
const GOOGLE_API_KEY = 'YOUR_API_KEY_HERE';
```

3. Replace with your actual credentials:

```javascript
const GOOGLE_CLIENT_ID = '123456789-abc123.apps.googleusercontent.com';
const GOOGLE_API_KEY = 'AIzaSyA1B2C3D4E5F6G7H8I9J0K';
```

4. Save the file

## Step 7: Upload to GitHub

1. Go to your GitHub repository: `professional_hub`
2. Switch to branch: `work/timekeeper-app`
3. Upload or commit the updated `index.html` file
4. Wait 1-2 minutes for GitHub Pages to rebuild

## Step 8: Enable Google Drive in Your App

1. Open your app: `https://YOUR-USERNAME.github.io/professional_hub/`
2. Click the **⚙️ Settings** icon
3. Find **"Google Drive Integration"**
4. Toggle it **ON**
5. A Google sign-in popup appears
6. Choose your Google account
7. Click **"Allow"** to grant permissions
8. You should see: **"Connected"** with a green badge

## Step 9: Test It Out

1. Add a time entry in your app
2. Click **"Export CSV"**
3. You should get a message: **"CSV saved to Google Drive and downloaded locally!"**
4. Check your Google Drive - the file should be there!

**Your app URL**: `https://jasontbarnesesq.github.io/mylegaltimekeeper/`

---

## Troubleshooting

### "Error: redirect_uri_mismatch"
- Your GitHub Pages URL in OAuth settings doesn't match your actual URL
- Double-check both JavaScript origins and redirect URIs
- Make sure there are no trailing slashes

### "Error: origin_mismatch"
- The authorized JavaScript origin is incorrect
- Should be: `https://YOUR-USERNAME.github.io` (no path, no trailing slash)

### "Failed to connect to Google Drive"
- Check browser console for specific error
- Verify API key is correct in index.html
- Verify Client ID is correct in index.html
- Make sure Google Drive API is enabled in Cloud Console

### "Not signed in to Google Drive"
- Click Settings → Google Drive Integration → Toggle ON
- Complete the sign-in flow

### Files not appearing in Drive
- Check that the toggle is ON (green "Connected" badge)
- Check browser console for upload errors
- Verify you're signed in with the correct Google account

---

## Security Notes

- **Never commit your API credentials to a public repository** if you're concerned about quota limits
- The API key can be restricted to only work from your GitHub Pages domain
- The OAuth Client ID only allows your specified redirect URIs
- Your data is only accessible to accounts you explicitly sign in with

---

## Where Do Files Go in Google Drive?

- Files are saved to the **root of your Google Drive**
- Filename format: `time-entries-YYYY-MM-DD.csv`
- You can create a folder and move them there manually
- Or use Google Drive's search to find them: search for "time-entries"

---

## Alternative: Simpler Option Without API Setup

If this setup seems too complex, you can:
1. Just use the local CSV download (works without any setup)
2. Manually upload the downloaded CSV to Google Drive
3. Or use Google Drive's desktop sync to auto-sync your Downloads folder

The Google Drive integration is optional - the app works perfectly fine without it!

---

**Need help?** Check the [Google Cloud Console documentation](https://cloud.google.com/docs) or open an issue in your GitHub repository.
