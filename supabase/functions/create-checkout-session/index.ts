import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2022-11-15",
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log(`[create-checkout-session] Request received at ${new Date().toISOString()}`);

    const {
      room_id,
      room_name,
      check_in,
      check_out,
      guests,
      customer_name,
      customer_email,
      customer_phone,
      price_per_night,
      language,
    } = await req.json();

    // ── Validazione input di base ────────────────────────────────────────────
    if (!room_id || !check_in || !check_out || !customer_name || !customer_email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verifica che room_id sia un valore valido (non stringa vuota)
    const validRoomIds = ["camera-tripla-deluxe", "camera-matrimoniale", "monolocale-pietra"];
    if (!validRoomIds.includes(room_id)) {
      console.warn(`[create-checkout-session] Invalid room_id: "${room_id}"`);
      return new Response(
        JSON.stringify({ error: "Invalid room selection" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verifica che le date siano logicamente valide
    if (new Date(check_out) <= new Date(check_in)) {
      return new Response(
        JSON.stringify({ error: "Check-out must be after check-in" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const checkoutLanguage =
      typeof language === "string" && language.trim() ? language : "en";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // ── 1a. Check blocked_dates (sovrapposizione corretta: AND, non OR) ──────
    // La sovrapposizione tra [A,B) e [C,D) esiste se: A < D AND B > C
    const { data: existingBlocks, error: checkError } = await supabase
      .from("blocked_dates")
      .select("id, date_from, date_to, source")
      .eq("room_id", room_id)
      .lt("date_from", check_out)   // block_start < new_check_out
      .gt("date_to", check_in);     // block_end   > new_check_in

    if (checkError) throw checkError;

    if ((existingBlocks ?? []).length > 0) {
      console.warn(`[create-checkout-session] Dates blocked for room ${room_id}: ${check_in} → ${check_out}`);
      return new Response(
        JSON.stringify({ error: "Dates already booked" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 1b. Check prenotazioni già pagate (stessa logica AND) ────────────────
    const { data: paidBookings, error: paidError } = await supabase
      .from("bookings")
      .select("id, check_in, check_out")
      .eq("room_id", room_id)
      .eq("payment_status", "paid")
      .lt("check_in", check_out)   // paid_check_in < new_check_out
      .gt("check_out", check_in);  // paid_check_out > new_check_in

    if (paidError) throw paidError;

    if ((paidBookings ?? []).length > 0) {
      console.warn(`[create-checkout-session] Paid booking overlap for room ${room_id}: ${check_in} → ${check_out}`);
      return new Response(
        JSON.stringify({ error: "Dates already booked" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 1c. Protezione race condition: pending recenti (< 15 min) ────────────
    // FIX: usa AND (catena .lt().gt()) invece di .or() che era sempre true
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    const { data: recentPending, error: pendingError } = await supabase
      .from("bookings")
      .select("id")
      .eq("room_id", room_id)
      .eq("payment_status", "pending")
      .gte("created_at", fifteenMinutesAgo)
      .lt("check_in", check_out)   // AND semantics — overlap corretto
      .gt("check_out", check_in)
      .limit(1);

    if (pendingError) {
      // Non bloccare per errori non critici su questo check
      console.warn("[create-checkout-session] Warning: pending check failed:", pendingError);
    } else if ((recentPending ?? []).length > 0) {
      console.warn(`[create-checkout-session] Recent pending booking overlap for room ${room_id}`);
      return new Response(
        JSON.stringify({ error: "Dates temporarily reserved. Please try again in a moment." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const nights = Math.ceil(
      (new Date(check_out).getTime() - new Date(check_in).getTime()) / (1000 * 3600 * 24)
    );
    const totalAmount = price_per_night * nights;

    // ── 2. Crea booking pending PRIMA della sessione Stripe ──────────────────
    const { data: newBooking, error: insertError } = await supabase
      .from("bookings")
      .insert({
        room_id,
        room_name,
        check_in,
        check_out,
        guests,
        customer_name,
        customer_email,
        customer_phone,
        total_price: totalAmount,
        payment_status: "pending",
      })
      .select()
      .single();

    if (insertError || !newBooking) {
      // Il DB EXCLUDE constraint può rigettare l'insert se c'è overlap simultaneo
      // (race condition residua tra i check e l'insert — ultimo livello di difesa)
      if (insertError?.code === "23P01") {
        // exclusion_violation
        console.warn("[create-checkout-session] DB exclusion constraint triggered for room", room_id);
        return new Response(
          JSON.stringify({ error: "Dates already booked" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("[create-checkout-session] Insert booking error:", insertError);
      throw insertError ?? new Error("Failed to create booking");
    }

    console.log(`[create-checkout-session] Booking pending creato: ${newBooking.id}`);

    // ── 3. Crea sessione Stripe ──────────────────────────────────────────────
    const origin = req.headers.get("origin") || "http://localhost:5173";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Prenotazione: ${room_name}`,
              description: `Dal ${check_in} al ${check_out} (${nights} notti)`,
            },
            unit_amount: Math.round(price_per_night * 100),
          },
          quantity: nights,
        },
      ],
      mode: "payment",
      customer_email: customer_email,
      // Stripe session scade dopo 30 min — allineato al TTL pending (15 min + margine)
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      metadata: {
        booking_id: newBooking.id,
        room_id,
        room_name,
        check_in,
        check_out,
        guests: guests.toString(),
        customer_name,
        customer_email,
        customer_phone,
        total_price: totalAmount.toString(),
        language: checkoutLanguage,
      },
      success_url: `${origin}/prenotazione-confermata?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/prenota`,
    });

    // ── 4. Aggiorna booking con stripe_session_id ────────────────────────────
    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        stripe_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent ?? null,
      })
      .eq("id", newBooking.id);

    if (updateError) {
      console.error("[create-checkout-session] Update stripe_session_id error:", updateError);
      try {
        await stripe.checkout.sessions.expire(session.id);
      } catch (expireErr) {
        console.error("[create-checkout-session] Failed to expire Stripe session:", expireErr);
      }
      // Rimuovi anche il booking pending orfano
      await supabase.from("bookings").delete().eq("id", newBooking.id);
      throw updateError;
    }

    console.log(`[create-checkout-session] ✓ Sessione Stripe ${session.id} collegata al booking ${newBooking.id}`);

    return new Response(
      JSON.stringify({ session_url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("[create-checkout-session] Internal Error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});