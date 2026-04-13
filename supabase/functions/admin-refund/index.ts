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

  try {
    // 1. Verifica autenticazione
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user || user.email !== "noreply@matteopassaro.dev") {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    // 2. Prendi booking_id dal body
    const { booking_id } = await req.json();
    if (!booking_id) return new Response(JSON.stringify({ error: "Missing booking_id" }), { status: 400, headers: corsHeaders });

    // 3. Fetcha booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), { status: 404, headers: corsHeaders });
    }

    if (!booking.stripe_payment_intent_id) {
      return new Response(JSON.stringify({ error: "No payment intent found for this booking" }), { status: 400, headers: corsHeaders });
    }

    if (booking.payment_status === "refunded") {
      return new Response(JSON.stringify({ error: "Already refunded" }), { status: 400, headers: corsHeaders });
    }

    // 4. Crea rimborso su Stripe
    const refund = await stripe.refunds.create({
      payment_intent: booking.stripe_payment_intent_id,
    });

    console.log(`[admin-refund] Refund created: ${refund.id} for booking ${booking_id}`);

    // Il webhook charge.refunded pensa al resto (aggiorna DB, manda email, libera date)
    return new Response(JSON.stringify({ success: true, refund_id: refund.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("[admin-refund] Error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});