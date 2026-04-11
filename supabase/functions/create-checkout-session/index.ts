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

    const checkoutLanguage = typeof language === "string" && language.trim() ? language : "en";
    
    console.log(`[create-checkout-session] Checking availability for room ${room_id} (${check_in} to ${check_out})`);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Double check availability
    const { data: existingBlocks, error: checkError } = await supabaseClient
      .from("blocked_dates")
      .select("*")
      .eq("room_id", room_id)
      .or(`date_from.lte.${check_out},date_to.gte.${check_in}`);

    if (checkError) {
      console.error("[create-checkout-session] Error checking availability:", checkError);
      throw checkError;
    }
    
    // Strict overlap check
    const isOverlap = (existingBlocks as any[] || []).some(block => {
        return (new Date(check_in) < new Date(block.date_to) && new Date(check_out) > new Date(block.date_from));
    });

    if (isOverlap) {
      console.warn("[create-checkout-session] Dates already booked/overlap detected");
      return new Response(JSON.stringify({ error: "Dates already booked" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const checkInDate = new Date(check_in);
    const checkOutDate = new Date(check_out);
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 3600 * 24));
    const totalAmount = price_per_night * nights;

    console.log(`[create-checkout-session] Creating Stripe Session for €${totalAmount} (${nights} nights)...`);

    // 2. Create Stripe Session
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

    console.log(`[create-checkout-session] Stripe Session created: ${session.id}. Saving to Supabase...`);

    // 3. Insert pending booking
    const { error: insertError } = await supabaseClient.from("bookings").insert({
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
      stripe_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent as string | undefined,
    });

    if (insertError) {
      console.error("[create-checkout-session] Error inserting booking:", insertError);
      throw insertError;
    }
    
    console.log(`[create-checkout-session] Booking inserted successfully. Returning session URL.`);

    return new Response(JSON.stringify({ session_url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[create-checkout-session] Internal Error:", err?.message || err);
    return new Response(JSON.stringify({ error: err?.message || "Internal Server Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
