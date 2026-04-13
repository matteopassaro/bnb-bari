import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const SMOOBU_API_BASE = "https://login.smoobu.com/api";

// Mappa apartment ID Smoobu → room_id nostro (inversa di smoobu-create-reservation)
const SMOOBU_TO_ROOM_MAP: Record<number, string> = {
  3266077: "camera-tripla-deluxe",
  3266252: "camera-doppia",
  3266182: "monolocale",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SmoobuReservation = {
  id: number;
  type: string;
  arrival: string;
  departure: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  adults: number;
  price: number;
  apartmentId: number;
  channelId: number;
  apartment: { id: number; name: string };
  channel: { id: number; name: string };
};

type SmoobuResponse = {
  data: SmoobuReservation[];
  total_pages: number;
  page: number;
};

async function smoobuGet(endpoint: string): Promise<unknown> {
  const apiKey = Deno.env.get("SMOOBU_API_KEY");
  if (!apiKey) throw new Error("SMOOBU_API_KEY non configurata nei Secrets");

  const res = await fetch(`${SMOOBU_API_BASE}${endpoint}`, {
    method: "GET",
    headers: {
      "Api-Key": apiKey,
      "Cache-Control": "no-cache",
      "Content-Type": "application/json",
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Smoobu API ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  console.log(`[smoobu-sync-reservations] Avviato alle: ${new Date().toISOString()}`);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Fetcha prenotazioni da Smoobu con paginazione
    // Prende solo prenotazioni da oggi in avanti
    const today = new Date().toISOString().split("T")[0];
    let page = 1;
    const pageSize = 100;
    let allReservations: SmoobuReservation[] = [];
    let hasMore = true;

    while (hasMore) {
      const response = await smoobuGet(
        `/reservations?pageSize=${pageSize}&page=${page}&arrivalFrom=${today}`
      ) as SmoobuResponse;

      const reservations = response.data ?? [];
      allReservations = [...allReservations, ...reservations];

      console.log(
        `[smoobu-sync-reservations] Pagina ${page}/${response.total_pages}: ${reservations.length} prenotazioni`
      );

      if (page >= response.total_pages || reservations.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
    }

    console.log(
      `[smoobu-sync-reservations] Totale prenotazioni Smoobu: ${allReservations.length}`
    );

    // 2. Filtra solo prenotazioni esterne
    // Esclude: type "blocked" (blocchi manuali già gestiti da noi) e channelId 9999963 (prenotazioni dirette nostre)
    const externalReservations = allReservations.filter(
      (r) => r.type !== "blocked" && r.channelId !== 9999963
    );

    console.log(
      `[smoobu-sync-reservations] Prenotazioni esterne (Booking.com ecc.): ${externalReservations.length}`
    );

    // 3. Aggiorna blocked_dates — elimina vecchie righe ical e reinserisce
    // NON tocca source: stripe e source: manual
    const { error: deleteError } = await supabase
      .from("blocked_dates")
      .delete()
      .eq("source", "ical");

    if (deleteError) throw deleteError;

    if (externalReservations.length > 0) {
      const rows = externalReservations
        .map((r) => {
          const roomId = SMOOBU_TO_ROOM_MAP[r.apartmentId];
          if (!roomId) {
            console.warn(
              `[smoobu-sync-reservations] apartmentId ${r.apartmentId} non in mappa, skip`
            );
            return null;
          }
          return {
            room_id: roomId,
            date_from: r.arrival,
            date_to: r.departure,
            source: "ical",
            // Campo opzionale per debug — aggiungi colonna "note text" a blocked_dates se vuoi usarlo
            // note: `${r.channel?.name ?? "Canale sconosciuto"} — ${r.firstName} ${r.lastName}`,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      if (rows.length > 0) {
        const { error: insertError } = await supabase
          .from("blocked_dates")
          .insert(rows);
        if (insertError) throw insertError;
        console.log(`[smoobu-sync-reservations] ✓ ${rows.length} date bloccate aggiornate`);
      }
    }

    // 4. Formatta i dati per l'admin panel (vista prenotazioni esterne)
    const formattedForAdmin = externalReservations.map((r) => ({
      smoobu_id: r.id,
      room_id: SMOOBU_TO_ROOM_MAP[r.apartmentId] ?? `unknown-${r.apartmentId}`,
      room_name: r.apartment?.name ?? "Camera sconosciuta",
      check_in: r.arrival,
      check_out: r.departure,
      guest_name: `${r.firstName} ${r.lastName}`.trim(),
      guest_email: r.email,
      guest_phone: r.phone,
      guests: r.adults,
      total_price: r.price,
      channel: r.channel?.name ?? "Sconosciuto",
      source: "smoobu",
    }));

    return new Response(
      JSON.stringify({
        success: true,
        total_smoobu: allReservations.length,
        total_external: externalReservations.length,
        reservations: formattedForAdmin,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[smoobu-sync-reservations] Errore: ${message}`);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});