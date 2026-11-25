-- =============================================================================
-- Migration: 20261127_multi_city_governance_rls.sql
-- Purpose: Multi-City Governance, Content Inheritance, Partner allowed_cities
--          Authority, Paused-City Protections, and City-Scoped DB RLS
--          (Verification & reviewable migration — do NOT auto-apply to prod)
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Extend public.cities with Per-City Content Overrides (Inheritance Model)
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.cities
    ADD COLUMN IF NOT EXISTS content_overrides JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- 2. Make public.partners.allowed_cities Authoritative & Backfill Legacy Rows
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.partners
    ADD COLUMN IF NOT EXISTS allowed_cities TEXT[] NOT NULL DEFAULT ARRAY['heliopolis']::TEXT[];

-- Super admins always carry global wildcard '*' scope
UPDATE public.partners
SET allowed_cities = ARRAY['*']::TEXT[]
WHERE role = 'super_admin'
  AND (allowed_cities IS NULL OR NOT ('*' = ANY(allowed_cities)));

-- Migrate non-super_admin rows whose scope was stored only in legacy contact_methods._allowedCities
WITH legacy_scope AS (
    SELECT
        p.id,
        ARRAY(
            SELECT DISTINCT btrim(elem)
            FROM jsonb_array_elements_text((p.contact_methods::jsonb)->'_allowedCities') AS elem
            WHERE NULLIF(btrim(elem), '') IS NOT NULL
        ) AS resolved_cities
    FROM public.partners p
    WHERE p.role <> 'super_admin'
      AND (p.allowed_cities IS NULL OR cardinality(p.allowed_cities) = 0 OR p.allowed_cities = ARRAY['heliopolis']::TEXT[])
      AND p.contact_methods IS NOT NULL
      AND (p.contact_methods::jsonb) ? '_allowedCities'
      AND jsonb_typeof((p.contact_methods::jsonb)->'_allowedCities') = 'array'
      AND jsonb_array_length((p.contact_methods::jsonb)->'_allowedCities') > 0
)
UPDATE public.partners p
SET allowed_cities = l.resolved_cities
FROM legacy_scope l
WHERE p.id = l.id
  AND cardinality(l.resolved_cities) > 0
  AND p.allowed_cities IS DISTINCT FROM l.resolved_cities;

CREATE INDEX IF NOT EXISTS idx_partners_allowed_cities_gin ON public.partners USING GIN (allowed_cities);

