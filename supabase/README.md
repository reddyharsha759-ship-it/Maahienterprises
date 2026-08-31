# MAAHI PRODUCTS - Supabase Order Confirmation Email Pipeline

This folder contains the Edge Function and SQL migration to send transactional order confirmation emails via **Resend** whenever an order is inserted into your Supabase database.

---

## 📁 Files Created

1. [supabase/functions/send-order-email/index.ts](file:///c:/Users/harsh/.gemini/antigravity/scratch/MAAHI%20PRODUCTS/supabase/functions/send-order-email/index.ts): Deno / TypeScript Edge Function with idempotency check, modern HTML email generator, and Resend delivery.
2. [supabase/schema.sql](file:///c:/Users/harsh/.gemini/antigravity/scratch/MAAHI%20PRODUCTS/supabase/schema.sql): Database migration and secure RLS policies.
3. [supabase/.env.example](file:///c:/Users/harsh/.gemini/antigravity/scratch/MAAHI%20PRODUCTS/supabase/.env.example): Environment variable template.

---

## 🚀 Quick Setup & Deployment Guide

### Step 1: Run the Database Migration
1. Go to your **[Supabase Dashboard](https://supabase.com/dashboard/project/cgcaqmhgoshbkmwswgvy)** &rarr; **SQL Editor**.
2. Copy and run the contents of [supabase/schema.sql](file:///c:/Users/harsh/.gemini/antigravity/scratch/MAAHI%20PRODUCTS/supabase/schema.sql).

### Step 2: Set Secrets in Supabase
Run the following in your project terminal (replace values with your real keys):

```bash
# 1. Login to Supabase CLI (if not already logged in)
npx supabase login

# 2. Link your local project to your remote Supabase instance
npx supabase link --project-ref cgcaqmhgoshbkmwswgvy

# 3. Set your production secrets
npx supabase secrets set RESEND_API_KEY="re_YOUR_RESEND_API_KEY"
npx supabase secrets set RESEND_FROM_EMAIL="MAAHI PRODUCTS <orders@yourverifieddomain.com>"
npx supabase secrets set WEBHOOK_SECRET="maahi_whsec_secure_random_key_2026"
```

### Step 3: Deploy the Edge Function

```bash
npx supabase functions deploy send-order-email --no-verify-jwt
```

---

## 🔔 Step 4: Configure Database Webhook

1. Open your Supabase project dashboard: [Integrations / Database Webhooks](https://supabase.com/dashboard/project/cgcaqmhgoshbkmwswgvy/database/hooks).
2. Click **Create a new hook** / **Create Webhook**.
3. Fill in the parameters:
   - **Name**: `send-order-confirmation-email`
   - **Table**: `public.orders`
   - **Events**: Check **`Insert`** only.
   - **Type of Webhook**: Choose **Supabase Edge Functions**.
   - **Edge Function**: Select `send-order-email`.
   - **HTTP Method**: `POST`
4. Under **HTTP Headers**, click **Add Header**:
   - **Name**: `x-webhook-secret`
   - **Value**: `maahi_whsec_secure_random_key_2026` (must match the `WEBHOOK_SECRET` you set in Step 2).
5. Click **Create Webhook**.

---

## 🧪 Step 5: Test the Flow

Run this test SQL in your Supabase SQL editor:

```sql
INSERT INTO public.orders (
    id,
    customer_email,
    customer_name,
    total_amount,
    currency,
    items,
    customer,
    lines,
    subtotal
) VALUES (
    'ORD-' || floor(random() * 90000 + 10000)::text,
    'your-test-email@gmail.com',
    'Harsha Reddy',
    1850.00,
    'INR',
    '[
        {"name": "Coco Peat 5kg Block (Low EC)", "quantity": 2, "unit_price": 450.00},
        {"name": "Premium Vermicompost (10kg)", "quantity": 1, "unit_price": 950.00}
    ]'::jsonb,
    '{"name": "Harsha Reddy", "email": "your-test-email@gmail.com", "address": "Bengaluru, India"}'::jsonb,
    '[
        {"name": "Coco Peat 5kg Block (Low EC)", "quantity": 2, "price": 450.00, "lineTotal": 900.00},
        {"name": "Premium Vermicompost (10kg)", "quantity": 1, "price": 950.00, "lineTotal": 950.00}
    ]'::jsonb,
    1850.00
);
```

Check your inbox and audit logs:
```sql
SELECT * FROM public.order_notifications ORDER BY sent_at DESC;
```
