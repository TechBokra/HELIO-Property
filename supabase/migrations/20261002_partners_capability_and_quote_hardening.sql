-- =========================================================================
-- MIGRATION: 20261002_partners_capability_and_quote_hardening.sql
-- PURPOSE: Partners Final Operational Hardening
--          BUS-01: Capability-based RFQ eligibility in public.partner_leads_view
--                  (Category/Specialty, Geographic Coverage, Budget Constraints)
--          DAT-01: Re-affirm database-only authoritative store for finishing quotes
-- =========================================================================

-- =========================================================================
-- PART 1: BUS-01 — CAPABILITY-BASED RFQ ELIGIBILITY IN partner_leads_view
-- =========================================================================

CREATE OR REPLACE VIEW public.partner_leads_view AS
SELECT 
    r.id,
    r.type,
    r.status,
    -- Requester Name Masking
    CASE 
        WHEN auth.role() = 'authenticated' AND (
            r.assigned_to = auth.uid() 
            OR (r.payload->>'partnerId')::uuid = auth.uid() 
            OR EXISTS (
                SELECT 1 FROM public.finishing_quotes fq 
                WHERE fq.request_id = r.id AND fq.partner_id = auth.uid() AND fq.status = 'accepted'
            ) 
            OR EXISTS (
                SELECT 1 FROM public.partners p 
                WHERE p.id = auth.uid() AND (p.role = 'super_admin' OR p.role LIKE '%_manager')
            )
        )
        THEN r.requester_name
        ELSE 'عميل المنصة (مناقصة)'
    END AS requester_name,
    -- Requester Phone Masking
    CASE 
        WHEN auth.role() = 'authenticated' AND (
            r.assigned_to = auth.uid() 
            OR (r.payload->>'partnerId')::uuid = auth.uid() 
            OR EXISTS (
                SELECT 1 FROM public.finishing_quotes fq 
                WHERE fq.request_id = r.id AND fq.partner_id = auth.uid() AND fq.status = 'accepted'
            ) 
            OR EXISTS (
                SELECT 1 FROM public.partners p 
                WHERE p.id = auth.uid() AND (p.role = 'super_admin' OR p.role LIKE '%_manager')
            )
        )
        THEN r.requester_phone
        ELSE NULL
    END AS requester_phone,
    -- Requester Email Masking
    CASE 
        WHEN auth.role() = 'authenticated' AND (
            r.assigned_to = auth.uid() 
            OR (r.payload->>'partnerId')::uuid = auth.uid() 
            OR EXISTS (
                SELECT 1 FROM public.finishing_quotes fq 
                WHERE fq.request_id = r.id AND fq.partner_id = auth.uid() AND fq.status = 'accepted'
            ) 
            OR EXISTS (
                SELECT 1 FROM public.partners p 
                WHERE p.id = auth.uid() AND (p.role = 'super_admin' OR p.role LIKE '%_manager')
            )
        )
        THEN r.requester_email
        ELSE NULL
    END AS requester_email,
    r.assigned_to,
    -- Safe explicit payload projection
    CASE 
        WHEN auth.role() = 'authenticated' AND (
            r.assigned_to = auth.uid() 
            OR (r.payload->>'partnerId')::uuid = auth.uid() 
            OR EXISTS (
                SELECT 1 FROM public.finishing_quotes fq 
                WHERE fq.request_id = r.id AND fq.partner_id = auth.uid() AND fq.status = 'accepted'
            ) 
            OR EXISTS (
                SELECT 1 FROM public.partners p 
                WHERE p.id = auth.uid() AND (p.role = 'super_admin' OR p.role LIKE '%_manager')
            )
        )
        THEN r.payload
        ELSE jsonb_build_object(
            'serviceType', r.payload->>'serviceType',
            'serviceTitle', r.payload->>'serviceTitle',
            'category', r.payload->>'category',
            'tierDetails', r.payload->'tierDetails',
            'pricingModel', r.payload->>'pricingModel',
            'estimatedCost', r.payload->'estimatedCost',
            'dimensions', r.payload->>'dimensions',
            'itemCategory', r.payload->>'itemCategory',
            'propertyArea', COALESCE(r.payload->'propertyArea', r.payload->'area', (r.payload->'tierDetails'->>'area')::jsonb),
            'propertyId', r.payload->>'propertyId',
            'propertyTitle', r.payload->>'propertyTitle',
            'designStage', r.payload->>'designStage',
            'status', COALESCE(r.payload->>'status', r.status),
            'contactTime', r.payload->>'contactTime'
        )
    END AS payload,
    r.created_at,
    r.updated_at
