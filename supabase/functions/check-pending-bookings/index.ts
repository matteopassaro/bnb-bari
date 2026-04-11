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
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  console.log(`[check-pending-bookings] Started at ${new Date().toISOString()}`);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: pendingBookings, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("payment_status", "pending")
      .not("stripe_session_id", "is", null);

    if (error) throw error;

    console.log(`[check-pending-bookings] Found ${pendingBookings?.length ?? 0} pending bookings`);

    let completed = 0;
    let expired = 0;

    for (const booking of pendingBookings ?? []) {
      try {
        const session = await stripe.checkout.sessions.retrieve(booking.stripe_session_id);

        if (session.status === "complete" || session.payment_status === "paid") {
          // Aggiorna solo stato e date — le email le manda stripe-webhook
          // Se email_sent è false qui significa che il webhook ha fallito davvero
          // In quel caso logghiamo ma NON mandiamo email per evitare duplicati
          // TODO futuro: se email_sent === false dopo 1h → considera invio fallback
          await supabase.from("bookings").update({
            payment_status: "paid",
            stripe_payment_intent_id: session.payment_intent as string || booking.stripe_payment_intent_id,
          }).eq("id", booking.id);

          // Blocca date solo se non già bloccate
          const { data: existing } = await supabase
            .from("blocked_dates")
            .select("id")
            .eq("room_id", booking.room_id)
            .eq("date_from", booking.check_in)
            .eq("date_to", booking.check_out)
            .eq("source", "stripe")
            .single();

          if (!existing) {
            await supabase.from("blocked_dates").insert({
              room_id: booking.room_id,
              date_from: booking.check_in,
              date_to: booking.check_out,
              source: "stripe",
            });
          }

          console.log(`[check-pending-bookings] Reconciled booking ${booking.id} (email_sent: ${booking.email_sent})`);
          completed++;

        } else if (session.status === "expired") {
          await supabase.from("bookings").update({ payment_status: "expired" }).eq("id", booking.id);
          console.log(`[check-pending-bookings] Marked ${booking.id} as expired`);
          expired++;
        }
      } catch (err) {
        console.error(`[check-pending-bookings] Error on booking ${booking.id}:`, err);
      }
    }

    return new Response(JSON.stringify({ success: true, completed, expired }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[check-pending-bookings] Critical error:", err);
    return new Response(JSON.stringify({ error: err?.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});