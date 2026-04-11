import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const ICAL_URL = Deno.env.get("ICAL_URL");

// Per ottenere il link iCal: Booking.com Dashboard → Proprietà → Calendario → Esporta calendario → copia URL .ics → aggiungilo a Supabase Secrets come ICAL_URL
//
// NOTA BENE PER SVILUPPI FUTURI:
// Questa funzione eseguirà una sincronizzazione UNIDIREZIONALE in LETTURA da Booking.com (o altro portale) a Supabase.
// Per avere un vero e proprio Channel Manager Bidirezionale (es. aggiornare Booking.com quando entra 
// una prenotazione diretta dal sito), sarà necessario affidarsi ad un servizio specializzato come Lodgify, 
// Smoobu o Beds24, e interfacciarsi con le loro API.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  console.log(`[sync-ical] Schedulato / Avviato alle: ${new Date().toISOString()}`);

  if (!ICAL_URL) {
    console.log("[sync-ical] iCal URL not configured. Exiting graciously.");
    return new Response(JSON.stringify({ message: "iCal URL not configured" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // TODO: Implementazione logica iCal:
    // 1. const icsResponse = await fetch(ICAL_URL);
    // 2. const icsText = await icsResponse.text();
    // 3. const events = parseIcs(icsText); // Serve una libreria o un parser manuale
    // 4. Inizia una transazione per evitare sovrapposizioni o sfasamenti (su Supabase RPC o delete+insert pulito)
    // 5. await supabaseClient.from("blocked_dates").delete().eq("source", "ical");
    // 6. await supabaseClient.from("blocked_dates").insert(events.map(e => ({
    //      date_from: e.start, date_to: e.end, source: 'ical'
    //    })));

    console.log("[sync-ical] Struttura iCal eseguita con successo (Placeholder).");

    return new Response(JSON.stringify({ success: true, message: "Placeholder eseguito correttamente" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error(`[sync-ical] Errore: ${err.message}`);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
