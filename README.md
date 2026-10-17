# jasontbarnesesq.github.io

Serves **https://jasontbarnes.com** (GitHub Pages user site, `CNAME` = `jasontbarnes.com`).

## Current state: interim home of the J.T. Barnes & Associates, PLLC website

Until **jtbarnespllc.com** is connected, the new firm website runs here on jasontbarnes.com. The site is generated from the `jtbarnespllc-site` package (`build/build.py`); do not edit the generated HTML by hand.

The previous jasontbarnes.com site (Munsch Hardt era) is preserved on the branch **`archive/jasontbarnes-com-2026-10`**.

## Folders that must stay in this repository

| Path | What it is | Why it stays |
|---|---|---|
| `MyLegalTimekeeper/` | Copy of the Legal Timekeeper app and its setup notes | Existing links |
| `startpage/` | News landing page used as a browser start page | Bookmarks and new-tab extension |
| `MyLegalWidget_A1`, `widgets` | iOS widget source | Widget references |
| `CNAME` | `jasontbarnes.com` | Keeps every project site (including `jasontbarnes.com/mylegaltimekeeper/`, whose Google sign-in is registered to it) on this domain |

The live Legal Timekeeper is the separate **mylegaltimekeeper** repository, served at `https://jasontbarnes.com/mylegaltimekeeper/` because this repository holds the `jasontbarnes.com` domain. Changing `CNAME` here moves that app too.

## Website files (generated)

`index.html`, `404.html`, `about/`, `approach/`, `contact/`, `practice/`, `insights/`, `newsletter/`, `lab/`, `legal/`, `assets/`, `favicon.ico`, `robots.txt`, `sitemap.xml`, plus redirect pages at the old addresses `legal-services/`, `practice-tools/`, `privacy/`, and the three old `insights/` article paths.

To rebuild after editing `build/build.py` in the site package:

```bash
python3 build/build.py --domain jasontbarnes.com \
  --out /path/to/jasontbarnesesq.github.io --legacy-stubs --no-nojekyll
cp -r docs/assets docs/favicon.ico /path/to/jasontbarnesesq.github.io/
```

`--no-nojekyll` keeps GitHub's normal processing for the other folders in this repository.

## Moving to jtbarnespllc.com (later)

1. Create the `jtbarnespllc-site` repository, publish it from `docs/` with domain `jtbarnespllc.com`, and set the jtbarnespllc.com DNS records (see the launch workbook).
2. Once https://jtbarnespllc.com is live, replace the generated website files here with the redirect pages from the `jasontbarnes-redirect` package. Keep every folder in the table above and keep `CNAME` as `jasontbarnes.com`.
