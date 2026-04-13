import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

// ─── Configurazione ───────────────────────────────────────────────────────────
// Mappa room_id (nostro) → apartment ID Smoobu
// Aggiorna i numeri quando passi all'account reale del committente
const SMOOBU_APARTMENT_MAP: Record<string, number> = {
  "camera-tripla-deluxe": 3266077,
  "camera-matrimoniale":  3266252,
  "monolocale-pietra":    3266182,
};

const SMOOBU_API_BASE = "https://login.smoobu.com/api";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Chiamata API Smoobu ──────────────────────────────────────────────────────
async function smoobuRequest(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  body?: Record<string, unknown>
): Promise<unknown> {
  const apiKey = Deno.env.get("SMOOBU_API_KEY");
  if (!apiKey) throw new Error("SMOOBU_API_KEY non configurata nei Secrets");
  
  console.log(`[smoobu] API Key present: ${apiKey.substring(0, 8)}...`);
  console.log(`[smoobu] Request: ${method} ${endpoint}`);
  console.log(`[smoobu] Payload:`, JSON.stringify(body, null, 2));

  const res = await fetch(`${SMOOBU_API_BASE}${endpoint}`, {
    method,
    headers: {
      "Api-Key": apiKey,
      "Cache-Control": "no-cache",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  console.log(`[smoobu] Response status: ${res.status}`);
  console.log(`[smoobu] Response body:`, JSON.stringify(data));

  if (!res.ok) {
    console.error(`[smoobu] API error ${res.status}:`, JSON.stringify(data));
    throw new Error(`Smoobu API ${res.status}: ${JSON.stringify(data)}`);
  }

  return data;
}

// ─── Handler principale ───────────────────────────────────────────────────────
// Chiamata internamente da stripe-webhook dopo checkout.session.completed
// NON esposta direttamente al frontend

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  console.log(`[smoobu-create-reservation] Avviato alle: ${new Date().toISOString()}`);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const {
      booking_id,
      room_id,
      check_in,
      check_out,
      guests,
      customer_name,
      customer_email,
      customer_phone,
      total_price,
    } = await req.json();

    console.log(`[smoobu-create-reservation] Received booking data:`, {
      booking_id,
      room_id,
      check_in,
      check_out,
      guests,
      customer_name,
      total_price,
    });

    // 1. Valida che il booking esista e sia paid
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      throw new Error(`Booking ${booking_id} non trovato`);
    }

    if (booking.payment_status !== "paid") {
      throw new Error(`Booking ${booking_id} non è paid (stato: ${booking.payment_status})`);
    }

    // 2. Idempotenza — se la prenotazione Smoobu è già stata creata non ricrearla
    if (booking.smoobu_reservation_id) {
      console.log(`[smoobu-create-reservation] Già creata su Smoobu: ${booking.smoobu_reservation_id}`);
      return new Response(
        JSON.stringify({
          success: true,
          smoobu_reservation_id: booking.smoobu_reservation_id,
          already_exists: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Trova l'apartment ID Smoobu per questa camera
    const apartmentId = SMOOBU_APARTMENT_MAP[room_id];
    if (!apartmentId) {
      throw new Error(`Nessun apartment ID Smoobu per room_id: ${room_id}`);
    }

    // 4. Separa nome e cognome (Smoobu li vuole separati)
    const nameParts = (customer_name ?? "").trim().split(" ");
    const firstName = nameParts[0] ?? "Ospite";
    const lastName = nameParts.slice(1).join(" ") || "-";

    // 5. Crea la prenotazione su Smoobu
    console.log(
      `[smoobu-create-reservation] Creando prenotazione per ${customer_name} (${check_in} → ${check_out})`
    );

    const smoobuPayload = {
      apartmentId,
      arrivalDate: check_in,    // YYYY-MM-DD
      departureDate: check_out, // YYYY-MM-DD
      firstName,
      lastName,
      email: customer_email ?? "",
      phone: customer_phone ?? "",
      notice: `Prenotazione diretta via sito web. Booking ID: ${booking_id}`,
      adults: guests ?? 1,
      price: total_price,
      priceStatus: 1,  // 1 = prezzo confermato
      deposit: 0,
      depositStatus: 1,
    };

    const smoobuResponse = await smoobuRequest(
      "/reservations",
      "POST",
      smoobuPayload
    ) as { id: number };

    const smoobuReservationId = smoobuResponse.id;
    console.log(`[smoobu-create-reservation] ✓ Prenotazione Smoobu creata: ID ${smoobuReservationId}`);

    // 6. Salva smoobu_reservation_id nel booking
    // IMPORTANTE: esegui prima questa migration su Supabase:
    // ALTER TABLE bookings ADD COLUMN IF NOT EXISTS smoobu_reservation_id integer;
    const { error: updateError } = await supabase
      .from("bookings")
      .update({ smoobu_reservation_id: smoobuReservationId })
      .eq("id", booking_id);

    if (updateError) {
      // Non critico — la prenotazione Smoobu è già creata
      console.error(
        `[smoobu-create-reservation] Errore salvataggio smoobu_id su Supabase:`,
        updateError
      );
    }

    return new Response(
      JSON.stringify({ success: true, smoobu_reservation_id: smoobuReservationId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[smoobu-create-reservation] Errore: ${message}`);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});