-- ---------------------------------------------------------------------------
-- 3. Update public.can_access_city(target_city_id TEXT)
--    Uses authoritative partners.allowed_cities, falling back to legacy
--    contact_methods._allowedCities ONLY when allowed_cities is unset/empty.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_access_city(target_city_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_city TEXT := COALESCE(NULLIF(btrim(target_city_id), ''), 'heliopolis');
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN EXISTS (
        SELECT 1
        FROM public.partners p
        WHERE p.id = auth.uid()
          AND p.status = 'active'
          AND (
              p.role = 'super_admin'
              OR '*' = ANY(p.allowed_cities)
              OR v_city = ANY(p.allowed_cities)
              OR (
                  (p.allowed_cities IS NULL OR cardinality(p.allowed_cities) = 0)
                  AND p.contact_methods IS NOT NULL
                  AND jsonb_typeof((p.contact_methods::jsonb)->'_allowedCities') = 'array'
                  AND (
                      ((p.contact_methods::jsonb)->'_allowedCities') ? '*'
                      OR ((p.contact_methods::jsonb)->'_allowedCities') ? v_city
                  )
              )
          )
    );
END;
$$;

REVOKE ALL ON FUNCTION public.can_access_city(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_city(TEXT) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. Guard public.partners.allowed_cities against Self-Escalation via Trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_partner_privileged_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_caller_role TEXT;
    v_is_super_admin BOOLEAN := FALSE;
    v_is_relations_manager BOOLEAN := FALSE;
BEGIN
    -- Allow trusted service_role / migration sessions without JWT
    IF v_caller_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT role::text INTO v_caller_role
    FROM public.partners
    WHERE id = v_caller_id;

    v_is_super_admin := (v_caller_role = 'super_admin');
    v_is_relations_manager := (v_caller_role = 'partner_relations_manager');

    IF v_is_super_admin THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF NEW.role IS NOT NULL AND NEW.role::text NOT IN ('agency_partner', 'finishing_partner', 'developer_partner') THEN
            RAISE EXCEPTION 'Unauthorized: only platform super_admin can assign administrative partner roles (attempted %).', NEW.role;
        END IF;

        IF NEW.type IS NOT NULL AND NEW.type IN (
            'admin', 'decoration_manager', 'platform_finishing_manager', 'finishing_market_manager',
            'platform_real_estate_manager', 'real_estate_market_manager', 'partner_relations_manager',
            'content_manager', 'service_manager', 'customer_relations_manager', 'listings_manager'
        ) THEN
            RAISE EXCEPTION 'Unauthorized: only platform super_admin can create administrative account types.';
        END IF;

        IF NEW.custom_permissions IS NOT NULL AND array_length(NEW.custom_permissions, 1) > 0 THEN
            RAISE EXCEPTION 'Unauthorized: custom permissions can only be granted by a super admin.';
        END IF;

        -- Only super_admin or partner_relations_manager (within their own city scope) may assign allowed_cities
        IF '*' = ANY(COALESCE(NEW.allowed_cities, ARRAY[]::TEXT[])) THEN
            RAISE EXCEPTION 'Unauthorized: only platform super_admin can grant global city wildcard scope.'
                USING ERRCODE = '42501';
        END IF;

        IF NOT v_is_relations_manager THEN
            IF NEW.allowed_cities IS DISTINCT FROM ARRAY['heliopolis']::TEXT[] THEN
                RAISE EXCEPTION 'Unauthorized: partners cannot self-assign allowed_cities on registration.'
                    USING ERRCODE = '42501';
            END IF;

            IF NEW.status IS NOT NULL AND NEW.status::text IN ('active', 'approved') AND v_caller_id = NEW.id THEN
                NEW.status := 'pending'::partner_status;
            END IF;
            IF NEW.subscription_plan IS NOT NULL AND NEW.subscription_plan NOT IN ('basic', 'commission') THEN
                NEW.subscription_plan := 'basic';
            END IF;
        ELSE
            -- partner_relations_manager may only provision within their authorized cities
            IF EXISTS (
                SELECT 1
                FROM unnest(COALESCE(NEW.allowed_cities, ARRAY['heliopolis']::TEXT[])) AS req_city
                WHERE NOT public.can_access_city(req_city)
            ) THEN
                RAISE EXCEPTION 'Unauthorized: cannot assign partner to a city outside manager scope.'
                    USING ERRCODE = '42501';
            END IF;
        END IF;

        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'Unauthorized: only platform super_admin can modify partner role (attempted % -> %).', OLD.role, NEW.role;
        END IF;

        IF NEW.custom_permissions IS DISTINCT FROM OLD.custom_permissions THEN
            RAISE EXCEPTION 'Unauthorized: only platform super_admin can modify custom permissions.';
        END IF;

        IF NEW.type IS DISTINCT FROM OLD.type THEN
            IF NEW.type IN (
                'admin', 'decoration_manager', 'platform_finishing_manager', 'finishing_market_manager',
                'platform_real_estate_manager', 'real_estate_market_manager', 'partner_relations_manager',
                'content_manager', 'service_manager', 'customer_relations_manager', 'listings_manager'
            ) OR NOT v_is_relations_manager THEN
                RAISE EXCEPTION 'Unauthorized: only platform super_admin can modify partner account type.';
            END IF;
        END IF;

        IF NEW.status IS DISTINCT FROM OLD.status THEN
            IF NOT (v_is_super_admin OR v_is_relations_manager) THEN
                RAISE EXCEPTION 'Unauthorized: only platform administrators can modify partner status (attempted % -> %).', OLD.status, NEW.status;
            END IF;
        END IF;

        IF (NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan) OR (NEW.subscription_end_date IS DISTINCT FROM OLD.subscription_end_date) THEN
            IF NOT (v_is_super_admin OR v_is_relations_manager) THEN
                RAISE EXCEPTION 'Unauthorized: only platform administrators can modify subscription plan or expiration date.';
            END IF;
        END IF;

        IF NEW.parent_id IS DISTINCT FROM OLD.parent_id THEN
            IF NOT (v_is_super_admin OR v_is_relations_manager) THEN
                RAISE EXCEPTION 'Unauthorized: only platform administrators can modify organization hierarchy.';
            END IF;
        END IF;

        -- Only super_admin may alter allowed_cities
        IF NEW.allowed_cities IS DISTINCT FROM OLD.allowed_cities THEN
            RAISE EXCEPTION 'Unauthorized: only platform super_admin can modify allowed_cities.'
                USING ERRCODE = '42501';
        END IF;

        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Cities RLS: Public Reads Active Cities Only; Staff Read All Cities
-- ---------------------------------------------------------------------------
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cities_public_read" ON public.cities;
CREATE POLICY "cities_public_read"
    ON public.cities
    FOR SELECT
    TO anon, authenticated
    USING (
        is_active = TRUE
        OR EXISTS (
            SELECT 1
            FROM public.partners p
            WHERE p.id = auth.uid()
              AND p.status = 'active'
              AND (p.role = 'super_admin' OR p.role::text LIKE '%_manager')
        )
    );

DROP POLICY IF EXISTS "cities_super_admin_manage" ON public.cities;
CREATE POLICY "cities_super_admin_manage"
    ON public.cities
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.partners p
            WHERE p.id = auth.uid()
              AND p.status = 'active'
              AND p.role = 'super_admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.partners p
            WHERE p.id = auth.uid()
              AND p.status = 'active'
              AND p.role = 'super_admin'
        )
    );

