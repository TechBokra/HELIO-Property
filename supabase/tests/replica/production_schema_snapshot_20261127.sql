SET check_function_bodies = off;
SET search_path = public, extensions;
CREATE SCHEMA IF NOT EXISTS auth;
DO $$ BEGIN CREATE ROLE anon; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE service_role; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE auth.users (id uuid primary key, email text);
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT (nullif(current_setting('request.jwt.claims', true),'')::jsonb->>'sub')::uuid $$;
CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT coalesce((nullif(current_setting('request.jwt.claims', true),'')::jsonb->>'role'),'anon') $$;
CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims', true),'')::jsonb,'{}') $$;
GRANT USAGE ON SCHEMA auth, public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated;

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
CREATE TYPE public.user_role AS ENUM ('SUPER_ADMIN','DEVELOPER_PARTNER','FINISHING_PARTNER','AGENCY_PARTNER','DECORATION_MANAGER','PLATFORM_FINISHING_MANAGER','FINISHING_MARKET_MANAGER','PLATFORM_REAL_ESTATE_MANAGER','REAL_ESTATE_MARKET_MANAGER','PARTNER_RELATIONS_MANAGER','CONTENT_MANAGER','SERVICE_MANAGER','CUSTOMER_RELATIONS_MANAGER','LISTINGS_MANAGER');
CREATE TYPE public.partner_status AS ENUM ('ACTIVE','PENDING','DISABLED');
CREATE TYPE public.content_status AS ENUM ('draft','published','archived');
CREATE TABLE public."Banner" (
  "id" text DEFAULT (gen_random_uuid())::text NOT NULL,
  "title" text NOT NULL,
  "imageUrl" text NOT NULL,
  "link" text,
  "locations" text[],
  "status" text DEFAULT 'active'::text,
  "startDate" timestamp with time zone,
  "endDate" timestamp with time zone,
  "createdAt" timestamp with time zone DEFAULT now(),
  "updatedAt" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."ContactRequest" (
  "id" text DEFAULT (gen_random_uuid())::text NOT NULL,
  "name" text NOT NULL,
  "phone" text NOT NULL,
  "message" text,
  "inquiryType" text,
  "businessType" text,
  "companyName" text,
  "status" text DEFAULT 'pending'::text,
  "managerId" text,
  "createdAt" timestamp with time zone DEFAULT now(),
  "updatedAt" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."DecorationCategory" (
  "id" text DEFAULT (gen_random_uuid())::text NOT NULL,
  "name_en" text NOT NULL,
  "name_ar" text NOT NULL,
  "description_en" text,
  "description_ar" text
);
CREATE TABLE public."FinishingPackage" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "title_ar" text NOT NULL,
  "title_en" text NOT NULL,
  "description_ar" text,
  "description_en" text,
  "isActive" boolean DEFAULT true
);
CREATE TABLE public."FinishingStatus" (
  "id" text DEFAULT (gen_random_uuid())::text NOT NULL,
  "name_en" text NOT NULL,
  "name_ar" text NOT NULL,
  "applicableTo" text[] DEFAULT '{}'::text[]
);
CREATE TABLE public."LeadMessage" (
  "id" text DEFAULT (gen_random_uuid())::text NOT NULL,
  "leadId" text,
  "sender" text NOT NULL,
  "senderId" text,
  "type" text DEFAULT 'note'::text,
  "content" text,
  "timestamp" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."Notification" (
  "id" text DEFAULT (gen_random_uuid())::text NOT NULL,
  "userId" text NOT NULL,
  "message" jsonb NOT NULL,
  "link" text,
  "isRead" boolean DEFAULT false,
  "createdAt" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."PackageTier" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "packageId" uuid,
  "unitType_ar" text,
  "unitType_en" text,
  "areaRange_ar" text,
  "areaRange_en" text,
  "price" numeric
);
CREATE TABLE public."PartnerRequest" (
  "id" text NOT NULL,
  "companyName" text,
  "companyType" text,
  "contactName" text,
  "contactEmail" text,
  "contactPhone" text,
  "description" text,
  "website" text,
  "companyAddress" text,
  "logo" text,
  "documents" jsonb DEFAULT '[]'::jsonb,
  "managementContacts" jsonb DEFAULT '[]'::jsonb,
  "subscriptionPlan" text,
  "status" text DEFAULT 'pending'::text,
  "createdAt" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."PortfolioItem" (
  "id" text NOT NULL,
  "partnerId" text,
  "title_en" text,
  "title_ar" text,
  "category_en" text,
  "category_ar" text,
  "imageUrl" text NOT NULL,
  "alt" text,
  "price" numeric,
  "dimensions" text,
  "availability" text DEFAULT 'In Stock'::text,
  "categoryId" text,
  "createdAt" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."ProjectTypeDefinition" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name_en" text NOT NULL,
  "name_ar" text NOT NULL
);
CREATE TABLE public."PropertyInquiry" (
  "id" text DEFAULT (gen_random_uuid())::text NOT NULL,
  "customerName" text NOT NULL,
  "customerPhone" text NOT NULL,
  "details" text,
  "status" text DEFAULT 'pending'::text,
  "createdAt" timestamp with time zone DEFAULT now(),
  "updatedAt" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."PropertyListingRequest" (
  "id" text NOT NULL,
  "customerName" text,
  "customerPhone" text,
  "contactTime" text,
  "cooperationType" text,
  "status" text DEFAULT 'pending'::text,
  "managerId" text,
  "propertyDetails" jsonb DEFAULT '{}'::jsonb,
  "images" jsonb DEFAULT '[]'::jsonb,
  "createdAt" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."SiteContent" (
  "id" integer DEFAULT 1 NOT NULL,
  "content" jsonb NOT NULL,
  "updatedAt" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."StaticPage" (
  "slug" text NOT NULL,
  "title_en" text,
  "title_ar" text,
  "content_en" text,
  "content_ar" text
);
CREATE TABLE public."SystemSetting" (
  "key" text NOT NULL,
  "value" jsonb NOT NULL,
  "group" text,
  "updatedAt" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."Transaction" (
  "id" text NOT NULL,
  "userId" text,
  "userName" text,
  "amount" numeric,
  "currency" text DEFAULT 'EGP'::text,
  "type" text,
  "status" text,
  "method" text,
  "description" text,
  "relatedEntityId" text,
  "receiptUrl" text,
  "referenceNumber" text,
  "createdAt" timestamp with time zone DEFAULT now(),
  "updatedAt" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."amenities" (
  "id" text NOT NULL,
  "name_en" text NOT NULL,
  "name_ar" text NOT NULL,
  "applicable_to" text[] DEFAULT '{}'::text[]
);
CREATE TABLE public."content_categories" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "slug" character varying(255) NOT NULL,
  "name" jsonb NOT NULL,
  "description" jsonb,
  "icon" character varying(255),
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE public."content_post_tags" (
  "post_id" uuid NOT NULL,
  "tag_id" uuid NOT NULL
);
CREATE TABLE public."content_posts" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "slug" character varying(255) NOT NULL,
  "category_id" uuid,
  "author_id" uuid,
  "status" content_status DEFAULT 'draft'::content_status NOT NULL,
  "title" jsonb NOT NULL,
  "content" jsonb NOT NULL,
  "excerpt" jsonb,
  "featured_image" character varying(255),
  "meta_title" jsonb,
  "meta_description" jsonb,
  "published_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE public."content_tags" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "slug" character varying(255) NOT NULL,
  "name" jsonb NOT NULL
);
CREATE TABLE public."customer_favorites" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "user_id" uuid NOT NULL,
  "item_id" text NOT NULL,
  "item_type" text DEFAULT 'property'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."decoration_categories" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "name_en" text NOT NULL,
  "name_ar" text NOT NULL,
  "description_en" text,
  "description_ar" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."execution_attachments" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "request_id" uuid NOT NULL,
  "milestone_id" uuid,
  "uploader_id" uuid NOT NULL,
  "file_url" text NOT NULL,
  "file_name" text NOT NULL,
  "file_size" integer,
  "file_type" text DEFAULT 'photo'::text,
  "category" text DEFAULT 'milestone_evidence'::text,
  "is_internal" boolean DEFAULT false,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."finishing_milestones" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "request_id" uuid NOT NULL,
  "stage_number" integer NOT NULL,
  "title_ar" text NOT NULL,
  "title_en" text NOT NULL,
  "description_ar" text,
  "description_en" text,
  "target_days" integer DEFAULT 15,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "progress_percentage" integer DEFAULT 0 NOT NULL,
  "payment_percentage" numeric DEFAULT 0 NOT NULL,
  "payment_status" text DEFAULT 'pending'::text NOT NULL,
  "customer_notes" text,
  "internal_notes" text,
  "inspector_notes" text,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."finishing_quotes" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "request_id" uuid NOT NULL,
  "partner_id" uuid NOT NULL,
  "partner_name" text NOT NULL,
  "total_price" numeric NOT NULL,
  "price_per_sqm" numeric,
  "currency" text DEFAULT 'EGP'::text,
  "execution_timeline_days" integer NOT NULL,
  "warranty_months" integer DEFAULT 24,
  "scope_items" jsonb DEFAULT '[]'::jsonb,
  "terms_and_conditions" text,
  "status" text DEFAULT 'submitted'::text,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."finishing_request_history" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "request_id" uuid NOT NULL,
  "action_type" text NOT NULL,
  "changed_by" text NOT NULL,
  "old_value" jsonb,
  "new_value" jsonb,
  "note" text,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."finishing_statuses" (
  "id" text NOT NULL,
  "name_en" text NOT NULL,
  "name_ar" text NOT NULL,
  "applicable_to" text[] DEFAULT '{}'::text[]
);
CREATE TABLE public."notifications" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "user_id" uuid NOT NULL,
  "message" jsonb NOT NULL,
  "link" text,
  "is_read" boolean DEFAULT false,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."partner_capabilities" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "partner_id" uuid NOT NULL,
  "categories" text[] DEFAULT '{}'::text[],
  "service_areas" text[] DEFAULT '{}'::text[],
  "min_budget" numeric DEFAULT 0,
  "max_budget" numeric,
  "turnkey_capacity" integer DEFAULT 5,
  "warranty_years" integer DEFAULT 2,
  "has_in_house_architects" boolean DEFAULT true,
  "is_verified_contractor" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."partners" (
  "id" uuid NOT NULL,
  "email" text NOT NULL,
  "name_en" text NOT NULL,
  "name_ar" text,
  "description_en" text,
  "description_ar" text,
  "image_url" text,
  "type" text DEFAULT 'agency'::text NOT NULL,
  "role" text DEFAULT 'agency_partner'::text,
  "status" text DEFAULT 'pending'::text,
  "subscription_plan" text DEFAULT 'basic'::text,
  "subscription_end_date" timestamp with time zone,
  "display_type" text DEFAULT 'standard'::text,
  "contact_methods" jsonb DEFAULT '{"form": {"enabled": true}, "phone": {"number": "", "enabled": false}, "whatsapp": {"number": "", "enabled": false}}'::jsonb,
  "parent_id" uuid,
  "custom_permissions" text[],
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."portfolio_items" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "partner_id" uuid NOT NULL,
  "title_en" text NOT NULL,
  "title_ar" text NOT NULL,
  "category_en" text NOT NULL,
  "category_ar" text NOT NULL,
  "image_url" text NOT NULL,
  "price" numeric,
  "dimensions" text,
  "availability" text DEFAULT 'Made to Order'::text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."projects" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "partner_id" uuid NOT NULL,
  "name_en" text NOT NULL,
  "name_ar" text NOT NULL,
  "description_en" text,
  "description_ar" text,
  "image_url" text,
  "features" jsonb DEFAULT '[]'::jsonb,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."properties" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "partner_id" uuid,
  "project_id" uuid,
  "title_en" text NOT NULL,
  "title_ar" text NOT NULL,
  "description_en" text,
  "description_ar" text,
  "address_en" text,
  "address_ar" text,
  "main_image" text,
  "gallery" text[] DEFAULT '{}'::text[],
  "status" text NOT NULL,
  "type" text NOT NULL,
  "price" numeric NOT NULL,
  "area" numeric NOT NULL,
  "beds" integer DEFAULT 0,
  "baths" integer DEFAULT 0,
  "floor" integer,
  "finishing_status" text,
  "amenities" jsonb DEFAULT '{"ar": [], "en": []}'::jsonb,
  "location" jsonb DEFAULT '{"lat": 30.12, "lng": 31.62}'::jsonb,
  "is_in_compound" boolean DEFAULT false,
  "installments_available" boolean DEFAULT false,
  "finance_available" boolean DEFAULT false,
  "delivery_immediate" boolean DEFAULT true,
  "delivery_date" date,
  "installments_info" jsonb,
  "listing_status" text DEFAULT 'active'::text,
  "listing_start_date" timestamp with time zone DEFAULT now(),
  "listing_end_date" timestamp with time zone,
  "contact_method" text DEFAULT 'platform'::text,
  "owner_phone" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "contact_time" text,
  "cooperation_type" text,
  "commission_percentage" numeric,
  "fixed_amount" numeric,
  "owner_name" text,
  "is_verified" boolean DEFAULT false
);
CREATE TABLE public."property_types" (
  "id" text NOT NULL,
  "name_en" text NOT NULL,
  "name_ar" text NOT NULL
);
CREATE TABLE public."request_messages" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "request_id" uuid NOT NULL,
  "sender" text NOT NULL,
  "sender_id" uuid,
  "type" text DEFAULT 'message'::text,
  "content" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."requests" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "type" text NOT NULL,
  "status" text DEFAULT 'new'::text,
  "requester_name" text NOT NULL,
  "requester_phone" text NOT NULL,
  "requester_email" text,
  "assigned_to" uuid,
  "payload" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "customer_id" uuid
);
CREATE TABLE public."site_content" (
  "key" text NOT NULL,
  "content" jsonb NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."transactions" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "user_id" uuid,
  "user_name" text,
  "amount" numeric NOT NULL,
  "currency" text DEFAULT 'EGP'::text,
  "type" text NOT NULL,
  "description" text,
  "method" text NOT NULL,
  "status" text DEFAULT 'pending'::text,
  "reference_number" text,
  "receipt_url" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE public.content_tags ADD CONSTRAINT "content_tags_slug_key" UNIQUE (slug);
ALTER TABLE public.content_categories ADD CONSTRAINT "content_categories_slug_key" UNIQUE (slug);
ALTER TABLE public.partner_capabilities ADD CONSTRAINT "partner_capabilities_partner_id_key" UNIQUE (partner_id);
ALTER TABLE public.customer_favorites ADD CONSTRAINT "uq_user_favorite_item" UNIQUE (user_id, item_id, item_type);
ALTER TABLE public.content_posts ADD CONSTRAINT "content_posts_slug_key" UNIQUE (slug);
ALTER TABLE public.partners ADD CONSTRAINT "partners_email_key" UNIQUE (email);
ALTER TABLE public.finishing_milestones ADD CONSTRAINT "uq_finishing_request_stage" UNIQUE (request_id, stage_number);
ALTER TABLE public.property_types ADD CONSTRAINT "property_types_pkey" PRIMARY KEY (id);
ALTER TABLE public.finishing_statuses ADD CONSTRAINT "finishing_statuses_pkey" PRIMARY KEY (id);
ALTER TABLE public.amenities ADD CONSTRAINT "amenities_pkey" PRIMARY KEY (id);
ALTER TABLE public."FinishingStatus" ADD CONSTRAINT "FinishingStatus_pkey" PRIMARY KEY (id);
ALTER TABLE public."DecorationCategory" ADD CONSTRAINT "DecorationCategory_pkey" PRIMARY KEY (id);
ALTER TABLE public."PortfolioItem" ADD CONSTRAINT "PortfolioItem_pkey" PRIMARY KEY (id);
ALTER TABLE public."PartnerRequest" ADD CONSTRAINT "PartnerRequest_pkey" PRIMARY KEY (id);
ALTER TABLE public."PropertyListingRequest" ADD CONSTRAINT "PropertyListingRequest_pkey" PRIMARY KEY (id);
ALTER TABLE public."ContactRequest" ADD CONSTRAINT "ContactRequest_pkey" PRIMARY KEY (id);
ALTER TABLE public."PropertyInquiry" ADD CONSTRAINT "PropertyInquiry_pkey" PRIMARY KEY (id);
ALTER TABLE public."Notification" ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);
ALTER TABLE public."Banner" ADD CONSTRAINT "Banner_pkey" PRIMARY KEY (id);
ALTER TABLE public."SystemSetting" ADD CONSTRAINT "SystemSetting_pkey" PRIMARY KEY (key);
ALTER TABLE public."Transaction" ADD CONSTRAINT "Transaction_pkey" PRIMARY KEY (id);
ALTER TABLE public.partners ADD CONSTRAINT "partners_pkey" PRIMARY KEY (id);
ALTER TABLE public."StaticPage" ADD CONSTRAINT "StaticPage_pkey" PRIMARY KEY (slug);
ALTER TABLE public."LeadMessage" ADD CONSTRAINT "LeadMessage_pkey" PRIMARY KEY (id);
ALTER TABLE public.projects ADD CONSTRAINT "projects_pkey" PRIMARY KEY (id);
ALTER TABLE public.properties ADD CONSTRAINT "properties_pkey" PRIMARY KEY (id);
ALTER TABLE public."SiteContent" ADD CONSTRAINT "SiteContent_pkey" PRIMARY KEY (id);
ALTER TABLE public."FinishingPackage" ADD CONSTRAINT "FinishingPackage_pkey" PRIMARY KEY (id);
ALTER TABLE public."PackageTier" ADD CONSTRAINT "PackageTier_pkey" PRIMARY KEY (id);
ALTER TABLE public."ProjectTypeDefinition" ADD CONSTRAINT "ProjectTypeDefinition_pkey" PRIMARY KEY (id);
ALTER TABLE public.portfolio_items ADD CONSTRAINT "portfolio_items_pkey" PRIMARY KEY (id);
ALTER TABLE public.requests ADD CONSTRAINT "requests_pkey" PRIMARY KEY (id);
ALTER TABLE public.request_messages ADD CONSTRAINT "request_messages_pkey" PRIMARY KEY (id);
ALTER TABLE public.notifications ADD CONSTRAINT "notifications_pkey" PRIMARY KEY (id);
ALTER TABLE public.transactions ADD CONSTRAINT "transactions_pkey" PRIMARY KEY (id);
ALTER TABLE public.site_content ADD CONSTRAINT "site_content_pkey" PRIMARY KEY (key);
ALTER TABLE public.decoration_categories ADD CONSTRAINT "decoration_categories_pkey" PRIMARY KEY (id);
ALTER TABLE public.content_categories ADD CONSTRAINT "content_categories_pkey" PRIMARY KEY (id);
ALTER TABLE public.content_posts ADD CONSTRAINT "content_posts_pkey" PRIMARY KEY (id);
ALTER TABLE public.content_tags ADD CONSTRAINT "content_tags_pkey" PRIMARY KEY (id);
ALTER TABLE public.content_post_tags ADD CONSTRAINT "content_post_tags_pkey" PRIMARY KEY (post_id, tag_id);
ALTER TABLE public.customer_favorites ADD CONSTRAINT "customer_favorites_pkey" PRIMARY KEY (id);
ALTER TABLE public.finishing_quotes ADD CONSTRAINT "finishing_quotes_pkey" PRIMARY KEY (id);
ALTER TABLE public.finishing_milestones ADD CONSTRAINT "finishing_milestones_pkey" PRIMARY KEY (id);
ALTER TABLE public.finishing_request_history ADD CONSTRAINT "finishing_request_history_pkey" PRIMARY KEY (id);
ALTER TABLE public.partner_capabilities ADD CONSTRAINT "partner_capabilities_pkey" PRIMARY KEY (id);
ALTER TABLE public.execution_attachments ADD CONSTRAINT "execution_attachments_pkey" PRIMARY KEY (id);
ALTER TABLE public."SiteContent" ADD CONSTRAINT "single_row" CHECK ((id = 1));
ALTER TABLE public.finishing_milestones ADD CONSTRAINT "chk_milestone_progress" CHECK (((progress_percentage >= 0) AND (progress_percentage <= 100)));
ALTER TABLE public.finishing_milestones ADD CONSTRAINT "chk_milestone_payment_pct" CHECK (((payment_percentage >= (0)::numeric) AND (payment_percentage <= (100)::numeric)));
ALTER TABLE public."PackageTier" ADD CONSTRAINT "PackageTier_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "FinishingPackage"(id) ON DELETE CASCADE;
ALTER TABLE public.content_posts ADD CONSTRAINT "content_posts_author_id_fkey" FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.finishing_request_history ADD CONSTRAINT "finishing_request_history_request_id_fkey" FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE;
ALTER TABLE public.properties ADD CONSTRAINT "properties_partner_id_fkey" FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE;
ALTER TABLE public.execution_attachments ADD CONSTRAINT "execution_attachments_milestone_id_fkey" FOREIGN KEY (milestone_id) REFERENCES finishing_milestones(id) ON DELETE SET NULL;
ALTER TABLE public.content_post_tags ADD CONSTRAINT "content_post_tags_post_id_fkey" FOREIGN KEY (post_id) REFERENCES content_posts(id) ON DELETE CASCADE;
ALTER TABLE public.content_post_tags ADD CONSTRAINT "content_post_tags_tag_id_fkey" FOREIGN KEY (tag_id) REFERENCES content_tags(id) ON DELETE CASCADE;
ALTER TABLE public.transactions ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.partners ADD CONSTRAINT "partners_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES partners(id) ON DELETE SET NULL;
ALTER TABLE public.partners ADD CONSTRAINT "partners_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.execution_attachments ADD CONSTRAINT "execution_attachments_request_id_fkey" FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE;
ALTER TABLE public.content_posts ADD CONSTRAINT "content_posts_category_id_fkey" FOREIGN KEY (category_id) REFERENCES content_categories(id) ON DELETE SET NULL;
ALTER TABLE public.customer_favorites ADD CONSTRAINT "customer_favorites_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.requests ADD CONSTRAINT "requests_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.properties ADD CONSTRAINT "properties_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE public.partner_capabilities ADD CONSTRAINT "partner_capabilities_partner_id_fkey" FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE;
ALTER TABLE public.portfolio_items ADD CONSTRAINT "portfolio_items_partner_id_fkey" FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE;
ALTER TABLE public.finishing_quotes ADD CONSTRAINT "finishing_quotes_request_id_fkey" FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE;
ALTER TABLE public.requests ADD CONSTRAINT "requests_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES partners(id) ON DELETE SET NULL;
ALTER TABLE public.finishing_quotes ADD CONSTRAINT "finishing_quotes_partner_id_fkey" FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE;
ALTER TABLE public.request_messages ADD CONSTRAINT "request_messages_request_id_fkey" FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE;
ALTER TABLE public.request_messages ADD CONSTRAINT "request_messages_sender_id_fkey" FOREIGN KEY (sender_id) REFERENCES partners(id) ON DELETE SET NULL;
ALTER TABLE public.execution_attachments ADD CONSTRAINT "execution_attachments_uploader_id_fkey" FOREIGN KEY (uploader_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.notifications ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.projects ADD CONSTRAINT "projects_partner_id_fkey" FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE;
ALTER TABLE public.finishing_milestones ADD CONSTRAINT "finishing_milestones_request_id_fkey" FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE;
CREATE INDEX idx_notifications_user_read ON public.notifications USING btree (user_id, is_read);
CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);
CREATE INDEX idx_requests_assigned ON public.requests USING btree (assigned_to);
CREATE INDEX idx_requests_customer_id ON public.requests USING btree (customer_id);
CREATE INDEX idx_propreq_status ON public."PropertyListingRequest" USING btree (status);
CREATE INDEX idx_propreq_created ON public."PropertyListingRequest" USING btree ("createdAt" DESC);
CREATE INDEX idx_propreq_search ON public."PropertyListingRequest" USING btree ("customerName", "customerPhone");
CREATE INDEX idx_preq_status ON public."PartnerRequest" USING btree (status);
CREATE INDEX idx_preq_created ON public."PartnerRequest" USING btree ("createdAt" DESC);
CREATE INDEX idx_preq_search ON public."PartnerRequest" USING btree ("companyName", "contactPhone");
CREATE INDEX idx_contact_status ON public."ContactRequest" USING btree (status);
CREATE INDEX idx_contact_created ON public."ContactRequest" USING btree ("createdAt" DESC);
CREATE INDEX idx_contact_search ON public."ContactRequest" USING btree (name, phone);
CREATE INDEX idx_inquiry_status ON public."PropertyInquiry" USING btree (status);
CREATE INDEX idx_inquiry_created ON public."PropertyInquiry" USING btree ("createdAt" DESC);
CREATE INDEX idx_customer_favorites_user_id ON public.customer_favorites USING btree (user_id);
CREATE INDEX idx_customer_favorites_item ON public.customer_favorites USING btree (item_id, item_type);
CREATE INDEX idx_transactions_user ON public.transactions USING btree (user_id);
CREATE INDEX idx_transactions_user_id ON public.transactions USING btree (user_id);
CREATE INDEX idx_properties_partner ON public.properties USING btree (partner_id);
CREATE INDEX idx_properties_listing_status ON public.properties USING btree (listing_status);
CREATE INDEX idx_finishing_quotes_req ON public.finishing_quotes USING btree (request_id);
CREATE INDEX idx_finishing_quotes_partner ON public.finishing_quotes USING btree (partner_id);
CREATE INDEX idx_finishing_milestones_req ON public.finishing_milestones USING btree (request_id);
CREATE INDEX idx_finishing_req_hist_req ON public.finishing_request_history USING btree (request_id);
CREATE INDEX idx_execution_attachments_request ON public.execution_attachments USING btree (request_id);
CREATE INDEX idx_partner_capabilities_partner ON public.partner_capabilities USING btree (partner_id);
CREATE OR REPLACE FUNCTION public.get_my_role()
 RETURNS text
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  SELECT role FROM public."User" WHERE id = auth.uid()::text
$function$
;
CREATE OR REPLACE FUNCTION public.handle_finishing_stage5_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_request RECORD;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    IF OLD.stage_number = 5 AND OLD.status = 'completed' AND NEW.status <> 'completed' THEN
        RAISE EXCEPTION 'Invalid operation: Completed Stage 5 handover is final and cannot be reverted backwards.';
    END IF;

    IF NEW.stage_number = 5 AND NEW.status = 'completed' AND NEW.progress_percentage = 100 THEN
        SELECT * INTO v_request FROM public.requests WHERE id = NEW.request_id;

        IF FOUND AND v_request.status IS DISTINCT FROM 'completed' AND v_request.status IS DISTINCT FROM 'closed' THEN
            UPDATE public.requests SET status = 'completed', updated_at = v_now WHERE id = NEW.request_id;

            INSERT INTO public.finishing_request_history (
                request_id, action_type, changed_by, old_value, new_value, note, created_at
            ) VALUES (
                NEW.request_id, 'project_completed', 'System Handover Engine',
                v_request.status, 'completed',
                'تم اكتمال المرحلة النهائية (المراجعة الفنية والتسليم النهائي) بنجاح واكتمال المشروع رسمياً.',
                v_now
            );

            IF v_request.customer_id IS NOT NULL THEN
                INSERT INTO public.notifications (user_id, message, link, is_read, created_at)
                VALUES (
                    v_request.customer_id,
                    jsonb_build_object(
                        'ar', 'تهانينا! تم اكتمال وتسليم مشروع التشطيب بنجاح بنسبة 100%.',
                        'en', 'Congratulations! Your finishing project has been successfully completed and handed over (100%).'
                    ),
                    '/my-dashboard/requests', false, v_now
                );
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.partners 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'system_admin', 'service_manager', 'content_manager', 'platform_finishing_manager', 'platform_real_estate_manager')
  );
END;
$function$
;
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role FROM public.partners WHERE id = user_id;
    RETURN user_role IN ('super_admin', 'system_admin', 'service_manager', 'content_manager', 'platform_finishing_manager', 'platform_real_estate_manager');
END;
$function$
;
CREATE OR REPLACE FUNCTION public.protect_finishing_milestone_financial_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_user_role TEXT;
BEGIN
    SELECT role INTO v_user_role
    FROM public.partners
    WHERE id = auth.uid() AND status = 'active';

    IF (OLD.payment_status IS DISTINCT FROM NEW.payment_status OR 
        OLD.payment_percentage IS DISTINCT FROM NEW.payment_percentage) THEN
        IF v_user_role IS NULL OR v_user_role NOT IN ('super_admin', 'platform_finishing_manager', 'finishing_market_manager') THEN
            RAISE EXCEPTION 'Unauthorized: Only platform finishing managers can modify milestone payment fields.';
        END IF;
    END IF;

    RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;
CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON public.partners FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_requests_updated_at BEFORE UPDATE ON public.requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_content_categories_modtime BEFORE UPDATE ON public.content_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_content_posts_modtime BEFORE UPDATE ON public.content_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_protect_finishing_milestone_financial_fields BEFORE UPDATE ON public.finishing_milestones FOR EACH ROW EXECUTE FUNCTION protect_finishing_milestone_financial_fields();
CREATE TRIGGER trigger_handle_finishing_stage5_completion AFTER UPDATE ON public.finishing_milestones FOR EACH ROW EXECUTE FUNCTION handle_finishing_stage5_completion();
CREATE VIEW public.customer_milestones_view AS  SELECT id,
    request_id,
    stage_number,
    title_ar,
    title_en,
    description_ar,
    description_en,
    target_days,
    status,
    progress_percentage,
    payment_percentage,
    payment_status,
    customer_notes,
    completed_at,
    created_at,
    updated_at
   FROM finishing_milestones;
ALTER TABLE public."content_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."content_posts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."content_tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."content_post_tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."request_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PropertyListingRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PartnerRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."FinishingPackage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PackageTier" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ContactRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PropertyInquiry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SiteContent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."site_content" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PortfolioItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."customer_favorites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."FinishingStatus" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."portfolio_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."DecorationCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Banner" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."decoration_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ProjectTypeDefinition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."properties" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."partners" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."property_types" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."finishing_statuses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."amenities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SystemSetting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LeadMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."StaticPage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."finishing_quotes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."finishing_milestones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."finishing_request_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."execution_attachments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."partner_capabilities" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can insert own properties" ON public."properties" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = partner_id));
CREATE POLICY "Owners can update own properties" ON public."properties" AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = partner_id)) WITH CHECK ((auth.uid() = partner_id));
CREATE POLICY "Owners can delete own properties" ON public."properties" AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = partner_id));
CREATE POLICY "Admins have full access to properties" ON public."properties" AS PERMISSIVE FOR ALL TO public USING (is_admin(auth.uid()));
CREATE POLICY "Owners can insert own projects" ON public."projects" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = partner_id));
CREATE POLICY "Owners can update own projects" ON public."projects" AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = partner_id)) WITH CHECK ((auth.uid() = partner_id));
CREATE POLICY "Owners can delete own projects" ON public."projects" AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = partner_id));
CREATE POLICY "Admins have full access to projects" ON public."projects" AS PERMISSIVE FOR ALL TO public USING (is_admin(auth.uid()));
CREATE POLICY "Users view own favorites" ON public."customer_favorites" AS PERMISSIVE FOR SELECT TO public USING ((user_id = auth.uid()));
CREATE POLICY "Users insert own favorites" ON public."customer_favorites" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Users delete own favorites" ON public."customer_favorites" AS PERMISSIVE FOR DELETE TO public USING ((user_id = auth.uid()));
CREATE POLICY "Public can view partners" ON public."partners" AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Customers view milestones for own requests" ON public."finishing_milestones" AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM requests
  WHERE ((requests.id = finishing_milestones.request_id) AND (((requests.customer_id IS NOT NULL) AND (requests.customer_id = auth.uid())) OR (requests.requester_email = (auth.jwt() ->> 'email'::text)))))));
