// Retell INBOUND webhook — paste this into a NEW Supabase Edge Function.
// Name: retell-inbound
// This runs when a call comes in. It returns business schedule + existing appointments
// so the agent can avoid double-booking and only offer times within business hours.
// In Retell: Phone Numbers → your number → enable "Inbound Webhook", set URL to this function's URL.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function formatSchedule(schedule: Record<string, unknown> | null): string {
  if (!schedule || typeof schedule !== "object") return "Not set. Ask the business owner to set hours in the dashboard.";
  const hours = schedule.hours as Record<string, { open?: string; close?: string } | null> | undefined;
  if (!hours) return "Not set.";
  const lines: string[] = [];
  const dayNames: Record<string, string> = { sun: "Sunday", mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday" };
  for (const d of DAYS) {
    const h = hours[d];
    if (h && typeof h === "object" && h.open && h.close) {
      lines.push(`${dayNames[d]}: ${h.open}–${h.close}`);
    } else {
      lines.push(`${dayNames[d]}: Closed`);
    }
  }
  const tz = (schedule.timezone as string) || "America/New_York";
  const dur = (schedule.appointment_duration_minutes as number) || 30;
  return `Timezone: ${tz}. Default appointment length: ${dur} minutes.\n` + lines.join("\n");
}

function formatAppointments(rows: { start_time: string; end_time: string; customer_name: string | null; customer_phone: string | null }[]): string {
  if (!rows || rows.length === 0) return "No appointments booked yet.";
  return rows
    .map((r) => {
      const start = new Date(r.start_time);
      const dateStr = start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
      const timeStr = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
      const end = new Date(r.end_time);
      const endStr = end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
      const who = [r.customer_name, r.customer_phone].filter(Boolean).join(" / ") || "—";
      return `${dateStr} ${timeStr}–${endStr} — ${who}`;
    })
    .join("\n");
}

serve(async (req) => {
  if (req.method !== "POST") return new Response(JSON.stringify({ call_inbound: {} }), { status: 200, headers: { "Content-Type": "application/json" } });
  try {
    const body = await req.json();
    const event = body.event;
    const payload = event === "call_inbound" ? body.call_inbound : event === "chat_inbound" ? body.chat_inbound : null;
    if (!payload) return new Response(JSON.stringify({ call_inbound: {} }), { status: 200, headers: { "Content-Type": "application/json" } });

    const agentId = payload.agent_id as string | undefined;
    const toNumber = (payload.to_number as string)?.replace(/\D/g, "");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let client: { id: string; business_schedule: Record<string, unknown> | null } | null = null;
    if (agentId) {
      const { data } = await supabase.from("clients").select("id, business_schedule").eq("retell_agent_id", agentId).single();
      client = data;
    }
    if (!client && toNumber) {
      const { data } = await supabase.from("clients").select("id, business_schedule").eq("retell_phone_number", payload.to_number).single();
      client = data;
    }
    if (!client) {
      return new Response(JSON.stringify({ call_inbound: { dynamic_variables: { business_schedule_text: "Hours not configured.", existing_appointments: "None." } } }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    const scheduleText = formatSchedule(client.business_schedule);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfRange = new Date(startOfToday);
    endOfRange.setDate(endOfRange.getDate() + 14);
    const { data: appointments } = await supabase
      .from("appointments")
      .select("start_time, end_time, customer_name, customer_phone")
      .eq("client_id", client.id)
      .gte("start_time", startOfToday.toISOString())
      .lt("start_time", endOfRange.toISOString())
      .order("start_time", { ascending: true });

    const appointmentsText = formatAppointments(appointments || []);

    const response = event === "chat_inbound"
      ? { chat_inbound: { dynamic_variables: { business_schedule_text: scheduleText, existing_appointments: appointmentsText } } }
      : { call_inbound: { dynamic_variables: { business_schedule_text: scheduleText, existing_appointments: appointmentsText } } };

    return new Response(JSON.stringify(response), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ call_inbound: { dynamic_variables: { business_schedule_text: "Error loading schedule.", existing_appointments: "None." } } }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
});
