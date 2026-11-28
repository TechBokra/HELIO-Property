-- =====================================================================
-- Phase 2 — direct quote requests to a finishing provider.
--
-- 1. route_finishing_request (BEFORE INSERT on requests)
--    * requestChannel = 'direct_provider': the provider and service are taken
--      from an APPROVED + LISTED partner_finishing_services row (by
--      payload.providerServiceId), never from what the browser sent. If the
--      service is not approved/visible, the request goes to the platform's
--      finishing managers instead and is marked 'direct_provider_unverified'.
--    * A visitor cannot hand a lead to a finishing partner any other way
--      (payload.partnerId / assigned_to pointing at a finishing_partner from a
--      non-staff caller is stripped and re-routed to the managers).
-- 2. notify_request_parties (AFTER INSERT on requests)
--    * Notifies the assignee with the right dashboard link and the customer
--      (when signed in). Done in the database because visitors and customers
--      are not allowed to write notifications for other users.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.resolve_finishing_manager(p_city text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT p.id
    FROM public.partners p
    WHERE p.status = 'active'
      AND lower(p.role) IN ('platform_finishing_manager', 'finishing_market_manager')
      AND (p.allowed_cities IS NULL OR '*' = ANY (p.allowed_cities) OR p_city = ANY (p.allowed_cities))
    ORDER BY (lower(p.role) = 'platform_finishing_manager') DESC, p.created_at
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.route_finishing_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_payload  jsonb := COALESCE(NEW.payload, '{}'::jsonb);
    v_channel  text  := v_payload ->> 'requestChannel';
    v_svc      record;
    v_is_staff boolean := COALESCE(public.current_partner_role(), '') = 'super_admin'
                          OR COALESCE(public.current_partner_role(), '') LIKE '%\_manager';
    v_target   uuid;
BEGIN
    IF v_channel = 'direct_provider' THEN
        SELECT s.id, s.partner_id, s.category_id, s.title_ar, s.title_en,
               COALESCE(p.name_ar, p.name_en) AS provider_name
          INTO v_svc
          FROM public.partner_finishing_services s
          JOIN public.partners p ON p.id = s.partner_id
          JOIN public.finishing_categories c ON c.id = s.category_id
         WHERE s.id::text = v_payload ->> 'providerServiceId'
           AND s.approval_status = 'approved'
           AND s.is_listed
           AND c.is_visible
           AND p.status = 'active';

        IF FOUND THEN
            NEW.assigned_to := v_svc.partner_id;
            NEW.payload := v_payload || jsonb_build_object(
                'partnerId', v_svc.partner_id,
                'providerId', v_svc.partner_id,
                'providerName', v_svc.provider_name,
                'providerServiceId', v_svc.id,
                'categoryId', v_svc.category_id,
                'serviceType', 'finishing',
                'directRouting', 'verified');
        ELSE
            NEW.assigned_to := public.resolve_finishing_manager(NEW.city_id);
            NEW.payload := (v_payload - 'partnerId' - 'providerId')
                || jsonb_build_object('requestChannel', 'direct_provider_unverified',
                                      'serviceType', 'finishing',
                                      'directRouting', 'rejected');
        END IF;
        RETURN NEW;
    END IF;

    IF v_is_staff THEN
        RETURN NEW;
    END IF;

    -- Visitors/customers may not hand a lead straight to a finishing partner.
    SELECT p.id INTO v_target
      FROM public.partners p
     WHERE lower(p.role) = 'finishing_partner'
       AND (p.id = NEW.assigned_to
            OR p.id::text = v_payload ->> 'partnerId')
     LIMIT 1;
    IF v_target IS NOT NULL THEN
        NEW.assigned_to := public.resolve_finishing_manager(NEW.city_id);
        NEW.payload := (v_payload - 'partnerId')
            || jsonb_build_object('directRouting', 'rerouted', 'requestedProviderId', v_target);
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_route_finishing_request ON public.requests;
CREATE TRIGGER trg_route_finishing_request BEFORE INSERT ON public.requests
    FOR EACH ROW EXECUTE FUNCTION public.route_finishing_request();

CREATE OR REPLACE FUNCTION public.notify_request_parties()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_role   text;
    v_ref    text := 'REQ-' || upper(left(replace(NEW.id::text, '-', ''), 8));
    v_title  text := COALESCE(NEW.payload ->> 'serviceTitle', NEW.type);
    v_direct boolean := (NEW.payload ->> 'requestChannel') = 'direct_provider';
    v_link   text;
BEGIN
    IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to IS DISTINCT FROM NEW.customer_id THEN
        SELECT lower(role) INTO v_role FROM public.partners WHERE id = NEW.assigned_to;
        v_link := CASE
            WHEN v_role IN ('developer_partner', 'finishing_partner', 'agency_partner') THEN '/dashboard/leads?id=' || NEW.id
            ELSE '/admin/operations?id=' || NEW.id
        END;
        INSERT INTO public.notifications (user_id, message, link, is_read)
        VALUES (NEW.assigned_to,
                jsonb_build_object(
                    'ar', CASE WHEN v_direct THEN 'طلب عرض سعر مباشر ' ELSE 'طلب جديد ' END || v_ref || ' من ' || COALESCE(NEW.requester_name, 'عميل') || ': ' || v_title,
                    'en', CASE WHEN v_direct THEN 'Direct quote request ' ELSE 'New request ' END || v_ref || ' from ' || COALESCE(NEW.requester_name, 'a customer') || ': ' || v_title),
                v_link, false);
    END IF;

    IF NEW.customer_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, message, link, is_read)
        VALUES (NEW.customer_id,
                jsonb_build_object(
                    'ar', 'استلمنا طلبك ' || v_ref || CASE WHEN v_direct THEN ' وأرسلناه إلى ' || COALESCE(NEW.payload ->> 'providerName', 'مقدم الخدمة') ELSE '' END || '.',
                    'en', 'We received your request ' || v_ref || CASE WHEN v_direct THEN ' and sent it to ' || COALESCE(NEW.payload ->> 'providerName', 'the provider') ELSE '' END || '.'),
                '/my-dashboard', false);
    END IF;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- A notification problem must never block the request itself.
    RAISE WARNING 'notify_request_parties failed for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_request_parties ON public.requests;
CREATE TRIGGER trg_notify_request_parties AFTER INSERT ON public.requests
    FOR EACH ROW EXECUTE FUNCTION public.notify_request_parties();

REVOKE ALL ON FUNCTION public.route_finishing_request(), public.notify_request_parties() FROM PUBLIC, anon, authenticated;