CREATE POLICY "Assigned partners view own project milestones" ON public."finishing_milestones" AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM requests
  WHERE ((requests.id = finishing_milestones.request_id) AND ((requests.assigned_to = auth.uid()) OR (((requests.payload ->> 'partnerId'::text))::uuid = auth.uid()))))));
CREATE POLICY "Assigned partners update own project milestones" ON public."finishing_milestones" AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM requests
  WHERE ((requests.id = finishing_milestones.request_id) AND ((requests.assigned_to = auth.uid()) OR (((requests.payload ->> 'partnerId'::text))::uuid = auth.uid()))))));
CREATE POLICY "Admins manage all finishing milestones" ON public."finishing_milestones" AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM partners
  WHERE ((partners.id = auth.uid()) AND (partners.status = 'active'::text) AND ((partners.role = 'super_admin'::text) OR (partners.role = 'platform_finishing_manager'::text) OR (partners.role = 'finishing_market_manager'::text))))));
CREATE POLICY "Authenticated users view finishing request history" ON public."finishing_request_history" AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users insert finishing request history" ON public."finishing_request_history" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Public can insert request_messages" ON public."request_messages" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public can view portfolio_items" ON public."portfolio_items" AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Public can insert requests" ON public."requests" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public can insert notifications" ON public."notifications" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Customers view own execution attachments" ON public."execution_attachments" AS PERMISSIVE FOR SELECT TO public USING (((is_internal = false) AND (EXISTS ( SELECT 1
   FROM requests
  WHERE ((requests.id = execution_attachments.request_id) AND (((requests.customer_id IS NOT NULL) AND (requests.customer_id = auth.uid())) OR (requests.requester_email = (auth.jwt() ->> 'email'::text))))))));