-- ---------------------------------------------------------------------------
-- 6. Partners RLS: City-Scoped Staff Access Alongside Own/Public Profiles
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins view all partners" ON public.partners;
CREATE POLICY "Admins view all partners"
ON public.partners FOR SELECT
TO authenticated
USING (
    auth.uid() = id
    OR EXISTS (
        SELECT 1 FROM public.partners p
        WHERE p.id = auth.uid()
          AND p.status = 'active'
          AND (
              p.role = 'super_admin'
              OR (
                  p.role IN ('partner_relations_manager', 'service_manager', 'content_manager')
                  AND (
                      '*' = ANY(p.allowed_cities)
                      OR partners.allowed_cities && p.allowed_cities
                  )
              )
          )
    )
);

-- ---------------------------------------------------------------------------
-- 7. Projects RLS: Enforce City Scope + Active City on Public Catalog
-- ---------------------------------------------------------------------------
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Projects select policy" ON public.projects;
CREATE POLICY "Projects select policy"
ON public.projects FOR SELECT
USING (
    auth.uid() = partner_id
    OR (
        EXISTS (
            SELECT 1 FROM public.partners p
            WHERE p.id = projects.partner_id
              AND p.status = 'active'
        )
        AND EXISTS (
            SELECT 1 FROM public.cities c
            WHERE c.id = projects.city_id
              AND c.is_active = TRUE
        )
    )
    OR EXISTS (
        SELECT 1 FROM public.partners p
        WHERE p.id = auth.uid()
          AND p.status = 'active'
          AND (
              p.role = 'super_admin'
              OR (
                  p.role IN ('real_estate_market_manager', 'platform_real_estate_manager', 'listings_manager')
                  AND public.can_access_city(projects.city_id)
              )
          )
    )
);

DROP POLICY IF EXISTS "Projects insert policy" ON public.projects;
CREATE POLICY "Projects insert policy"
ON public.projects FOR INSERT
TO authenticated
WITH CHECK (
    (
        auth.uid() = partner_id
        AND public.can_access_city(projects.city_id)
    )
    OR EXISTS (
        SELECT 1 FROM public.partners p
        WHERE p.id = auth.uid()
          AND p.status = 'active'
          AND (
              p.role = 'super_admin'
              OR (
                  p.role IN ('real_estate_market_manager', 'platform_real_estate_manager')
                  AND public.can_access_city(projects.city_id)
              )
          )
    )
);

DROP POLICY IF EXISTS "Projects update policy" ON public.projects;
CREATE POLICY "Projects update policy"
ON public.projects FOR UPDATE
TO authenticated
USING (
    (
        auth.uid() = partner_id
        AND public.can_access_city(projects.city_id)
    )
    OR EXISTS (
        SELECT 1 FROM public.partners p
        WHERE p.id = auth.uid()
          AND p.status = 'active'
          AND (
              p.role = 'super_admin'
              OR (
                  p.role IN ('real_estate_market_manager', 'platform_real_estate_manager')
                  AND public.can_access_city(projects.city_id)
              )
          )
    )
)
WITH CHECK (
    (
        auth.uid() = partner_id
        AND public.can_access_city(projects.city_id)
    )
    OR EXISTS (
        SELECT 1 FROM public.partners p
        WHERE p.id = auth.uid()
          AND p.status = 'active'
          AND (
              p.role = 'super_admin'
              OR (
                  p.role IN ('real_estate_market_manager', 'platform_real_estate_manager')
                  AND public.can_access_city(projects.city_id)
              )
          )
    )
);

