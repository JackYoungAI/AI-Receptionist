// Retell custom function — paste this into a NEW Supabase Edge Function.
// Name: retell-book-appointment
// In Retell: add a Custom Function with URL = this function's URL.
// Function name: book_appointment
// Parameters (example): date (string, e.g. "2025-03-05"), time (string, e.g. "14:00" or "2:00 PM"), customer_name (string), customer_phone (string), duration_minutes (optional number)
// Retell will POST when the agent calls the tool. We validate slot and insert into appointments.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DAYS: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

function parseTime(t: string): number {
  const s = String(t).trim().toLowerCase();
  const match = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = match[2] ? parseInt(match[2], 10) : 0;
    const ampm = match[3];
    if (ampm === "pm" && h < 12) h += 12;
    if (ampm === "am" && h === 12) h = 0;
    return h * 60 + m;
  }
  if (s.includes(":")) {
    const [hh, mm] = s.split(":").map((x) => parseInt(x, 10));
    return (hh ?? 0) * 60 + (mm ?? 0);
  }
  return 0;
}

function timeToStr(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function getScheduleForDate(schedule: Record<string, unknown> | null, date: Date): { open: number; close: number } | null {
  if (!schedule || typeof schedule !== "object") return null;
  const hours = schedule.hours as Record<string, { open?: string; close?: string } | null> | undefined;
  if (!hours) return null;
  const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const day = dayNames[date.getDay()];
  const h = hours[day];
  if (!h || typeof h !== "object" || !h.open || !h.close) return null;
  return { open: parseTime(h.open), close: parseTime(h.close) };
}

serve(async (req) => {
  if (req.method !== "POST") return new Response(JSON.stringify({ success: false, message: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json" } });
  try {
    const url = new URL(req.url);
    const body = await req.json();
    const agentId = body.agent_id ?? body.agentId ?? body.arguments?.agent_id ?? url.searchParams.get("agent_id");
    const args = body.arguments ?? body;
    const dateStr = (args.date ?? args.appointment_date) as string;
    const timeStr = (args.time ?? args.appointment_time) as string;
    const customerName = (args.customer_name ?? args.name ?? args.caller_name) as string;
    const customerPhone = (args.customer_phone ?? args.phone ?? args.caller_phone) as string;
    let durationMin = typeof args.duration_minutes === "number" ? args.duration_minutes : parseInt(String(args.duration_minutes || ""), 10);

    if (!agentId) {
      return new Response(JSON.stringify({ success: false, message: "Missing agent_id" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    if (!dateStr || !timeStr) {
      return new Response(JSON.stringify({ success: false, message: "Missing date or time" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: client, error: clientErr } = await supabase.from("clients").select("id, business_schedule").eq("retell_agent_id", agentId).single();
    if (clientErr || !client) {
      return new Response(JSON.stringify({ success: false, message: "Unknown agent" }), { status: 404, headers: { "Content-Type": "application/json" } });
    }

    const schedule = client.business_schedule as Record<string, unknown> | null;
    if (!durationMin || durationMin < 5) {
      durationMin = (schedule?.appointment_duration_minutes as number) || 30;
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return new Response(JSON.stringify({ success: false, message: "Invalid date" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    const startMinutes = parseTime(timeStr);
    const startTime = new Date(date);
    startTime.setHours(0, 0, 0, 0);
    startTime.setMinutes(startTime.getMinutes() + startMinutes);
    const endTime = new Date(startTime.getTime() + durationMin * 60 * 1000);

    const daySchedule = getScheduleForDate(schedule, startTime);
    if (daySchedule) {
      if (startMinutes < daySchedule.open || startMinutes + durationMin > daySchedule.close) {
        return new Response(JSON.stringify({ success: false, message: `We're only open ${timeToStr(daySchedule.open)}–${timeToStr(daySchedule.close)} that day. Please suggest a time within those hours.` }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
    }

    const { data: overlapping } = await supabase
      .from("appointments")
      .select("id")
      .eq("client_id", client.id)
      .lt("start_time", endTime.toISOString())
      .gt("end_time", startTime.toISOString());
    if (overlapping && overlapping.length > 0) {
      return new Response(JSON.stringify({ success: false, message: "That slot is already booked. Please suggest another time." }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    const { error: insertErr } = await supabase.from("appointments").insert({
      client_id: client.id,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      customer_name: customerName || null,
      customer_phone: customerPhone || null,
    });
    if (insertErr) {
      return new Response(JSON.stringify({ success: false, message: "Failed to save appointment" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    const friendlyDate = startTime.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    const friendlyTime = startTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    return new Response(JSON.stringify({ success: true, message: `Booked for ${friendlyDate} at ${friendlyTime}.` }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ success: false, message: "Server error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
