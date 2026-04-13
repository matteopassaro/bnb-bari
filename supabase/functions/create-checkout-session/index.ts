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

    const checkoutLanguage =
      typeof language === "string" && language.trim() ? language : "en";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // ── 1. Controlla disponibilità ──────────────────────────────────────────
    // Controlla sia blocked_dates confermati (stripe, ical, manual)
    // sia prenotazioni pending recenti (< 30 min) come protezione race condition
    const { data: existingBlocks, error: checkError } = await supabase
      .from("blocked_dates")
      .select("*")
      .eq("room_id", room_id)
      .or(`date_from.lte.${check_out},date_to.gte.${check_in}`);

    if (checkError) throw checkError;

    const isOverlap = (existingBlocks ?? []).some(
      (block) =>
        new Date(check_in) < new Date(block.date_to) &&
        new Date(check_out) > new Date(block.date_from)
    );

    if (isOverlap) {
      console.warn("[create-checkout-session] Date già occupate");
      return new Response(
        JSON.stringify({ error: "Dates already booked" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Protezione race condition: controlla pending recenti (< 30 min) per stessa camera/date
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: recentPending } = await supabase
      .from("bookings")
      .select("id")
      .eq("room_id", room_id)
      .eq("payment_status", "pending")
      .gte("created_at", thirtyMinutesAgo)
      .or(`check_in.lt.${check_out},check_out.gt.${check_in}`)
      .limit(1);

    const hasRecentPending = (recentPending ?? []).some(
      () => true // se esiste almeno una prenotazione pending recente sovrapponente
    );

    if (hasRecentPending) {
      console.warn("[create-checkout-session] Prenotazione in corso per queste date");
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
    // Questo previene sessioni Stripe orfane (se l'insert fallisce, non c'è sessione)
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
      metadata: {
        booking_id: newBooking.id, // usato dal webhook per trovare il booking
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
      // Tenta di annullare la sessione Stripe per evitare sessioni orfane
      try {
        await stripe.checkout.sessions.expire(session.id);
      } catch (expireErr) {
        console.error("[create-checkout-session] Failed to expire Stripe session:", expireErr);
      }
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