# AI Receptionist — Drag & Drop Version

**No install. No GitHub. No terminal.**

---

## 1. One-time setup in Supabase

1. Go to [supabase.com](https://supabase.com) and create a project.
2. **SQL Editor** → New query → open the file `sql/schema.sql` in this folder, copy all of it, paste, Run.
3. **Authentication** → Users → Add user → your email + password. Check **Auto Confirm**.
4. **Project Settings** → API → copy your **Project URL** and **anon public** key.

---

## 2. Put your keys in the folder

1. Open **config.js** in this folder (Notepad is fine).
2. Replace `YOUR_PROJECT` and `YOUR_ANON_KEY_HERE` with your real Supabase URL and anon key.
3. Save.

---

## 3. Drag the folder onto Netlify Drop

1. Go to **[drop.netlify.com](https://drop.netlify.com)**.
2. Drag this entire folder (`ai-receptionist-drag-drop`) onto the page.
3. Netlify will give you a URL like `https://random-name-123.netlify.app`. That’s your site.

Open the URL → you’ll see the login page. Log in with the email and password you created in Supabase.

---

## 4. (Optional) Call logs from Retell

To have call logs show up when Retell sends webhooks:

1. In Supabase go to **Edge Functions** → Create a new function named `retell-webhook`.
2. Open the file **supabase-webhook-paste.txt** in this folder. Copy everything.
3. Paste it into the Edge Function editor and deploy.
4. Copy the function’s URL (e.g. `https://xxx.supabase.co/functions/v1/retell-webhook`).
5. In the **Retell** dashboard, set the webhook URL to that URL.

---

## 5. (Optional) Business schedule & appointment booking

So the AI only offers times when you’re open and doesn’t double-book:

### Database

If you already ran `sql/schema.sql` earlier, run **`sql/migration-schedule-appointments.sql`** in the SQL Editor to add the schedule and appointments tables.

### Set your schedule in the app

1. Open a client → **Business schedule (for AI booking)**.
2. Set timezone, default appointment length (minutes), and for each day set **Open** / **Close** times or check **Closed**.
3. Click **Save schedule**.

You can also add appointments manually in **Upcoming appointments**; the AI will see them and avoid those slots.

### Give the agent schedule + appointments on each call (Retell)

1. In Supabase: **Edge Functions** → Create function → name **`retell-inbound`**.
2. Open **supabase-inbound-webhook-paste.ts** in this folder. Copy everything, paste into the function, deploy.
3. Copy the function URL (e.g. `https://xxx.supabase.co/functions/v1/retell-inbound`).
4. In **Retell** → **Phone Numbers** → your number → enable **Inbound Webhook**, set the URL to that `retell-inbound` URL.
5. In your **Retell agent** prompt, include something like:

   ```
   Our business hours and existing bookings are provided for this call. Only suggest appointment times that are within business hours and that do not conflict with existing appointments.

   Business hours:
   {{business_schedule_text}}

   Already booked (do not book these times):
   {{existing_appointments}}
   ```

When a call comes in, Retell will call your inbound webhook; the response fills `{{business_schedule_text}}` and `{{existing_appointments}}` so the agent knows when you’re open and what’s already booked.

### Let the agent create bookings (Retell custom function)

1. In Supabase: **Edge Functions** → Create function → name **`retell-book-appointment`**.
2. Open **supabase-book-appointment-paste.ts**, copy all, paste into the function, deploy.
3. Copy the function URL, e.g. `https://xxx.supabase.co/functions/v1/retell-book-appointment`.
4. In **Retell** → your agent → **Tools** → **Add** → **Custom function**.
   - URL: the `retell-book-appointment` URL. If Retell doesn’t send the agent automatically, add `?agent_id=YOUR_AGENT_ID` to the URL.
   - Name: `book_appointment`.
   - Parameters: e.g. `date` (string, e.g. "2025-03-05"), `time` (string, e.g. "14:00" or "2:00 PM"), `customer_name`, `customer_phone`, and optionally `duration_minutes`.
5. In the agent prompt, tell it to call `book_appointment` when the caller confirms a date and time (and give the caller’s name and phone from the call).

The function checks business hours and existing appointments and only creates the booking if the slot is free.

---

## Summary

- **config.js** = your Supabase URL + anon key  
- **Supabase** = run `sql/schema.sql`, create one user. If you already had the app, run `sql/migration-schedule-appointments.sql` then `sql/migration-workers.sql` for schedule, appointments, and workers.  
- **drop.netlify.com** = drag this folder → get a link  
- **Retell** = create agents in their dashboard, paste agent ID and phone number into each client. Set the **Inbound Webhook** to `retell-inbound` so the agent gets schedule + appointments; add the **Custom function** `retell-book-appointment` so it can book appointments that don’t conflict.

No Node, no npm, no GitHub, no install.

---

## Set up Twilio + Retell (phone + AI agent)

See **[SETUP-TWILIO-RETELL.md](SETUP-TWILIO-RETELL.md)** for step-by-step instructions to connect a Twilio number and Retell AI to your dashboard.
