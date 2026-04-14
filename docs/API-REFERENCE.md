# API Reference - Edge Functions

## Overview

All edge functions are deployed on Supabase and accessible at:
```
https://rjdeysumimomzlylqikf.supabase.co/functions/v1/{function-name}
```

---

## Authentication

| Function | Auth Type | Headers Required |
|----------|------------|------------------|
| create-checkout-session | None | None |
| stripe-webhook | Stripe Signature | stripe-signature |
| admin-refund | Supabase Auth | Authorization: Bearer {token} |
| smoobu-sync-reservations | Supabase Auth | Authorization: Bearer {token} |
| smoobu-create-reservation | Internal | None |
| smoobu-cancel-reservation | Internal | None |

---

## 1. create-checkout-session

Creates a Stripe checkout session for a new booking.

### Request

```http
POST /functions/v1/create-checkout-session
Content-Type: application/json

{
  "room_id": "camera-tripla-deluxe",
  "room_name": "Camera Tripla Deluxe",
  "check_in": "2026-04-20",
  "check_out": "2026-04-22",
  "guests": 2,
  "customer_name": "Mario Rossi",
  "customer_email": "mario@example.com",
  "customer_phone": "+393331234567",
  "price_per_night": 95,
  "language": "it"
}
```

### Response (Success)

```json
{
  "session_url": "https://checkout.stripe.com/pay/cs_test_..."
}
```

### Response (Error - Dates Booked)

```json
{
  "error": "Dates already booked by another user. Please try different dates."
}
```

### Response (Error - Other)

```json
{
  "error": "Internal Server Error"
}
```

---

## 2. stripe-webhook

Handles Stripe webhook events. This is a POST endpoint called by Stripe's servers.

### Headers

```
stripe-signature: t=1234567890,v1=abc123...
Content-Type: application/json
```

### Events Handled

#### checkout.session.completed

```json
{
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_...",
      "payment_intent": "pi_...",
      "customer_email": "mario@example.com",
      "metadata": {
        "booking_id": "uuid-...",
        "room_id": "camera-tripla-deluxe",
        "room_name": "Camera Tripla Deluxe",
        "check_in": "2026-04-20",
        "check_out": "2026-04-22",
        "guests": "2",
        "customer_name": "Mario Rossi",
        "customer_email": "mario@example.com",
        "customer_phone": "+393331234567",
        "total_price": "190",
        "language": "it"
      }
    }
  }
}
```

#### charge.refunded

```json
{
  "type": "charge.refunded",
  "data": {
    "object": {
      "payment_intent": "pi_..."
    }
  }
}
```

### Response

```json
{
  "received": true
}
```

---

## 3. admin-refund

Processes a refund for a booking (called from Admin dashboard).

### Request

```http
POST /functions/v1/admin-refund
Content-Type: application/json
Authorization: Bearer {supabase_token}

{
  "booking_id": "uuid-of-booking"
}
```

### Response (Success)

```json
{
  "success": true,
  "refund_id": "re_...",
  "message": "Refund processed successfully"
}
```

### Response (Error)

```json
{
  "error": "Booking not found or not eligible for refund"
}
```

---

## 4. smoobu-sync-reservations

Imports external bookings from Smoobu (Booking.com, Airbnb, etc.).

### Request

```http
POST /functions/v1/smoobu-sync-reservations
Content-Type: application/json
Authorization: Bearer {supabase_token}
```

(No body required)

### Response (Success)

```json
{
  "success": true,
  "total_smoobu": 5,
  "total_external": 3,
  "reservations": [
    {
      "smoobu_id": 135463922,
      "room_id": "camera-tripla-deluxe",
      "room_name": "Camera Tripla Deluxe",
      "check_in": "2026-04-16",
      "check_out": "2026-04-17",
      "guest_name": "John Doe",
      "guest_email": "john@example.com",
      "guest_phone": "+393331234567",
      "guests": 2,
      "total_price": 95,
      "channel": "Direct booking",
      "source": "smoobu"
    }
  ]
}
```

### Response (Error)

```json
{
  "error": "Smoobu API error: 401 Unauthorized"
}
```

---

## 5. smoobu-create-reservation

Creates a reservation in Smoobu after successful payment (internal function).

### Request

```http
POST /functions/v1/smoobu-create-reservation
Content-Type: application/json

{
  "booking_id": "uuid-of-booking",
  "room_id": "camera-tripla-deluxe",
  "check_in": "2026-04-20",
  "check_out": "2026-04-22",
  "guests": 2,
  "customer_name": "Mario Rossi",
  "customer_email": "mario@example.com",
  "customer_phone": "+393331234567",
  "total_price": 190
}
```

### Response (Success)

```json
{
  "success": true,
  "smoobu_reservation_id": 135463922
}
```

### Response (Error)

```json
{
  "error": "Smoobu API 400: Failed validation"
}
```

---

## 6. smoobu-cancel-reservation

Cancels a reservation in Smoobu after refund (internal function).

### Request

```http
POST /functions/v1/smoobu-cancel-reservation
Content-Type: application/json

{
  "reservation_id": 135463922,
  "room_id": "camera-tripla-deluxe"
}
```

### Response (Success)

```json
{
  "success": true,
  "reservation_id": 135463922
}
```

### Response (Error)

```json
{
  "error": "Smoobu API error: 404 Not found"
}
```

---

## Error Codes

| Code | Meaning |
|------|----------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Missing/invalid auth |
| 500 | Internal Server Error - Check logs |

---

## Rate Limits

- create-checkout-session: 100 requests/minute
- stripe-webhook: No limit (Stripe retries on 5xx)
- admin-refund: 50 requests/minute
- smoobu-sync-reservations: 10 requests/minute

---

*API Reference v1.0.0*