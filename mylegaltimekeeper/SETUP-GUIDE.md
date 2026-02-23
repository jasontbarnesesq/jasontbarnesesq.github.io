# GitHub Pages Setup Instructions - mylegaltimekeeper

Quick setup guide for your new repository.

## Your Repository Details
- **Repository**: `mylegaltimekeeper`
- **GitHub Username**: `jasontbarnesesq`
- **Your App URL**: `https://jasontbarnesesq.github.io/mylegaltimekeeper/`

---

## Quick Setup Steps

### Step 1: Upload Files to Repository
1. Go to: `https://github.com/jasontbarnesesq/mylegaltimekeeper`
2. Click **"Add file"** → **"Upload files"**
3. Upload these files:
   - `index.html`
   - `manifest.json`
   - `service-worker.js`
   - `icon-192.png` (you need to create this - see icon guide below)
   - `icon-512.png` (you need to create this - see icon guide below)
4. Scroll down and click **"Commit changes"**

### Step 2: Enable GitHub Pages
1. In your repository, click **"Settings"** (top menu)
2. Scroll down and click **"Pages"** in the left sidebar
3. Under **"Source"**, select:
   - Branch: **main** (or whatever your default branch is)
   - Folder: **/ (root)**
4. Click **"Save"**
5. Wait 1-2 minutes for deployment

### Step 3: Access Your App
Your app will be live at:
```
https://jasontbarnesesq.github.io/mylegaltimekeeper/
```

---

## Creating App Icons

You need two icon files before the PWA features work properly.

### Quick Method - Use Canva (Free):
1. Go to [Canva.com](https://canva.com)
2. Create custom size: **512x512 pixels**
3. Design your icon:
   - Background: Purple gradient (#667eea to #764ba2)
   - Add: White microphone emoji 🎤 or ⏱️ clock
   - Or add letters: "TT" in white
4. Download as PNG
5. Resize to create both sizes:
   - Save as `icon-512.png` (512x512)
   - Resize to 192x192 and save as `icon-192.png`

### Alternative - Use AI:
Ask ChatGPT or DALL-E:
> "Create a simple app icon with a purple gradient background and a white microphone or clock symbol, 512x512 pixels, minimalist design"

### Alternative - Simple Online Tool:
1. Go to [AppIcon.co](https://appicon.co)
2. Upload any image you like
3. It generates all sizes automatically
4. Download the 192x192 and 512x512 versions

---

## Setting Up Daily Reminders

Once your app is hosted and you can access it:

### In Your Browser:
1. Open: `https://jasontbarnesesq.github.io/mylegaltimekeeper/`
2. **Bookmark this URL** for easy access
3. Click the **⚙️ settings icon**
4. **Enable notifications**:
   - Toggle "Daily Reminders" ON
   - Choose your reminder time (e.g., 5:00 PM)
   - Select which days to remind you (default: Mon-Fri)
   - Click "Save Reminder Settings"
5. **Grant permission** when your browser asks to show notifications

### Browser Requirements:
- **Chrome, Edge, or Safari** work best for voice and notifications
- Your browser must allow notifications from the site
- Keep the tab **pinned** for reliable notifications

---

## Installing as iOS App (PWA)

### On iPhone/iPad:
1. Open **Safari** (not Chrome)
2. Go to: `https://jasontbarnesesq.github.io/mylegaltimekeeper/`
3. Tap the **Share button** (square with arrow up)
4. Scroll down and tap **"Add to Home Screen"**
5. Name it: "Time Tracker" or "My Legal Timekeeper"
6. Tap **"Add"**

**Result**: App icon appears on your home screen and works like a native app!

---

## Setting Up Google Drive Auto-Save (Optional)

To automatically save exported CSV files to Google Drive:

1. Follow the detailed instructions in: `GOOGLE-DRIVE-SETUP.md`
2. You'll need to:
   - Create Google Cloud project (free)
   - Enable Google Drive API
   - Get Client ID and API Key
   - Update your `index.html` with credentials
3. Then in the app:
   - Settings → Google Drive Integration → Toggle ON
   - Sign in with your Google account
   - Exports will auto-save to Drive!

**Note**: This is completely optional. The app works fine without it using local CSV downloads.

---

## File Checklist

Make sure these files are in your repository:

- [x] `index.html` ← Main app file
- [ ] `manifest.json` ← PWA configuration
- [ ] `service-worker.js` ← Offline functionality
- [ ] `icon-192.png` ← App icon (small)
- [ ] `icon-512.png` ← App icon (large)
- [ ] `README.md` (optional) ← Description of your project

---

## Testing Your App

### 1. Check It's Live
- Open: `https://jasontbarnesesq.github.io/mylegaltimekeeper/`
- You should see the Time Tracker interface

### 2. Test Voice Mode
- Click the microphone button
- Allow microphone access
- Speak a test entry

### 3. Test Manual Mode
- Switch to Manual Mode
- Fill in a time entry
- Verify it saves

### 4. Test Export
- Add at least one entry
- Click "Export CSV"
- Verify file downloads

### 5. Test PWA (iPhone)
- Add to Home Screen (instructions above)
- Open from home screen
- Should work like native app

---

## Updating Your App

When you want to make changes:

1. Edit your `index.html` file locally
2. Go to your GitHub repository
3. Click on `index.html`
4. Click the pencil icon (Edit)
5. Make your changes or paste new code
6. Scroll down and click "Commit changes"
7. Wait 1-2 minutes
8. Refresh your app URL - changes are live!

---

## Troubleshooting

### App Not Loading?
- Wait 2-3 minutes after enabling GitHub Pages
- Check Settings → Pages to confirm deployment
- Try hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

### Icons Not Showing?
- Make sure `icon-192.png` and `icon-512.png` are uploaded
- Filenames must match exactly (lowercase, .png extension)
- Clear browser cache and refresh

### Voice Not Working?
- Use Chrome, Edge, or Safari
- Allow microphone access when prompted
- Check browser console for errors

### Notifications Not Working?
- Enable in Settings → Daily Reminders
- Allow notifications when browser prompts
- Keep the tab open or pinned

### Google Drive Not Connecting?
- Make sure you've set up API credentials
- Check that URLs in Google Cloud Console match exactly
- Sign out and sign in again

---

## Your App URLs

**Live App**: `https://jasontbarnesesq.github.io/mylegaltimekeeper/`

**Repository**: `https://github.com/jasontbarnesesq/mylegaltimekeeper`

**Share with others**: Just send them your live app URL!

---

## Next Steps

1. [ ] Upload all files to GitHub
2. [ ] Create app icons
3. [ ] Enable GitHub Pages
4. [ ] Test the app
5. [ ] Install on iPhone (optional)
6. [ ] Set up Google Drive (optional)
7. [ ] Configure daily reminders
8. [ ] Start tracking time!

---

**You're all set!** 🎉

Your time tracker will be live at: `https://jasontbarnesesq.github.io/mylegaltimekeeper/`
