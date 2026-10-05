-- Migration: 20261007_analytics_events_p1_hardening.sql
-- Description: Analytics Events P1 Hardening:
-- 1. Table public.analytics_events for high-intent conversion telemetry (whatsapp_click, call_click, property_view, etc.)
-- 2. Explicit indexes for event_type, property_id, partner_id, created_at, session_id
-- 3. Strict Row Level Security:
--    - Anonymous (anon) and authenticated users can INSERT analytics events (blind telemetry capture)
--    - Anonymous users CANNOT SELECT, UPDATE, or DELETE
--    - Authenticated admins / platform managers can SELECT for operational reporting
--    - Update and Delete are denied to guarantee an immutable event log

CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Indexes for rapid operational and commercial aggregations
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_property_id ON public.analytics_events(property_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_partner_id ON public.analytics_events(partner_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON public.analytics_events(session_id);

-- Policy 1: Any client (anonymous or authenticated) can INSERT approved conversion events
DROP POLICY IF EXISTS "Anyone can record analytics events" ON public.analytics_events;
CREATE POLICY "Anyone can record analytics events" ON public.analytics_events
    FOR INSERT
    TO public
    WITH CHECK (
        event_type IN (
            'whatsapp_click',
            'call_click',
            'property_view',
            'property_inquiry',
            'finishing_service_view',
            'finishing_request',
            'share_click'
        )
    );

-- Policy 2: Only authenticated administrators and managers can SELECT analytics data for operational reporting
DROP POLICY IF EXISTS "Admins and managers can view analytics events" ON public.analytics_events;
CREATE POLICY "Admins and managers can view analytics events" ON public.analytics_events
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.partners
            WHERE partners.id = auth.uid()
            AND (
                partners.role = 'super_admin'
                OR partners.role LIKE '%_manager'
                OR partners.type = 'admin'
            )
        )
    );

-- Policies for UPDATE and DELETE are intentionally omitted to enforce an immutable append-only audit stream.
