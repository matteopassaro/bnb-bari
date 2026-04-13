import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SMOOBU_API_BASE = "https://login.smoobu.com/api";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  console.log(`[smoobu-cancel-reservation] Started at ${new Date().toISOString()}`);

  try {
    const { reservation_id, room_id } = await req.json();

    if (!reservation_id) {
      throw new Error("reservation_id is required");
    }

    const apiKey = Deno.env.get("SMOOBU_API_KEY");
    if (!apiKey) throw new Error("SMOOBU_API_KEY not configured");

    console.log(`[smoobu-cancel-reservation] Cancelling reservation ${reservation_id}`);

    const res = await fetch(`${SMOOBU_API_BASE}/reservations/${reservation_id}`, {
      method: "DELETE",
      headers: {
        "Api-Key": apiKey,
        "Cache-Control": "no-cache",
        "Content-Type": "application/json",
      },
    });

    const data = await res.text();
    console.log(`[smoobu-cancel-reservation] Response status: ${res.status}`);
    console.log(`[smoobu-cancel-reservation] Response body:`, data);

    if (!res.ok) {
      console.error(`[smoobu-cancel-reservation] API error ${res.status}:`, data);
      throw new Error(`Smoobu API ${res.status}: ${data}`);
    }

    console.log(`[smoobu-cancel-reservation] Reservation ${reservation_id} cancelled successfully`);

    return new Response(
      JSON.stringify({ success: true, reservation_id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[smoobu-cancel-reservation] Error: ${message}`);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