FROM public.requests r
WHERE auth.role() = 'authenticated'
AND (
    -- 1. Platform administrators / managers have full operational oversight
    EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = auth.uid() 
        AND (p.role = 'super_admin' OR p.role LIKE '%_manager')
    )
    -- 2. Assigned partner (to access ongoing assigned requests)
    OR (
        r.assigned_to = auth.uid() 
        OR (r.payload->>'partnerId')::uuid = auth.uid()
    )
    -- 3. Awarded contractor on accepted quote
    OR EXISTS (
        SELECT 1 FROM public.finishing_quotes fq 
        WHERE fq.request_id = r.id 
        AND fq.partner_id = auth.uid() 
        AND fq.status = 'accepted'
    )
    -- 4. Open / Unassigned RFQ: Must be an ACTIVE partner AND satisfy CAPABILITY MATCHING
    OR (
        EXISTS (
            SELECT 1 FROM public.partners p 
            WHERE p.id = auth.uid() 
            AND p.status = 'active'
        )
        -- BUS-01 Deterministic Capability Matching:
        -- Hide RFQ if partner has capability configuration that strictly conflicts with the request criteria
        AND NOT EXISTS (
            SELECT 1 FROM public.partner_capabilities pc
            WHERE pc.partner_id = auth.uid()
            AND (
                -- 4A. Specialty/Category Mismatch:
                -- If partner configured categories AND request specifies a category/serviceType
                (
                    pc.categories IS NOT NULL 
                    AND cardinality(pc.categories) > 0
                    AND COALESCE(r.payload->>'category', '') <> ''
                    AND NOT (
                        (r.payload->>'category') = ANY(pc.categories)
                        OR ((r.payload->>'category') = 'finishing' AND ('turnkey' = ANY(pc.categories) OR 'renovation' = ANY(pc.categories)))
                    )
                )
                -- 4B. Geographic Coverage Mismatch:
                -- If partner configured service_areas AND request specifies a serviceArea/location
                OR (
                    pc.service_areas IS NOT NULL 
                    AND cardinality(pc.service_areas) > 0
                    AND COALESCE(r.payload->>'serviceArea', r.payload->>'areaId', r.payload->>'location', '') <> ''
                    AND NOT (
                        COALESCE(r.payload->>'serviceArea', r.payload->>'areaId', r.payload->>'location', '') = ANY(pc.service_areas)
                        OR EXISTS (
                            SELECT 1 FROM unnest(pc.service_areas) sa 
                            WHERE COALESCE(r.payload->>'serviceArea', r.payload->>'areaId', r.payload->>'location', '') ILIKE '%' || sa || '%'
                            OR (sa = 'new_heliopolis' AND COALESCE(r.payload->>'serviceArea', r.payload->>'areaId', r.payload->>'location', '') ILIKE '%هليوبوليس%')
                            OR (sa = 'el_shorouk' AND COALESCE(r.payload->>'serviceArea', r.payload->>'areaId', r.payload->>'location', '') ILIKE '%شروق%')
                            OR (sa = 'new_cairo' AND (COALESCE(r.payload->>'serviceArea', r.payload->>'areaId', r.payload->>'location', '') ILIKE '%تجمع%' OR COALESCE(r.payload->>'serviceArea', r.payload->>'areaId', r.payload->>'location', '') ILIKE '%القاهرة الجديدة%'))
                            OR (sa = 'madinaty' AND COALESCE(r.payload->>'serviceArea', r.payload->>'areaId', r.payload->>'location', '') ILIKE '%مدينتي%')
                            OR (sa = 'mostakbal_city' AND COALESCE(r.payload->>'serviceArea', r.payload->>'areaId', r.payload->>'location', '') ILIKE '%مستقبل%')
                            OR (sa = 'badr_city' AND COALESCE(r.payload->>'serviceArea', r.payload->>'areaId', r.payload->>'location', '') ILIKE '%بدر%')
                            OR (sa = 'new_capital' AND COALESCE(r.payload->>'serviceArea', r.payload->>'areaId', r.payload->>'location', '') ILIKE '%العاصمة%')
                        )
                    )
                )
                -- 4C. Budget Mismatch:
                -- If request has valid numeric cost AND partner has budget bounds
                OR (
                    CASE 
                        WHEN r.payload->>'estimatedCost' ~ '^[0-9]+(\.[0-9]+)?$' THEN (r.payload->>'estimatedCost')::numeric
                        WHEN r.payload->'tierDetails'->>'estimatedPrice' ~ '^[0-9]+(\.[0-9]+)?$' THEN (r.payload->'tierDetails'->>'estimatedPrice')::numeric
                        ELSE NULL 
                    END IS NOT NULL
                    AND (
                        (pc.min_budget IS NOT NULL AND pc.min_budget > 0 AND (
                            CASE 
                                WHEN r.payload->>'estimatedCost' ~ '^[0-9]+(\.[0-9]+)?$' THEN (r.payload->>'estimatedCost')::numeric
                                WHEN r.payload->'tierDetails'->>'estimatedPrice' ~ '^[0-9]+(\.[0-9]+)?$' THEN (r.payload->'tierDetails'->>'estimatedPrice')::numeric
                            END < pc.min_budget
                        ))
                        OR
                        (pc.max_budget IS NOT NULL AND pc.max_budget > 0 AND (
                            CASE 
                                WHEN r.payload->>'estimatedCost' ~ '^[0-9]+(\.[0-9]+)?$' THEN (r.payload->>'estimatedCost')::numeric
                                WHEN r.payload->'tierDetails'->>'estimatedPrice' ~ '^[0-9]+(\.[0-9]+)?$' THEN (r.payload->'tierDetails'->>'estimatedPrice')::numeric
                            END > pc.max_budget
                        ))
                    )
                )
            )
        )
    )
);

REVOKE ALL ON public.partner_leads_view FROM anon, public;
GRANT SELECT ON public.partner_leads_view TO authenticated;
