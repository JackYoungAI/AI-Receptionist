# Start here — do these steps in order

You only need **two things** from Supabase: the **Project URL** and the **Anon Key**. You get them after you make a free account and a project. Here’s how, click by click.

---

## Step 1: Make a Supabase account

1. Open your browser and go to: **https://supabase.com**
2. Click **"Start your project"** (big green button).
3. Sign up with **Google** or **Email** (Google is fastest).
4. Finish signing up. You’ll land on the Supabase dashboard.

---

## Step 2: Create a new project (this gives you the Project URL)

1. On the dashboard, click the green **"New Project"** button.
2. **Organization:** if it asks, pick "Personal" or the only option you see. Click **Next**.
3. **Name:** type something like **receptionist** (anything is fine).
4. **Database Password:** make one up and **write it down** (e.g. `MySecretPass123`). You need it only if you ever connect to the database with a tool; for this app you don’t.
5. **Region:** pick one close to you (e.g. East US).
6. Click **"Create new project"**.
7. Wait 1–2 minutes until it says **"Project is ready"**.

You now have a project. The **Project URL** is created here; we’ll copy it in the next step.

---

## Step 3: Get your Project URL and API key

**Project URL (two ways to get it):**

- **Option A — From the address bar:** While you’re in your Supabase project, look at the **browser’s address bar**. The URL will look like:
  `https://supabase.com/dashboard/project/abcdefghijklmnop/settings/...`
  The part after `/project/` (e.g. `abcdefghijklmnop`) is your **project reference ID**. Your **Project URL** is:
  `https://abcdefghijklmnop.supabase.co`
  (Same ID, with `.supabase.co` at the end. Replace `abcdefghijklmnop` with your real ID.)
- **Option B — From Settings:** Click the **gear icon** (Settings) in the left sidebar → click **"General"** (under CONFIGURATION). Look for **"Reference ID"** or **"Project URL"**. If you see Reference ID, the Project URL is `https://REFERENCE_ID.supabase.co`.

**API key (the one safe to use in the browser):**

1. In the left sidebar, click the **gear icon** → **"API Keys"**.
2. You’ll see **"Publishable key"** and **"Secret keys"**. We need the **publishable** one.
3. Under **"Publishable key"**, copy the key that starts with **`sb_publishable_`** (click the copy icon). That’s the key you put in **config.js** as `SUPABASE_ANON_KEY`.

If you see a tab or link that says **"Legacy anon, service_role API keys"**, you can click that — the **anon** key there is the same idea. Use either the new **publishable** key or the legacy **anon** key; put it in config.js as the anon key.

You need: **Project URL** (from the address bar or General) and **publishable key** (or legacy anon key).

---

## Step 4: Run the database setup (so the app has tables)

1. In the **left sidebar**, click **"SQL Editor"**. (It might have an icon that looks like `</>` or a terminal/code icon. If you don’t see it, scroll the sidebar — it’s often under “Development” or near the top.)
2. You should see a page with a big **text box** where you can type SQL. You might also see:
   - A **"+ New query"** or **"New query"** button (top right or under a **"New"** dropdown), or
   - The page might already show one empty query or a welcome message. **Just click inside the big text area** — that’s where you paste.
3. Open the folder **ai-receptionist-drag-drop** on your computer → open the **sql** folder → open **schema.sql** in Notepad.
4. In Notepad, select **all** the text (Ctrl+A) and **copy** it (Ctrl+C).
5. Back in Supabase, **click inside the big SQL text box** and **paste** (Ctrl+V). The schema should appear there.
6. Click the green **"Run"** button (or **"Execute"** or a **Play ▶** icon — usually bottom right of the text box or in the toolbar).
7. At the bottom it should say something like **"Success"** or **"No rows returned"**. That’s good.

Your database now has the tables the app needs.

**Optional — schedule & booking:** If you already ran the schema earlier and want the AI to use business hours and book appointments, run **sql/migration-schedule-appointments.sql** in a new SQL query and Run it.

**If you still don’t see a way to run SQL:** On the left sidebar, click **"Database"** → then **"Extensions"** or **"Tables"** to confirm you’re in the right project. Then try **SQL Editor** again. Some layouts have a **"+"** or **"New"** at the top of the SQL Editor page — click that to get a new query box.

---

## Step 5: Create your login (so you can log into the app)

1. In the **left sidebar**, click **"Authentication"** (person icon).
2. Click **"Users"** in the sub-menu.
3. Click **"Add user"** → **"Create new user"**.
4. **Email:** type your real email (e.g. the one you use for school).
5. **Password:** make one up and remember it (e.g. `MyAppPassword123`).
6. Turn **ON** the switch that says **"Auto Confirm User"** (so you can log in right away).
7. Click **"Create user"**.

That user is your only admin. You’ll log in with this email and password in the app.

---

## Step 6: Put the URL and key into your app folder

1. On your computer, go to: **C:\Users\jackt\ai-receptionist-drag-drop**
2. **Right‑click** the file **config.js** → **Open with** → **Notepad** (or any text editor).
3. You’ll see two lines like:
   - `SUPABASE_URL: "https://YOUR_PROJECT.supabase.co"`
   - `SUPABASE_ANON_KEY: "YOUR_ANON_KEY_HERE"`
4. **Replace** the first line with your **Project URL** (from Step 3), in quotes. Example:
   - `SUPABASE_URL: "https://abcdefghijklmnop.supabase.co"`
5. **Replace** the second line with your **publishable key** (the one that starts with `sb_publishable_`), in quotes. Example:
   - `SUPABASE_ANON_KEY: "sb_publishable_ivl5zXR30ww5ZF4Uh9eI3w_yB30Y..."`
6. **Save** the file (Ctrl+S) and close Notepad.

---

## Step 7: Put the folder on the web (drag and drop)

1. Go to: **https://drop.netlify.com**
2. You’ll see a big area that says to drag your site there.
3. Open **File Explorer** and go to **C:\Users\jackt**
4. Find the folder **ai-receptionist-drag-drop**.
5. **Drag that whole folder** onto the Netlify Drop page and release.
6. Wait a few seconds. Netlify will give you a link like **https://something-random-123.netlify.app**.
7. **Click the link** (or copy it and open it in a new tab).

You should see the **AI Receptionist** login page.

---

## Step 8: Log in and use the app

1. Enter the **email** and **password** you created in Step 5.
2. Click **Log in**.
3. You’ll see the **Dashboard** (empty at first). Click **"+ Add Client"** to add your first business.

---

## If something doesn’t work

- **"Open config.js and add your Supabase URL and Anon Key"**  
  You’re still on the default config. Redo Step 6 and make sure you saved **config.js** with your real Project URL and anon key (no typos, quotes around them).

- **"Invalid login"**  
  Use the exact email and password from Step 5. If you didn’t turn on **Auto Confirm User**, go back to Supabase → Authentication → Users and confirm that user, or create a new user and turn **Auto Confirm** on.

- **Nothing loads / blank page**  
  Make sure you dragged the **whole** folder to Netlify Drop (not just one file). The folder must contain **index.html**, **config.js**, **app.js**, **style.css**, and the **sql** folder.

---

## Quick recap

| What you need | Where you got it |
|---------------|------------------|
| **Project URL** | Supabase → Project Settings (gear) → API → copy "Project URL" |
| **Anon Key**   | Same page → Project API keys → copy the **anon public** key |
| **Login**      | Supabase → Authentication → Users → Add user (with Auto Confirm on) |

You don’t need a "project URL" from anywhere else — only from that Supabase **Project Settings → API** page. Once you have it and the anon key in **config.js**, drag the folder to drop.netlify.com and you’re done.