CREATE POLICY "Assigned active partners view attachments" ON public."execution_attachments" AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM requests
  WHERE ((requests.id = execution_attachments.request_id) AND ((requests.assigned_to = auth.uid()) OR (((requests.payload ->> 'partnerId'::text))::uuid = auth.uid()))))));
CREATE POLICY "Assigned active partners insert attachments" ON public."execution_attachments" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((uploader_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM requests
  WHERE ((requests.id = execution_attachments.request_id) AND ((requests.assigned_to = auth.uid()) OR (((requests.payload ->> 'partnerId'::text))::uuid = auth.uid())))))));
CREATE POLICY "Admins can view all requests" ON public."requests" AS PERMISSIVE FOR ALL TO public USING (is_admin());
CREATE POLICY "Public can view property_types" ON public."property_types" AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Public can view finishing_statuses" ON public."finishing_statuses" AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Public can view amenities" ON public."amenities" AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Public can view decoration_categories" ON public."decoration_categories" AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Public can view site content" ON public."site_content" AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Enable read access for all users on decoration_categories" ON public."decoration_categories" AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Public can view categories" ON public."content_categories" AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage categories" ON public."content_categories" AS PERMISSIVE FOR ALL TO public USING (is_admin());
CREATE POLICY "Public can view published posts" ON public."content_posts" AS PERMISSIVE FOR SELECT TO public USING ((status = 'published'::content_status));
CREATE POLICY "Admins can view all posts" ON public."content_posts" AS PERMISSIVE FOR SELECT TO public USING (is_admin());
CREATE POLICY "Admins can manage posts" ON public."content_posts" AS PERMISSIVE FOR ALL TO public USING (is_admin());
CREATE POLICY "Public can view tags" ON public."content_tags" AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Public profiles are viewable by everyone" ON public."partners" AS PERMISSIVE FOR SELECT TO public USING ((status = 'active'::text));
CREATE POLICY "Users can read own profile" ON public."partners" AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = id));
CREATE POLICY "Users can insert own profile" ON public."partners" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = id));
CREATE POLICY "Admins can manage tags" ON public."content_tags" AS PERMISSIVE FOR ALL TO public USING (is_admin());
CREATE POLICY "Public can view post tags" ON public."content_post_tags" AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage post tags" ON public."content_post_tags" AS PERMISSIVE FOR ALL TO public USING (is_admin());
CREATE POLICY "Users can update own profile" ON public."partners" AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));
CREATE POLICY "Admins have full access to partners" ON public."partners" AS PERMISSIVE FOR ALL TO public USING (is_admin(auth.uid()));
CREATE POLICY "Public portfolio items are viewable by everyone" ON public."portfolio_items" AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Partners manage own portfolio items" ON public."portfolio_items" AS PERMISSIVE FOR ALL TO public USING ((auth.uid() = partner_id));
CREATE POLICY "Admins have full access to portfolio items" ON public."portfolio_items" AS PERMISSIVE FOR ALL TO public USING (is_admin(auth.uid()));
CREATE POLICY "Partners manage assigned requests" ON public."requests" AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = assigned_to));
CREATE POLICY "Partners update assigned requests" ON public."requests" AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = assigned_to));
CREATE POLICY "Partners read messages for assigned requests" ON public."request_messages" AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM requests
  WHERE ((requests.id = request_messages.request_id) AND (requests.assigned_to = auth.uid())))));
CREATE POLICY "Partners insert messages for assigned requests" ON public."request_messages" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM requests
  WHERE ((requests.id = request_messages.request_id) AND (requests.assigned_to = auth.uid())))));
CREATE POLICY "Admins have full access to request messages" ON public."request_messages" AS PERMISSIVE FOR ALL TO public USING (is_admin(auth.uid()));
CREATE POLICY "Users read own notifications" ON public."notifications" AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users update own notifications" ON public."notifications" AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Admins have full access to notifications" ON public."notifications" AS PERMISSIVE FOR ALL TO public USING (is_admin(auth.uid()));
CREATE POLICY "Public can read site content" ON public."site_content" AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage site content" ON public."site_content" AS PERMISSIVE FOR ALL TO public USING (is_admin(auth.uid()));
CREATE POLICY "Public can view properties" ON public."properties" AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Public can view projects" ON public."projects" AS PERMISSIVE FOR SELECT TO public USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated;