DROP POLICY IF EXISTS "Projects delete policy" ON public.projects;
CREATE POLICY "Projects delete policy"
ON public.projects FOR DELETE
TO authenticated
USING (
    (
        auth.uid() = partner_id
        AND public.can_access_city(projects.city_id)
    )
    OR EXISTS (
        SELECT 1 FROM public.partners p
        WHERE p.id = auth.uid()
          AND p.status = 'active'
          AND p.role = 'super_admin'
    )
);

-- ---------------------------------------------------------------------------
-- 8. Properties RLS: Enforce City Scope + Active City on Public Catalog
-- ---------------------------------------------------------------------------
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public properties are viewable by everyone" ON public.properties;
CREATE POLICY "Public properties are viewable by everyone"
ON public.properties FOR SELECT
USING (
    listing_status IN ('active', 'sold')
    AND EXISTS (
        SELECT 1 FROM public.cities c
        WHERE c.id = properties.city_id
          AND c.is_active = TRUE
    )
);

DROP POLICY IF EXISTS "Partners manage their own properties" ON public.properties;
CREATE POLICY "Partners manage their own properties"
ON public.properties FOR ALL
TO authenticated
USING (
    auth.uid() = partner_id
    AND public.can_access_city(properties.city_id)
)
WITH CHECK (
    auth.uid() = partner_id
    AND public.can_access_city(properties.city_id)
);

DROP POLICY IF EXISTS "Admins manage all properties" ON public.properties;
CREATE POLICY "Admins manage all properties"
ON public.properties FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.partners p
        WHERE p.id = auth.uid()
          AND p.status = 'active'
          AND (
              p.role = 'super_admin'
              OR (
                  p.role IN ('listings_manager', 'platform_real_estate_manager', 'real_estate_market_manager')
                  AND public.can_access_city(properties.city_id)
              )
          )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.partners p
        WHERE p.id = auth.uid()
          AND p.status = 'active'
          AND (
              p.role = 'super_admin'
              OR (
                  p.role IN ('listings_manager', 'platform_real_estate_manager', 'real_estate_market_manager')
                  AND public.can_access_city(properties.city_id)
              )
          )
    )
);

-- ---------------------------------------------------------------------------
-- 9. Requests & Request History RLS: Enforce City Scope + Active City Intake
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public and authenticated users can create requests" ON public.requests;
CREATE POLICY "Public and authenticated users can create requests"
ON public.requests FOR INSERT
WITH CHECK (
    (status IS NULL OR status IN ('new', 'pending'))
    AND EXISTS (
        SELECT 1 FROM public.cities c
        WHERE c.id = requests.city_id
          AND c.is_active = TRUE
    )
);

DROP POLICY IF EXISTS "Staff view domain-scoped requests" ON public.requests;
CREATE POLICY "Staff view domain-scoped requests"
ON public.requests FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.partners p
        WHERE p.id = auth.uid()
          AND p.status = 'active'
          AND (
              p.role = 'super_admin'
              OR (
                  public.can_access_city(requests.city_id)
                  AND (
                      (p.role IN ('platform_finishing_manager', 'finishing_market_manager') AND (
                          (requests.type = 'LEAD' AND (
                              requests.payload->>'serviceType' IN ('finishing', 'renovation', 'turnkey')
                              OR requests.payload->>'category' = 'turnkey'
                              OR requests.payload->>'serviceTitle' ILIKE '%تشطيب%'
                              OR requests.payload->>'serviceTitle' ILIKE '%finishing%'
                          ))
                          OR requests.assigned_to = auth.uid()
                      ))
                      OR (p.role = 'decoration_manager' AND (
                          (requests.type = 'LEAD' AND (
                              requests.payload->>'serviceType' IN ('decorations', 'decoration')
                              OR requests.payload->>'serviceTitle' ILIKE '%ديكور%'
                              OR requests.payload->>'serviceTitle' ILIKE '%decor%'
                          ))
                          OR requests.assigned_to = auth.uid()
                      ))
                      OR (p.role IN ('listings_manager', 'platform_real_estate_manager', 'real_estate_market_manager') AND (
                          requests.type IN ('PROPERTY_LISTING_REQUEST', 'PROPERTY_INQUIRY')
                          OR (requests.type = 'LEAD' AND (requests.payload->>'serviceType' = 'property' OR requests.payload->>'propertyId' IS NOT NULL))
                          OR requests.assigned_to = auth.uid()
                      ))
                      OR (p.role = 'partner_relations_manager' AND (
                          requests.type = 'PARTNER_APPLICATION'
                          OR requests.assigned_to = auth.uid()
                      ))
                      OR (p.role IN ('customer_relations_manager', 'service_manager') AND (
                          requests.type IN ('CONTACT_MESSAGE', 'PROPERTY_INQUIRY')
                          OR requests.assigned_to = auth.uid()
                      ))
                  )
              )
          )
    )
);

