# ONLY HELIO — Decorations & Interior Design Hardening & Control Panel Operational Tuning Plan

Comprehensive production hardening plan for the **Decorations and Interior Design** domain and unified tuning of the **Admin, Partner, and Customer Control Panels** with design-specific lifecycle stages, reassignment controls, and tamper-proof audit trails.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were confirmed through user clarification:
> - **Prioritized Dashboards**: All control panels across the platform (**Admin**, **Partner**, and **Customer Portal**) are included in the review, hardening, and tuning scope.
> - **Domain Request Structure**: Interior Design & Decoration requests receive a **dedicated workflow section with design-specific milestone stages** rather than generic lead buckets.
> - **Primary Operational Focus**: **Status transitions, partner reassignment, and database-level audit logs (`request_history`)** to guarantee end-to-end accountability across stakeholders.

- **Confirmed Decision 1**: Hardening `public.decoration_categories` and `public.portfolio_items` with strict Supabase RLS and eliminating silent fallback mock data.
- **Confirmed Decision 2**: Implementing five design-specific stages: `Consultation & Brief`, `3D Concept & Moodboard`, `BOQ & Material Selection`, `Execution & Fitting`, and `Handover & Completion`.
- **Confirmed Decision 3**: Reassignment and status transitions trigger automated audit trail entries in `public.request_history` via secure database triggers, visible across all three portals.

---

## 1. Overview & Core Concept

### What It Delivers
A robust, secure, and production-grade Interior Design and Decoration lifecycle management system in ONLY HELIO. Customers submit custom design briefs or inquiry requests linked to portfolio items; Admin managers triage, assign specialized decoration partners, and track milestones; Partners manage progress, share specifications, and advance stages; and Customers monitor verified progress, review audit timelines, and communicate in real time.

### Target Personas
1. **Customers**: Homeowners and property investors looking for turnkey interior architecture, custom styling, or bespoke furnishing with milestone transparency.
2. **Platform Admin & Decoration Managers**: Operational staff responsible for lead verification, designer/partner allocation, and quality governance.
3. **Interior Design Partners**: Verified studios and decorators receiving assigned project leads, delivering concepts, updating execution stages, and communicating with clients.

### Key Value
Eliminates opaque request states, ghost leads, and hardcoded mock data. Replaces disconnected generic inquiry rows with an integrated design pipeline backed by PostgreSQL RLS, verifiable audit records, and bi-directional customer-partner messaging.

---

## 2. User Experience & Visual Design

Following the **Universal Frontend Design Constitution** and **SaaS Dashboard Architecture**:
- **Zero-Pill Discipline**: Statuses and stages rendered as crisp typography with semantic status dots and tabular timestamps, avoiding garish candy capsules.
- **Single-Elevation Depth**: Clean surfaces (`border border-neutral-200 dark:border-neutral-800`), high-density data tables, and tabular numerals (`tabular-nums font-mono`) for dates, phone numbers, and financial quotes.
- **Consistent Navigation**: Direct breadcrumbs (`Dashboard / Platform Operations / Decorations / Request #...`) and explicit action menus.

### Key User Flows

```
[Customer Portal]
  │ Submit Interior Design Brief / Portfolio Inquiry
  ▼
[Admin Dashboard]
  │ Triage in Dedicated "Platform Decorations" Section
  │ Review Brief & Allocate Design Partner / Specialist
  │ Mutation logged to `request_history`
  ▼
[Partner Dashboard]
  │ Partner receives assigned interior design lead
  │ Advances stages: Concept ➔ 3D Rendering ➔ BOQ ➔ Execution ➔ Handover
  │ Two-way communication via ConversationThread
  ▼
[Customer View]
  │ Real-time stage progress bar & audit trail inspection
  │ Secure message replies & file inspection
```

### Visual Identity & Theme Tokens
- **Background Atmosphere**: Crisp neutral slate canvas (`bg-slate-50 dark:bg-slate-900`) with elevated white/dark panels (`bg-white dark:bg-slate-800`).
- **Primary Accents**: Warm amber/gold branding accents (`text-amber-600`, `bg-amber-600 hover:bg-amber-700`) honoring the Heliopolis heritage.
- **Stage Progression Colors**:
  - `Consultation`: Cool Sky (`#0284C7`)
  - `Concept & 3D`: Indigo (`#4F46E5`)
  - `BOQ & Materials`: Purple (`#9333EA`)
  - `Execution`: Amber (`#D97706`)
  - `Handover`: Emerald (`#16A34A`)

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Dedicated Interior Design Pipeline vs. Generic Leads
- **Chosen Approach**: Build dedicated request detail and workflow components (`AdminDecorationRequestDetailsPage`, `PartnerDecorationStageModal`, and customer stage tracking) with explicit milestone definitions.
- **Why**: Interior design involves multi-step deliverable cycles (consultation, 3D renderings, material selection, execution) that cannot be represented accurately by a generic 3-state CRM lead.

