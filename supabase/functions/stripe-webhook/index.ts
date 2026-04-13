import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2022-11-15",
  httpClient: Stripe.createFetchHttpClient(),
});

const RESEND_SECRET_KEY = Deno.env.get("RESEND_SECRET_KEY");
const OWNER_EMAIL = Deno.env.get("OWNER_EMAIL");
const FROM_EMAIL = "Corte del Borgo Antico <noreply@matteopassaro.dev>";

// ─── Traduzioni email ospite ──────────────────────────────────────────────────
const translations = {
  it: {
    subject: "Prenotazione confermata — Corte del Borgo Antico",
    heading: "Prenotazione Confermata",
    subtitle: "Corte del Borgo Antico · Bari",
    greeting: "Ciao",
    confirmed: "La tua prenotazione è confermata e il pagamento è stato ricevuto. Non vediamo l'ora di accoglierti a Bari!",
    details: "Dettagli soggiorno",
    room: "Camera",
    checkIn: "Check-in",
    checkOut: "Check-out",
    nights: "Notti",
    guests: "Ospiti",
    total: "Totale pagato",
    address: "Indirizzo",
    bookingNumber: "N° Prenotazione",
    contact: "Per qualsiasi necessità rispondi a questa email o contattaci direttamente.",
    signoff: "A presto",
  },
  en: {
    subject: "Booking confirmed — Corte del Borgo Antico",
    heading: "Booking Confirmed",
    subtitle: "Corte del Borgo Antico · Bari",
    greeting: "Hello",
    confirmed: "Your booking is confirmed and payment has been received. We can't wait to welcome you to Bari!",
    details: "Stay details",
    room: "Room",
    checkIn: "Check-in",
    checkOut: "Check-out",
    nights: "Nights",
    guests: "Guests",
    total: "Total paid",
    address: "Address",
    bookingNumber: "Booking No.",
    contact: "If you need anything, just reply to this email or contact us directly.",
    signoff: "See you soon",
  },
} as const;

type SupportedLang = keyof typeof translations;

const normalizeLang = (lang?: string): SupportedLang => {
  const l = (lang ?? "").toLowerCase().trim();
  if (l.startsWith("it")) return "it";
  return "en";
};