DROP POLICY IF EXISTS "Staff update requests" ON public.requests;
CREATE POLICY "Staff update requests"
ON public.requests FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.partners p
        WHERE p.id = auth.uid()
          AND p.status = 'active'
          AND (
              p.role = 'super_admin'
              OR (p.role::text LIKE '%_manager' AND public.can_access_city(requests.city_id))
          )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.partners p
        WHERE p.id = auth.uid()
          AND p.status = 'active'
          AND (
              p.role = 'super_admin'
              OR (p.role::text LIKE '%_manager' AND public.can_access_city(requests.city_id))
          )
    )
);

DROP POLICY IF EXISTS "Admins and managers view scoped request history" ON public.request_history;
CREATE POLICY "Admins and managers view scoped request history"
ON public.request_history FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.partners p
        WHERE p.id = auth.uid()
          AND p.status = 'active'
          AND (
              p.role = 'super_admin'
              OR (p.role IN ('platform_finishing_manager', 'finishing_market_manager') AND EXISTS (
                  SELECT 1 FROM public.requests r
                  WHERE r.id = request_history.request_id
                    AND public.can_access_city(r.city_id)
                    AND (
                        (r.type = 'LEAD' AND (
                            r.payload->>'serviceType' IN ('finishing', 'renovation', 'turnkey')
                            OR r.payload->>'category' = 'turnkey'
                            OR r.payload->>'serviceTitle' ILIKE '%تشطيب%'
                            OR r.payload->>'serviceTitle' ILIKE '%finishing%'
                        ))
                        OR r.assigned_to = auth.uid()
                    )
              ))
              OR (p.role = 'decoration_manager' AND EXISTS (
                  SELECT 1 FROM public.requests r
                  WHERE r.id = request_history.request_id
                    AND public.can_access_city(r.city_id)
                    AND (
                        (r.type = 'LEAD' AND (
                            r.payload->>'serviceType' IN ('decorations', 'decoration')
                            OR r.payload->>'serviceTitle' ILIKE '%ديكور%'
                            OR r.payload->>'serviceTitle' ILIKE '%decor%'
                        ))
                        OR r.assigned_to = auth.uid()
                    )
              ))
              OR (p.role IN ('listings_manager', 'platform_real_estate_manager', 'real_estate_market_manager') AND EXISTS (
                  SELECT 1 FROM public.requests r
                  WHERE r.id = request_history.request_id
                    AND public.can_access_city(r.city_id)
                    AND (
                        r.type IN ('PROPERTY_LISTING_REQUEST', 'PROPERTY_INQUIRY')
                        OR (r.type = 'LEAD' AND (r.payload->>'serviceType' = 'property' OR r.payload->>'propertyId' IS NOT NULL))
                        OR r.assigned_to = auth.uid()
                    )
              ))
              OR (p.role = 'partner_relations_manager' AND EXISTS (
                  SELECT 1 FROM public.requests r
                  WHERE r.id = request_history.request_id
                    AND public.can_access_city(r.city_id)
                    AND (
                        r.type = 'PARTNER_APPLICATION'
                        OR r.assigned_to = auth.uid()
                    )
              ))
              OR (p.role IN ('customer_relations_manager', 'service_manager') AND EXISTS (
                  SELECT 1 FROM public.requests r
                  WHERE r.id = request_history.request_id
                    AND public.can_access_city(r.city_id)
                    AND (
                        r.type IN ('CONTACT_MESSAGE', 'PROPERTY_INQUIRY')
                        OR r.assigned_to = auth.uid()
                    )
              ))
          )
    )
);

COMMIT;
