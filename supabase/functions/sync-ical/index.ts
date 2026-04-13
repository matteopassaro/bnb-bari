import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

// ─── Configurazione camere ────────────────────────────────────────────────────
// Mappa room_id (nostro) → iCal URL (Smoobu)
// Per aggiornare: Smoobu → ogni camera → Edit → copia URL iCal
const ROOM_ICAL_MAP: Record<string, string | undefined> = {
  "camera-tripla-deluxe": Deno.env.get("ICAL_URL_TRIPLA"),
  "camera-doppia":        Deno.env.get("ICAL_URL_DOPPIA"),
  "monolocale":           Deno.env.get("ICAL_URL_MONOLOCALE"),
};

const FETCH_TIMEOUT_MS = 50_000; // 50 secondi — Smoobu può essere lento

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Parser iCal manuale ──────────────────────────────────────────────────────
type ICalEvent = { date_from: string; date_to: string };

function parseIcs(icsText: string): ICalEvent[] {
  const events: ICalEvent[] = [];
  const lines = icsText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n[ \t]/g, "")
    .split("\n");

  let inEvent = false;
  let dtStart = "";
  let dtEnd = "";

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      dtStart = "";
      dtEnd = "";
      continue;
    }
    if (line === "END:VEVENT") {
      inEvent = false;
      if (dtStart && dtEnd) {
        const from = normalizeDate(dtStart);
        const to = normalizeDate(dtEnd);
        if (from && to) events.push({ date_from: from, date_to: to });
      }
      continue;
    }
    if (!inEvent) continue;
    if (line.startsWith("DTSTART")) dtStart = line.split(":").slice(1).join(":");
    if (line.startsWith("DTEND"))   dtEnd   = line.split(":").slice(1).join(":");
  }

  return events;
}

function normalizeDate(raw: string): string | null {
  const cleaned = raw.trim();
  if (/^\d{8}$/.test(cleaned)) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`;
  }
  if (/^\d{8}T\d{6}Z?/.test(cleaned)) {
    const d = cleaned.slice(0, 8);
    return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  }
  console.warn(`[sync-ical] Formato data non riconosciuto: ${cleaned}`);
  return null;
}

// ─── Fetch con timeout ────────────────────────────────────────────────────────
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err: unknown) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Timeout dopo ${timeoutMs / 1000}s fetching iCal`);
    }
    throw err;
  }
}

// ─── Handler principale ───────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  console.log(`[sync-ical] Avviato alle: ${new Date().toISOString()}`);

  const configuredRooms = Object.entries(ROOM_ICAL_MAP).filter(([, url]) => !!url);
  if (configuredRooms.length === 0) {
    console.log("[sync-ical] Nessun URL iCal configurato nei Secrets. Uscita.");
    return new Response(
      JSON.stringify({ message: "Nessun URL iCal configurato" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const results: Record<string, { synced: number; error?: string }> = {};

  for (const [roomId, icalUrl] of configuredRooms) {
    console.log(`[sync-ical] Processing room: ${roomId}`);
    try {
      // 1. Fetch con timeout di 50 secondi
      const res = await fetchWithTimeout(icalUrl!, FETCH_TIMEOUT_MS);
      if (!res.ok) throw new Error(`HTTP ${res.status} fetching iCal for ${roomId}`);
      const icsText = await res.text();
      console.log(`[sync-ical] iCal fetched for ${roomId}: ${icsText.length} bytes`);

      // 2. Parsa
      const events = parseIcs(icsText);
      console.log(`[sync-ical] Parsed ${events.length} events for ${roomId}`);

      // 3. Delete righe ical di questa camera (non tocca stripe e manual)
      const { error: deleteError } = await supabase
        .from("blocked_dates")
        .delete()
        .eq("room_id", roomId)
        .eq("source", "ical");
      if (deleteError) throw deleteError;

      // 4. Insert nuovi eventi
      if (events.length > 0) {
        const rows = events.map((e) => ({
          room_id: roomId,
          date_from: e.date_from,
          date_to: e.date_to,
          source: "ical",
        }));
        const { error: insertError } = await supabase.from("blocked_dates").insert(rows);
        if (insertError) throw insertError;
      }

      results[roomId] = { synced: events.length };
      console.log(`[sync-ical] ✓ ${roomId}: ${events.length} eventi sincronizzati`);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[sync-ical] ✗ ${roomId}: ${message}`);
      results[roomId] = { synced: 0, error: message };
      // Continua con le altre camere anche se una fallisce
    }
  }

  const totalSynced = Object.values(results).reduce((sum, r) => sum + r.synced, 0);
  const hasErrors = Object.values(results).some((r) => r.error);

  console.log(`[sync-ical] Completato. Totale: ${totalSynced} eventi. Errori: ${hasErrors}`);

  return new Response(
    JSON.stringify({
      success: true,
      total_synced: totalSynced,
      has_errors: hasErrors,
      rooms: results,
    }),
    {
      status: hasErrors ? 207 : 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});