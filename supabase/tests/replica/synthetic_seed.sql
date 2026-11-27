-- synthetic data mirroring production value distribution (no real personal data)
INSERT INTO auth.users (id,email) SELECT gen_random_uuid(), 'u'||g||'@x.test' FROM generate_series(1,32) g;
WITH u AS (SELECT id, row_number() over (order by id) n FROM auth.users),
spec(n,role,type) AS (VALUES
 (1,'FINISHING_PARTNER','finishing'),(2,'FINISHING_PARTNER','finishing'),(3,'FINISHING_PARTNER','finishing'),(4,'FINISHING_PARTNER','finishing'),
 (5,'FINISHING_PARTNER','finishing'),(6,'FINISHING_PARTNER','finishing'),(7,'FINISHING_PARTNER','finishing'),(8,'FINISHING_PARTNER','finishing'),
 (9,'DEVELOPER_PARTNER','developer'),(10,'DEVELOPER_PARTNER','developer'),(11,'DEVELOPER_PARTNER','developer'),(12,'AGENCY_PARTNER','agency'),(13,'AGENCY_PARTNER','agency'),
 (14,'super_admin','individual'),(15,'super_admin','individual'),(16,'super_admin','finishing'),(17,'CUSTOMER_RELATIONS_MANAGER','customer_relations_manager'),
 (18,'LISTINGS_MANAGER','listings_manager'),(19,'super_admin','system'),(20,'DECORATION_MANAGER','decoration_manager'),(21,'PLATFORM_FINISHING_MANAGER','platform_finishing_manager'),
 (22,'PARTNER_RELATIONS_MANAGER','partner_relations_manager'),(23,'system_admin','system'),(24,'user','individual'),(25,'developer_partner','developer'))
INSERT INTO public.partners (id,email,name_en,name_ar,type,role,status,contact_methods)
SELECT u.id,'p'||s.n||'@x.test','Partner '||s.n,'شريك '||s.n,s.type,s.role,'active','{"form":{"enabled":true},"_allowedCities":["heliopolis"]}'::jsonb FROM spec s JOIN u ON u.n=s.n;
INSERT INTO public.requests (type,status,requester_name,requester_phone,payload,assigned_to)
SELECT t,st,'Client','010', jsonb_build_object('serviceType', CASE WHEN t LIKE 'finishing%' OR t='LEAD' THEN 'finishing' ELSE 'property' END),
 (SELECT id FROM public.partners WHERE role='FINISHING_PARTNER' LIMIT 1)
FROM (VALUES ('PROPERTY_LISTING_REQUEST','new'),('general_inquiry','new'),('finishing_service','in_progress'),('CONTACT_MESSAGE','new'),('property_listing','converted'),('PROPERTY_LISTING_REQUEST','approved'),('LEAD','new'),('LEAD','new'),('PARTNER_APPLICATION','new'),('finishing_service','closed'),('property_inquiry','new')) v(t,st);
INSERT INTO public.site_content (key, content) VALUES ('main_content','{}'),('general_settings','{}'),('banners','[]');
-- listings & projects mirroring production counts (14 properties, 8 projects)
INSERT INTO public.projects (partner_id, name_en, name_ar)
SELECT (SELECT id FROM public.partners WHERE role='DEVELOPER_PARTNER' LIMIT 1), 'Project '||g, 'مشروع '||g FROM generate_series(1,8) g;
INSERT INTO public.properties (partner_id, title_en, title_ar, status, type, price, area, listing_status, is_verified)
SELECT (SELECT id FROM public.partners WHERE role IN ('DEVELOPER_PARTNER','AGENCY_PARTNER') ORDER BY role, id LIMIT 1 OFFSET (g % 3)),
       'Prop '||g, 'عقار '||g, 'للبيع', 'شقة', 1000000, 150, CASE WHEN g <= 10 THEN 'active' WHEN g <= 12 THEN 'sold' WHEN g = 13 THEN 'draft' ELSE 'inactive' END, g % 2 = 0
FROM generate_series(1,14) g;
INSERT INTO public.portfolio_items (partner_id, title_en, title_ar, category_en, category_ar, image_url)
SELECT (SELECT id FROM public.partners WHERE role='FINISHING_PARTNER' LIMIT 1), 'Work '||g, 'عمل '||g, 'Wall', 'جداري', 'x' FROM generate_series(1,14) g;
