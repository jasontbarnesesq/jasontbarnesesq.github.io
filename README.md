# Deployment Instructions — jasontbarnes.com

Complete step-by-step guide to deploy your homepage to GitHub Pages with custom domain.

---

## ✅ DNS Configuration (GoDaddy) — Almost Complete!

You already have the correct setup. **One change needed:**

### Delete This Record
- **Type A, Name @, Data: WebsiteBuilder Site** ← Delete this row (conflicts with GitHub)

### Keep These Records (Already Correct)
- A @ → 185.199.108.153 ✓
- A @ → 185.199.109.153 ✓
- A @ → 185.199.110.153 ✓
- A @ → 185.199.111.153 ✓
- CNAME www → jasontbarnesesq.github.io ✓

After deleting the WebsiteBuilder record, click **Save** in GoDaddy DNS settings.

DNS propagation: 15 minutes to 48 hours (usually ~1 hour). Check progress at dnschecker.org

---

## Step 1 — Create GitHub Repository

1. Go to **github.com** → Sign in with `jasontbarnesesq`
2. Click **New repository** (green button, top right)
3. Repository name: `jasontbarnesesq.github.io` (must match exactly)
4. Visibility: **Public**
5. ☑ Add a README file (you can replace it)
6. Click **Create repository**

---

## Step 2 — Upload Files to GitHub

**Option A — Web Interface (Easier)**

1. In your new repo, click **Add file** → **Upload files**
2. Drag and drop these three files from your computer:
   - `index.html` (the homepage)
   - `CNAME` (domain configuration)
   - `README.md` (documentation)
3. Scroll down, commit message: "Initial homepage deploy"
4. Click **Commit changes**

**Option B — Git Command Line (If Comfortable)**

```bash
# In your terminal, navigate to where you saved the files
cd ~/path/to/files

# Initialize and push
git init
git add index.html CNAME README.md
git commit -m "Initial homepage deploy"
git branch -M main
git remote add origin https://github.com/jasontbarnesesq/jasontbarnesesq.github.io.git
git push -u origin main
```

---

## Step 3 — Enable GitHub Pages

1. In your repo, go to **Settings** (top nav)
2. Scroll down left sidebar → **Pages**
3. Under "Build and deployment":
   - Source: **Deploy from a branch**
   - Branch: **main**
   - Folder: **/ (root)**
4. Click **Save**

GitHub will show: "Your site is live at https://jasontbarnesesq.github.io"
Wait ~2 minutes for initial build.

---

## Step 4 — Verify Custom Domain

In the same Settings → Pages section:

1. Under "Custom domain", you should see: `jasontbarnes.com` (already configured via CNAME file)
2. Once DNS propagates (check dnschecker.org), a green checkmark will appear
3. Enable **☑ Enforce HTTPS** (appears after DNS verification)

---

## Step 5 — Test Both URLs

Open two browser tabs:

```
https://jasontbarnes.com                    ← Your homepage
https://jasontbarnes.com/MyLegalTimekeeper  ← App (unchanged)
```

Both should work. The Timekeeper app inherits the custom domain automatically — no changes needed to that repo.

---

## Troubleshooting

**"DNS check failed" in GitHub Pages**
- Wait longer (DNS can take up to 48 hours)
- Verify you deleted the WebsiteBuilder A record in GoDaddy
- Check dnschecker.org to see propagation status

**Homepage loads but Timekeeper gives 404**
- Make sure MyLegalTimekeeper repo has GitHub Pages enabled
- Settings → Pages → Deploy from branch → main

**"jasontbarnes.com" shows error page**
- DNS not propagated yet — try jasontbarnesesq.github.io first
- That should work immediately while DNS resolves

---

## What Happens Next

### Immediate (After Step 3)
```
jasontbarnesesq.github.io → ✓ Homepage live
jasontbarnesesq.github.io/MyLegalTimekeeper → ✓ App live
```

### After DNS Propagates (1–48 hours)
```
jasontbarnes.com → ✓ Homepage
jasontbarnes.com/MyLegalTimekeeper → ✓ App
www.jasontbarnes.com → ✓ Redirects to non-www
```

The github.io URLs continue to work even after custom domain is active.

---

## File Structure After Deploy

```
jasontbarnesesq.github.io/
├── index.html              ← Homepage
├── CNAME                   ← Domain config (jasontbarnes.com)
└── README.md               ← This documentation

Future pages (add as needed):
├── legal-services/
│   └── index.html
├── about/
│   └── index.html
├── insights/
│   └── index.html
└── privacy-policy/
    └── index.html
```

Each folder with an `index.html` becomes a clean URL:
- `/legal-services/index.html` → `jasontbarnes.com/legal-services`
- `/about/index.html` → `jasontbarnes.com/about`

---

## Contact

Questions? Email: jtbarnes@munsch.com
Phone: 214.880.1024

---

**You're ready to deploy. Start at Step 1.**
