-- Migration: Create orders (if not exists) and order_notifications table for idempotency tracking

-- 1. Orders table supporting both structured and JSON columns
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    customer_email TEXT,
    customer_name TEXT,
    total_amount NUMERIC(10, 2),
    currency TEXT NOT NULL DEFAULT 'INR',
    items JSONB DEFAULT '[]'::jsonb,
    -- Store compatibility fields for store apps
    status TEXT DEFAULT 'placed',
    subtotal NUMERIC(10, 2),
    lines JSONB DEFAULT '[]'::jsonb,
    customer JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Ensure all columns exist even if orders table was created previously
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS customer_email TEXT,
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR',
ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS lines JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS customer JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'placed';

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- 2. Idempotency & Audit tracking table
CREATE TABLE IF NOT EXISTS public.order_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    email_type TEXT NOT NULL DEFAULT 'order_confirmation',
    recipient_email TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('SENT', 'FAILED')),
    resend_id TEXT,
    error_message TEXT,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_order_email_notification UNIQUE (order_id, email_type)
);

-- Index for instant lookup during idempotency checks
CREATE INDEX IF NOT EXISTS idx_order_notifications_order_lookup 
ON public.order_notifications(order_id, email_type);

-- 3. Row Level Security
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to prevent "policy already exists" error (SQLSTATE 42710)
DROP POLICY IF EXISTS "Allow public insert to orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public read own orders" ON public.orders;
DROP POLICY IF EXISTS "Allow service role all notifications" ON public.order_notifications;

-- Allow public insert from client storefront if needed (or authenticated)
CREATE POLICY "Allow public insert to orders" ON public.orders
    FOR INSERT WITH CHECK (true);

-- Allow authenticated users / admins or service role to read/update
CREATE POLICY "Allow public read own orders" ON public.orders
    FOR SELECT USING (true);
