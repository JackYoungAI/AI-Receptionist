# Set up Twilio + Retell AI with your website

This guide walks you through connecting a **Twilio phone number** and **Retell AI** so your AI Receptionist dashboard controls a real phone line that answers calls.

---

## Overview

1. **Twilio** – You get a phone number (or use one you already have).
2. **Retell AI** – You create an AI voice agent and connect it to that number. Retell can use Twilio for the actual phone line.
3. **Your website** – You paste the Retell **agent ID** and **phone number** into each client so the dashboard and your Supabase webhooks know which business is calling.

---

## Step 1: Get a Twilio phone number

1. Go to [twilio.com](https://www.twilio.com) and sign up or log in.
2. Open the **Console** (dashboard).
3. Go to **Phone Numbers** → **Manage** → **Buy a number** (or use a trial number).
4. Choose your country and search. Pick a number and complete the purchase (trial accounts get one free number).
5. Note the number in E.164 format (e.g. `+15551234567`). You’ll use this in Retell and in your dashboard.

**Trial note:** Twilio trial numbers can only call verified numbers unless you upgrade. For production, add billing and verify numbers or upgrade the account.

---

## Step 2: Create a Retell AI account and agent

1. Go to [retellai.com](https://www.retellai.com) and sign up or log in.
2. In the Retell dashboard, go to **Agents** → **Create agent** (or **Add agent**).
3. Configure your agent:
   - **Name:** e.g. “Receptionist – [Your Business]”
   - **Voice:** Pick a voice (e.g. conversational, professional).
   - **Language:** Your preferred language.
   - **Prompt / instructions:** Tell the AI how to answer. Example:

   ```
   You are the receptionist for [Business Name]. Answer calls politely. You can:
   - Answer questions about hours and services
   - Book appointments when the caller agrees to a date and time (use the book_appointment tool)
   - Take messages or offer to have someone call back
   Use the business hours and existing appointments provided for this call. Only suggest times that are open and not already booked.
   ```

4. Save the agent. On the agent page, copy the **Agent ID** (e.g. `agent_xxxxx`). You’ll paste this into your website.

---

## Step 3: Connect the phone number to Retell

Retell can provide the number, or you can bring your own (e.g. Twilio).

### Option A: Use a number from Retell

1. In Retell, go to **Phone Numbers** → **Buy** or **Get number**.
2. Buy or claim a number and assign it to your agent.
3. Copy that number (E.164). Use it in your dashboard as the “Retell phone number.”

### Option B: Use your Twilio number with Retell

1. In Retell, go to **Phone Numbers** or **Integrations** and look for **Twilio** or **Bring your own number**.
2. Follow Retell’s steps to connect Twilio (e.g. enter Twilio Account SID, Auth Token, and the Twilio number).
3. Retell will tell you what to set in Twilio (e.g. webhook URL for incoming calls). In Twilio: **Phone Numbers** → your number → **Voice & Fax** → set the “A call comes in” webhook to the URL Retell gives you.
4. In Retell, assign this number to your agent. The number you’ll put in your dashboard is the same Twilio number (e.g. `+15551234567`).

---

## Step 4: Add agent ID and phone number to your website

1. Open your AI Receptionist site (e.g. the GitHub Pages URL).
2. Log in and open the **client** (business) you want to use with this agent.
3. In the **Edit** section, fill in:
   - **Retell agent ID:** the ID you copied (e.g. `agent_xxxxx`).
   - **Retell phone number:** the number that rings this agent (from Retell or Twilio), e.g. `+15551234567`.
4. Click **Save changes**.

When someone calls that number, Retell will use this agent and, if you set up the webhooks below, your schedule and appointments.

---

## Step 5: (Optional) Send schedule and appointments to the agent

So the AI only offers times you’re open and doesn’t double-book:

1. In **Supabase** → **Edge Functions**, create a function named **retell-inbound**.
2. Copy the code from **supabase-inbound-webhook-paste.ts** in this project into that function and deploy it.
3. Copy the function URL (e.g. `https://xxxx.supabase.co/functions/v1/retell-inbound`).
4. In **Retell** → **Phone Numbers** → click your number → set **Inbound Webhook** URL to that URL.
5. In your **Retell agent’s prompt**, add something like:

   ```
   Our business hours and existing bookings are provided for this call. Only suggest appointment times that are within business hours and that do not conflict with existing appointments.

   Business hours:
   {{business_schedule_text}}

   Already booked (do not book these times):
   {{existing_appointments}}
   ```

Retell will call your inbound webhook on each call and inject `{{business_schedule_text}}` and `{{existing_appointments}}` so the agent knows your schedule and current bookings.

---

## Step 6: (Optional) Let the agent create bookings

So the AI can actually book appointments (not just suggest times):

1. In **Supabase** → **Edge Functions**, create a function named **retell-book-appointment**.
2. Copy the code from **supabase-book-appointment-paste.ts** into it and deploy.
3. Copy the function URL (e.g. `https://xxxx.supabase.co/functions/v1/retell-book-appointment`).
4. In **Retell** → your **Agent** → **Tools** (or **Custom functions**) → **Add** → **Custom function**:
   - **URL:** the `retell-book-appointment` URL. If Retell doesn’t send the agent automatically, add `?agent_id=YOUR_AGENT_ID` to the URL.
   - **Name:** `book_appointment`.
   - **Parameters:** e.g. `date`, `time`, `customer_name`, `customer_phone`, and optionally `duration_minutes`.
5. In the agent prompt, tell it to call `book_appointment` when the caller confirms a date and time (and to use the caller’s name and phone from the call).

---

## Quick reference

| What | Where |
|------|--------|
| Twilio number | Twilio Console → Phone Numbers |
| Retell agent ID | Retell → Agents → your agent → Agent ID |
| Retell phone number | The number that rings your agent (from Retell or Twilio) |
| Paste into website | Client → Edit → Retell agent ID, Retell phone number |
| Inbound webhook (schedule) | Retell → Phone Numbers → your number → Inbound Webhook → Supabase `retell-inbound` URL |
| Book appointment tool | Retell → Agent → Tools → Custom function → Supabase `retell-book-appointment` URL |

---

## Troubleshooting

- **Calls don’t reach the agent:** Check that the number is assigned to the agent in Retell and, if using Twilio, that the Twilio webhook URL is exactly what Retell specifies.
- **Agent doesn’t know schedule:** Ensure the Inbound Webhook URL is set for that number and that the Supabase `retell-inbound` function is deployed and returns `dynamic_variables` with `business_schedule_text` and `existing_appointments`.
- **Booking fails:** Ensure the book-appointment custom function URL is correct and includes `agent_id` if required. Check Supabase Edge Function logs for errors.