### Decision 2: Database-Authoritative State & Real-time Audit Trail
- **Chosen Approach**: All status changes, stage updates, and partner reassignments execute directly against Supabase `public.requests` / `public.leads` and trigger automated entries in `public.request_history`.
- **Why**: Guarantees zero ghost leads, eliminates client-side tampering, and ensures customers and managers have matching single-source-of-truth timelines.

### Decision 3: Zero Mock Fallbacks in `services/portfolio.ts` & `services/decorations.ts`
- **Chosen Approach**: Completely remove fallback arrays (`data/portfolio.ts`). In case of network or database errors, bubble informative error boundaries to the UI.
- **Why**: Eliminates stale browser data and prevents users from interacting with phantom portfolio items.

---

## 4. Technical Architecture & Data Strategy

### System Layout & Component Hierarchy

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Supabase PostgreSQL                          │
│                                                                        │
│  ┌───────────────────────┐  ┌─────────────────┐  ┌──────────────────┐ │
│  │ decoration_categories │  │ portfolio_items │  │ request_history  │ │
│  └───────────┬───────────┘  └────────┬────────┘  └────────▲─────────┘ │
│              │                       │                    │ (trigger)│
│              └───────────────┬───────┘                    │          │
│                              ▼                            │          │
│                  ┌──────────────────────┐                 │          │
│                  │  requests / leads    ├─────────────────┘          │
│                  └──────────┬───────────┘                            │
└─────────────────────────────┼────────────────────────────────────────┘
                              │
               REST / Supabase Client (RLS Protected)
                              │
  ┌───────────────────────────┼───────────────────────────┐
  ▼                           ▼                           ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐
│ Admin Dashboard  │  │ Partner Portal   │  │ Customer Dashboard   │
│                  │  │                  │  │                      │
│ - Triage Queue   │  │ - Assigned Leads │  │ - Request Tracker    │
│ - Stage Manager  │  │ - Stage Progress │  │ - Stage Progress Bar │
│ - Reassignment   │  │ - Design Comm.   │  │ - Audit Timeline     │
│ - Audit Viewer   │  │ - Status Update  │  │ - Direct Reply       │
└──────────────────┘  └──────────────────┘  └──────────────────────┘
```

### Data Model & Schema Enhancements

1. **`public.decoration_categories` Table Migration**:
   - `id`: UUID (Primary Key, default `gen_random_uuid()`)
   - `name_ar`: TEXT NOT NULL
   - `name_en`: TEXT NOT NULL
   - `description_ar`: TEXT, `description_en`: TEXT
   - `icon`: TEXT, `sort_order`: INT DEFAULT 0
   - `created_at`: TIMESTAMPTZ DEFAULT now()
   - **RLS**: Public read; write restricted to `super_admin` and `decoration_manager`.

2. **`public.portfolio_items` Hardening**:
   - Foreign key constraint: `partner_id REFERENCES partners(id) ON DELETE SET NULL`
   - **RLS**: Public read; insert/update restricted to assigned partner or platform managers.

3. **Design-Specific Lifecycle Stages**:
   - `design_consultation`: Initial scope review and customer meeting.
   - `concept_and_3d`: 2D moodboards and 3D architectural renderings.
   - `boq_and_materials`: Bill of quantities, material specifications, and budget quote.
   - `execution_and_fitting`: On-site carpentry, painting, and fitting.
   - `completed`: Final inspection and project handover.
   - `cancelled`: Terminated or declined.

### Execution Phases

- **Phase 1: Database Migration & RLS**:
  - Create migration `20260930_decorations_domain_hardening.sql`.
  - Provision `decoration_categories` table, apply RLS, and add foreign keys.
  - Apply stage transition policies and link trigger `trg_log_request_mutation()` for interior design updates.

- **Phase 2: Service Layer Hardening**:
  - Clean `services/decorations.ts` and `services/portfolio.ts` (remove mock fallbacks, enforce strict typing).
  - Add `assignDecorationPartner()` and `updateDecorationStage()` with audit trail logging in `services/requests.ts` and `services/leads.ts`.

- **Phase 3: Control Panel Tuning**:
  - **Admin**: Fix and complete `AdminDecorationRequestDetailsPage.tsx` and `RequestsManagement.tsx` with partner reassignment modal, stage controls, and `RequestHistoryTimeline`.
  - **Partner**: Enhance `PartnerLeadDetailsPage.tsx` to recognize interior design requests and provide stage advancement controls.
  - **Customer**: Connect `ClientGeneralRequestDetailsModal.tsx` to render design milestones and stage progress dynamically.

- **Phase 4: Build Verification & Export**:
  - Full TypeScript compilation, lint validation, and production build check.
  - Package final export bundle for GitHub sync.
