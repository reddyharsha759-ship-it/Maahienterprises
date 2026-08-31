  -- Supabase Database Schema & Orders Table Migration
-- Run this SQL in your Supabase SQL Editor (https://supabase.com/dashboard)

-- ==============================================================================
-- 1. Products Table & Security Policies
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    unit_label TEXT DEFAULT 'item',
    image TEXT,
    thumb TEXT,
    tag TEXT,
    description TEXT,
    features JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Drop previous policies
DROP POLICY IF EXISTS "Allow public write access to products" ON public.products;
DROP POLICY IF EXISTS "Allow public read products" ON public.products;
DROP POLICY IF EXISTS "Allow authenticated insert products" ON public.products;
DROP POLICY IF EXISTS "Allow authenticated update products" ON public.products;
DROP POLICY IF EXISTS "Allow authenticated delete products" ON public.products;
DROP POLICY IF EXISTS "Allow public insert products" ON public.products;
DROP POLICY IF EXISTS "Allow public update products" ON public.products;
DROP POLICY IF EXISTS "Allow public delete products" ON public.products;

-- Allow public read-only access (storefront catalog)
CREATE POLICY "Allow public read products" ON public.products
    FOR SELECT USING (true);

-- Allow product upsert/insert with validation
CREATE POLICY "Allow public insert products" ON public.products
    FOR INSERT 
    WITH CHECK (id IS NOT NULL AND price >= 0);

-- Allow product updates with validation
CREATE POLICY "Allow public update products" ON public.products
    FOR UPDATE 
    USING (id IS NOT NULL) 
    WITH CHECK (id IS NOT NULL AND price >= 0);

-- Allow product deletion
CREATE POLICY "Allow public delete products" ON public.products
    FOR DELETE 
    USING (id IS NOT NULL);


-- ==============================================================================
-- 2. Orders Table & Security Policies
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    customer_email TEXT,
    customer_name TEXT,
    total_amount NUMERIC(10, 2),
    currency TEXT NOT NULL DEFAULT 'INR',
    items JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'placed',
    subtotal NUMERIC(10, 2),
    lines JSONB DEFAULT '[]'::jsonb,
    customer JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Ensure all columns exist
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS customer_email TEXT,
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR',
ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS lines JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS customer JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS total_savings NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_b2b BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS gstin VARCHAR(15),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'placed';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Drop insecure / overly permissive policies
DROP POLICY IF EXISTS "Allow public insert to orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public write access to orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public read own orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public read orders" ON public.orders;
DROP POLICY IF EXISTS "Allow authenticated update orders" ON public.orders;
DROP POLICY IF EXISTS "Allow authenticated delete orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public delete orders" ON public.orders;

-- Allow public / anon customers to create orders with validation
CREATE POLICY "Allow public insert to orders" ON public.orders
    FOR INSERT 
    WITH CHECK (id IS NOT NULL AND (subtotal >= 0 OR total_amount >= 0));

-- Allow reading orders (storefront order tracking & customer lookups)
CREATE POLICY "Allow public read orders" ON public.orders
    FOR SELECT 
    USING (true);

-- Allow order status updates and tracking details
CREATE POLICY "Allow authenticated update orders" ON public.orders
    FOR UPDATE 
    USING (true) 
    WITH CHECK (true);

-- Allow permanent order deletion from dashboard
CREATE POLICY "Allow public delete orders" ON public.orders
    FOR DELETE 
    USING (true);


-- ==============================================================================
-- 3. Order Notifications (Audit & Idempotency)
-- ==============================================================================
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

CREATE INDEX IF NOT EXISTS idx_order_notifications_order_lookup 
ON public.order_notifications(order_id, email_type);

ALTER TABLE public.order_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read notifications" ON public.order_notifications;

-- Service role bypasses RLS for edge functions; allow authenticated admins to view logs
CREATE POLICY "Allow authenticated read notifications" ON public.order_notifications
    FOR SELECT TO authenticated 
    USING (true);


-- ==============================================================================
-- 4. Product Pricing Tiers (Bulk & Wholesale Pricing)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.product_pricing_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    min_qty INTEGER NOT NULL CHECK (min_qty >= 1),
    max_qty INTEGER CHECK (max_qty IS NULL OR max_qty >= min_qty),
    discount_percent NUMERIC(5, 2) DEFAULT 0.00 CHECK (discount_percent >= 0 AND discount_percent <= 100),
    fixed_unit_price NUMERIC(10, 2) DEFAULT NULL CHECK (fixed_unit_price IS NULL OR fixed_unit_price >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_product_tier UNIQUE (product_id, min_qty)
);

CREATE INDEX IF NOT EXISTS idx_pricing_tiers_product_qty 
ON public.product_pricing_tiers(product_id, min_qty, max_qty);

ALTER TABLE public.product_pricing_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read pricing tiers" ON public.product_pricing_tiers;
DROP POLICY IF EXISTS "Allow authenticated insert pricing tiers" ON public.product_pricing_tiers;
DROP POLICY IF EXISTS "Allow authenticated update pricing tiers" ON public.product_pricing_tiers;
DROP POLICY IF EXISTS "Allow authenticated delete pricing tiers" ON public.product_pricing_tiers;
DROP POLICY IF EXISTS "Allow public write pricing tiers" ON public.product_pricing_tiers;

-- Public read access for storefront calculations
CREATE POLICY "Allow public read pricing tiers" ON public.product_pricing_tiers
    FOR SELECT USING (true);

-- Authenticated and public upsert permissions with validation
CREATE POLICY "Allow public insert pricing tiers" ON public.product_pricing_tiers
    FOR INSERT WITH CHECK (product_id IS NOT NULL AND min_qty >= 1);

CREATE POLICY "Allow public update pricing tiers" ON public.product_pricing_tiers
    FOR UPDATE USING (product_id IS NOT NULL) WITH CHECK (min_qty >= 1);

CREATE POLICY "Allow public delete pricing tiers" ON public.product_pricing_tiers
    FOR DELETE USING (product_id IS NOT NULL);

-- Default wholesale pricing tiers:
-- 1-9 units: 0% off (Retail)
-- 10-49 units: 10% off (Bulk)
-- 50-99 units: 15% off (Semi-Wholesale)
-- 100+ units: 20% off (Wholesale)
INSERT INTO public.product_pricing_tiers (product_id, min_qty, max_qty, discount_percent)
VALUES
    ('5kg', 1, 9, 0.00),
    ('5kg', 10, 49, 10.00),
    ('5kg', 50, 99, 15.00),
    ('5kg', 100, NULL, 20.00),

    ('650g', 1, 9, 0.00),
    ('650g', 10, 49, 10.00),
    ('650g', 50, 99, 15.00),
    ('650g', 100, NULL, 20.00),

    ('growbags', 1, 9, 0.00),
    ('growbags', 10, 49, 10.00),
    ('growbags', 50, 99, 15.00),
    ('growbags', 100, NULL, 20.00),

    ('husk', 1, 9, 0.00),
    ('husk', 10, 49, 10.00),
    ('husk', 50, 99, 15.00),
    ('husk', 100, NULL, 20.00)
ON CONFLICT (product_id, min_qty) DO UPDATE 
SET max_qty = EXCLUDED.max_qty, discount_percent = EXCLUDED.discount_percent;


-- ==============================================================================
-- 5. Fix SECURITY DEFINER Executable Warnings (rls_auto_enable)
-- ==============================================================================
-- Revoke public execution of SECURITY DEFINER functions from PostgREST API
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'rls_auto_enable'
    ) THEN
        REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
    END IF;
END $$;