// ─── Handler ──────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  console.log(`[stripe-webhook] Request received at ${new Date().toISOString()}`);

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    console.error("[stripe-webhook] Missing signature");
    return new Response("Missing signature", { status: 400 });
  }

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret || webhookSecret === "whsec_placeholder") {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET missing or placeholder");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    console.log(`[stripe-webhook] Event: ${event.type} (${event.id})`);
  } catch (err: any) {
    console.error("[stripe-webhook] Signature verification failed:", err?.message);
    return new Response(`Webhook Error: ${err?.message}`, { status: 400 });
  }

  const processEvent = async (event: Stripe.Event): Promise<Response | undefined> => {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    try {
      // ── checkout.session.completed ─────────────────────────────────────────
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata;
        if (!metadata) return;

        // 1. Idempotency check
        const { data: existing } = await supabase
          .from("bookings")
          .select("*")
          .eq("stripe_session_id", session.id)
          .single();

        if (existing?.payment_status === "paid") {
          console.log(`[stripe-webhook] Already paid, skipping (${existing.id})`);
          return;
        }

        // 2. Update booking → paid
        const { data: booking, error: updateError } = await supabase
          .from("bookings")
          .update({
            payment_status: "paid",
            stripe_payment_intent_id:
              (session.payment_intent as string) || existing?.stripe_payment_intent_id,
          })
          .eq("stripe_session_id", session.id)
          .select()
          .single();

        if (updateError || !booking) {
          console.error("[stripe-webhook] Update error:", updateError);
          throw updateError;
        }

        // 3. Blocca date su Supabase (only if not already exists - might have been created in create-checkout-session)
        const { data: existingBlock } = await supabase
          .from("blocked_dates")
          .select("id")
          .eq("room_id", metadata.room_id)
          .eq("date_from", metadata.check_in)
          .eq("date_to", metadata.check_out)
          .eq("source", "stripe")
          .single();

        if (!existingBlock) {
          const { error: blockError } = await supabase.from("blocked_dates").insert({
            room_id: metadata.room_id,
            date_from: metadata.check_in,
            date_to: metadata.check_out,
            source: "stripe",
          });
          if (blockError) console.error("[stripe-webhook] Block dates error:", blockError);
          else console.log("[stripe-webhook] Dates blocked successfully");
        } else {
          console.log("[stripe-webhook] Dates already blocked (created in checkout)");
        }

        // 4. Propaga su Smoobu (con retry)
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const maxRetries = 3;
        const baseDelay = 1000;
        let smoobuSuccess = false;
        let lastSmoobuError = null;

        for (let attempt = 1; attempt <= maxRetries && !smoobuSuccess; attempt++) {
          try {
            const res = await fetch(`${supabaseUrl}/functions/v1/smoobu-create-reservation`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                booking_id: booking.id,
                room_id: booking.room_id,
                check_in: booking.check_in,
                check_out: booking.check_out,
                guests: booking.guests,
                customer_name: booking.customer_name,
                customer_email: booking.customer_email,
                customer_phone: booking.customer_phone,
                total_price: booking.total_price,
              }),
            });
            const responseBody = await res.text();
            console.log(`[stripe-webhook] Smoobu response (attempt ${attempt}): ${res.status}`, responseBody);
            if (!res.ok) throw new Error(`Smoobu API error: ${res.status} - ${responseBody}`);
            smoobuSuccess = true;
            console.log(`[stripe-webhook] Smoobu reservation created (attempt ${attempt})`);
          } catch (err) {
            lastSmoobuError = err;
            console.error(`[stripe-webhook] Smoobu attempt ${attempt} failed:`, err);
            if (attempt < maxRetries) {
              await new Promise((r) => setTimeout(r, baseDelay * attempt));
            }
          }
        }

        if (!smoobuSuccess) {
          console.error("[stripe-webhook] Smoobu sync failed after all retries:", lastSmoobuError);
        }

        // 5. Email (solo se non già inviate)
        if (RESEND_SECRET_KEY && !booking.email_sent) {
          const lang = normalizeLang(metadata.language);
          const t = translations[lang];

          const nights = Math.ceil(
            (new Date(metadata.check_out).getTime() -
              new Date(metadata.check_in).getTime()) /
              (1000 * 3600 * 24)
          );

          const guestHtml = `
            <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #1a1a2e;">
              <div style="background: #2a9d8f; padding: 32px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">${t.heading}</h1>
                <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0;">${t.subtitle}</p>
              </div>
              <div style="padding: 32px; background: #ffffff;">
                <p style="font-size: 18px;">${t.greeting} <strong>${metadata.customer_name}</strong>,</p>
                <p>${t.confirmed}</p>
                <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; margin: 24px 0;">
                  <h2 style="margin: 0 0 16px; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; color: #2a9d8f;">${t.details}</h2>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 8px 0; color: #666;">${t.room}</td><td style="padding: 8px 0; font-weight: bold; text-align: right;">${metadata.room_name}</td></tr>
                    <tr><td style="padding: 8px 0; color: #666;">${t.checkIn}</td><td style="padding: 8px 0; font-weight: bold; text-align: right;">${metadata.check_in}</td></tr>
                    <tr><td style="padding: 8px 0; color: #666;">${t.checkOut}</td><td style="padding: 8px 0; font-weight: bold; text-align: right;">${metadata.check_out}</td></tr>
                    <tr><td style="padding: 8px 0; color: #666;">${t.nights}</td><td style="padding: 8px 0; font-weight: bold; text-align: right;">${nights}</td></tr>
                    <tr><td style="padding: 8px 0; color: #666;">${t.guests}</td><td style="padding: 8px 0; font-weight: bold; text-align: right;">${metadata.guests}</td></tr>
                    <tr style="border-top: 2px solid #e0e0e0;">
                      <td style="padding: 16px 0 8px; font-weight: bold; font-size: 16px;">${t.total}</td>
                      <td style="padding: 16px 0 8px; font-weight: bold; font-size: 18px; color: #2a9d8f; text-align: right;">€${metadata.total_price}</td>
                    </tr>
                  </table>
                </div>
                <div style="background: #f0faf9; border-left: 4px solid #2a9d8f; padding: 16px; border-radius: 4px; margin: 16px 0;">
                  <p style="margin: 0; font-size: 14px;"><strong>📍 ${t.address}:</strong> Corte Morgese 18, 70121 Bari (BA)</p>
                  <p style="margin: 8px 0 0; font-size: 14px;"><strong>🔖 ${t.bookingNumber}:</strong> #${booking.id}</p>
                </div>
                <p style="color: #666; font-size: 14px;">${t.contact}</p>
                <p>${t.signoff},<br><strong>Corte del Borgo Antico</strong></p>
              </div>
              <div style="padding: 16px; text-align: center; color: #999; font-size: 12px;">
                Corte Morgese 18, Bari · Italy
              </div>
            </div>`;

          const ownerHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2a9d8f;">Nuova prenotazione ricevuta</h2>
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr><td style="padding: 8px; color: #666; width: 40%;">Ospite</td><td style="padding: 8px; font-weight: bold;">${metadata.customer_name}</td></tr>
                <tr style="background:#f8f9fa;"><td style="padding: 8px; color: #666;">Email</td><td style="padding: 8px;">${metadata.customer_email}</td></tr>
                <tr><td style="padding: 8px; color: #666;">Telefono</td><td style="padding: 8px;">${metadata.customer_phone || "—"}</td></tr>
                <tr style="background:#f8f9fa;"><td style="padding: 8px; color: #666;">Camera</td><td style="padding: 8px; font-weight: bold;">${metadata.room_name}</td></tr>
                <tr><td style="padding: 8px; color: #666;">Check-in</td><td style="padding: 8px;">${metadata.check_in}</td></tr>
                <tr style="background:#f8f9fa;"><td style="padding: 8px; color: #666;">Check-out</td><td style="padding: 8px;">${metadata.check_out}</td></tr>
                <tr><td style="padding: 8px; color: #666;">Notti</td><td style="padding: 8px;">${nights}</td></tr>
                <tr style="background:#f8f9fa;"><td style="padding: 8px; color: #666;">Ospiti</td><td style="padding: 8px;">${metadata.guests}</td></tr>
                <tr style="border-top: 2px solid #2a9d8f;">
                  <td style="padding: 12px 8px; font-weight: bold;">Totale incassato</td>
                  <td style="padding: 12px 8px; font-weight: bold; color: #2a9d8f; font-size: 18px;">€${metadata.total_price}</td>
                </tr>
              </table>
              <p style="font-size: 12px; color: #999;">ID Prenotazione: #${booking.id}</p>
            </div>`;

          const [guestRes, ownerRes] = await Promise.all([
            fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_SECRET_KEY}`,
              },
              body: JSON.stringify({
                from: FROM_EMAIL,
                to: [metadata.customer_email],
                subject: t.subject,
                html: guestHtml,
              }),
            }),
            OWNER_EMAIL
              ? fetch("https://api.resend.com/emails", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${RESEND_SECRET_KEY}`,
                  },
                  body: JSON.stringify({
                    from: FROM_EMAIL,
                    to: [OWNER_EMAIL],
                    subject: `Nuova prenotazione — ${metadata.customer_name} (${metadata.check_in} → ${metadata.check_out})`,
                    html: ownerHtml,
                  }),
                })
              : Promise.resolve(null),
          ]);

          console.log(
            `[stripe-webhook] Guest email: ${guestRes.status}, Owner email: ${ownerRes?.status ?? "skipped"}`
          );

          // Marca email come inviate SOLO se entrambe hanno avuto successo
          const guestOk = guestRes.ok;
          const ownerOk = !OWNER_EMAIL || (ownerRes?.ok ?? false);
          if (guestOk) {
            await supabase
              .from("bookings")
              .update({ email_sent: true })
              .eq("id", booking.id);
            console.log("[stripe-webhook] email_sent flag updated");
          } else {
            console.error("[stripe-webhook] Email failed, not marking as sent");
          }
        }

      // ── charge.refunded ────────────────────────────────────────────────────
      } else if (event.type === "charge.refunded") {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = charge.payment_intent as string;

        const { data: booking } = await supabase
          .from("bookings")
          .select("*")
          .eq("stripe_payment_intent_id", paymentIntentId)
          .single();

        if (!booking) {
          console.error("[stripe-webhook] Booking not found for refund:", paymentIntentId);
          return;
        }

        await supabase
          .from("bookings")
          .update({ payment_status: "refunded" })
          .eq("id", booking.id);

        await supabase
          .from("blocked_dates")
          .delete()
          .eq("room_id", booking.room_id)
          .eq("date_from", booking.check_in)
          .eq("date_to", booking.check_out)
          .eq("source", "stripe");

        // Cancella prenotazione su Smoobu
        if (booking.smoobu_reservation_id) {
          const supabaseUrl = Deno.env.get("SUPABASE_URL");
          const maxRetries = 3;
          const baseDelay = 1000;
          let smoobuSuccess = false;

          for (let attempt = 1; attempt <= maxRetries && !smoobuSuccess; attempt++) {
            try {
              const res = await fetch(
                `${supabaseUrl}/functions/v1/smoobu-cancel-reservation`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    reservation_id: booking.smoobu_reservation_id,
                    room_id: booking.room_id,
                  }),
                }
              );
              const responseBody = await res.text();
              console.log(
                `[stripe-webhook] Smoobu cancel response (attempt ${attempt}): ${res.status}`,
                responseBody
              );
              if (!res.ok) throw new Error(`Smoobu cancel error: ${res.status} - ${responseBody}`);
              smoobuSuccess = true;
              console.log(
                `[stripe-webhook] Smoobu reservation cancelled (attempt ${attempt})`
              );
            } catch (err) {
              console.error(`[stripe-webhook] Smoobu cancel attempt ${attempt} failed:`, err);
              if (attempt < maxRetries) {
                await new Promise((r) => setTimeout(r, baseDelay * attempt));
              }
            }
          }

          if (!smoobuSuccess) {
            throw new Error("Failed to cancel Smoobu reservation after all retries");
          }
        }

        if (RESEND_SECRET_KEY) {
          await Promise.all([
            fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_SECRET_KEY}`,
              },
              body: JSON.stringify({
                from: FROM_EMAIL,
                to: [booking.customer_email],
                subject: "Prenotazione cancellata — Corte del Borgo Antico",
                html: `
                  <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
                    <h2>Prenotazione Cancellata</h2>
                    <p>Gentile <strong>${booking.customer_name}</strong>,</p>
                    <p>La tua prenotazione <strong>#${booking.id}</strong> per <strong>${booking.room_name}</strong> è stata cancellata e il rimborso di <strong>€${booking.total_price}</strong> è stato emesso.</p>
                    <p>I tempi di accredito dipendono dal tuo istituto bancario (solitamente 5-10 giorni lavorativi).</p>
                    <p>Speriamo di rivederti presto a Bari.<br><strong>Corte del Borgo Antico</strong></p>
                  </div>`,
              }),
            }),
            OWNER_EMAIL
              ? fetch("https://api.resend.com/emails", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${RESEND_SECRET_KEY}`,
                  },
                  body: JSON.stringify({
                    from: FROM_EMAIL,
                    to: [OWNER_EMAIL],
                    subject: `Rimborso emesso — ${booking.customer_name}`,
                    html: `<p>Rimborso di <strong>€${booking.total_price}</strong> emesso per la prenotazione #${booking.id} (${booking.customer_name}, ${booking.room_name}).</p>`,
                  }),
                })
              : Promise.resolve(null),
          ]);
          console.log("[stripe-webhook] Refund emails sent");
        }
      }
    } catch (err: any) {
      console.error("[stripe-webhook] Processing error:", err?.message || err);
      return new Response(
        JSON.stringify({ error: "Processing failed", details: err?.message }),
        { status: 500 }
      );
    }
  };

  if (typeof (globalThis as any).EdgeRuntime !== "undefined") {
    (globalThis as any).EdgeRuntime.waitUntil(processEvent(event));
  } else {
    const processResult = await processEvent(event);
    if (processResult) return processResult;
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});