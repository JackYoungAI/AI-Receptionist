# Deploying to Cloudflare Pages

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Upload assets** (Direct Upload).

2. **Important:** Upload the **contents** of the `ai-receptionist-drag-drop` folder so that `index.html` is at the **root** of the upload:
   - Either drag the **contents** (index.html, config.js, app.js, style.css, _redirects, etc.) into the upload area,  
   - Or zip the **contents** (not the parent folder) and upload the zip.

   If you upload the folder itself, the site root might be wrong and the app may not load.

3. Deploy. Your site will be at `https://<project-name>.pages.dev`.

4. **Open this exact URL:** `https://<project-name>.pages.dev/` (with the trailing slash or without—both should work). Do not go to `/dashboard` or another path without the hash; the app uses hash routing (`#dashboard`, `#login`).

5. If you see **"Open config.js and add your Supabase URL"**: Your `config.js` is either missing from the upload or not loading. Re-upload and ensure `config.js` is in the same directory as `index.html` and contains your real Supabase URL and anon key.

6. The `_redirects` file in this folder tells Cloudflare to serve `index.html` for all paths, so the app loads even if you land on a wrong URL.
