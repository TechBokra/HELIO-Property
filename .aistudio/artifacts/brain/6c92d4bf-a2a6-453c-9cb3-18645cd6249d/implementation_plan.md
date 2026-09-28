# Implementation Plan — Finishing Domain & Partner Quotes (P0 & P1)

Transform the Finishing module in ONLY HELIO from a CMS/Lead-form workflow into a unified business domain with multi-quotes tendering, contractor capabilities, and awarding workflows.

---

## 1. P0 Architecture & Persistence (Completed)
* **Canonical Schema & Decoupled Pricing**: `finishing_services` with tiers, numeric base pricing, and categories.
* **Property Linkage**: Guaranteed `propertyId` attachment across public service requests and admin views.
* **Zero Ghost IDs**: Platform Finishing Manager (`3e554896-eee8-4545-9c7f-0a79a4c1a9f1`) and verified partner matching.
* **Dead Code Cleanup**: Empty placeholder files removed.

---

## 2. P1: Partner Dashboard & Multi-Quotes Workflow (Completed)

### A. Contractor Multi-Quotes & Bidding Workflow
* **Quote Comparison (`components/finishing/FinishingQuoteComparison.tsx`)**:
  - Side-by-side comparative grid showing contractor bids, pricing (total & per m²), execution timeline, engineering warranty, and scope item breakdowns.
  - Highlights lowest bid and fastest execution timeline.
  - One-click **"Award Project"** with modal confirmation, updating the winning quote to `accepted` and competing quotes to `rejected`.
* **Quote Submission Modal (`components/finishing/SubmitFinishingQuoteModal.tsx`)**:
  - Detailed breakdown of scope items (MEP, paint, flooring, supervision, custom items).
  - Validation of pricing, delivery days, warranty period, terms and conditions.
* **Audit & Activity Timeline (`components/finishing/FinishingRequestTimeline.tsx`)**:
  - Chronological audit milestones (creation, partner assignments, quote submissions, status transitions, awarding decisions).

### B. Admin & Platform Finishing Management
* **Admin Finishing Request Details (`components/admin/AdminFinishingRequestDetailsPage.tsx`)**:
  - Integrated `FinishingQuoteComparison` with direct quote awarding.
  - Integrated `FinishingRequestTimeline` for auditing.
  - Added "Add Contractor Bid" button to record offline/partner quotes.
  - History logging for status transitions and partner assignments.

### C. Partner Dashboard Integration
* **Partner Lead Details (`components/partner-dashboard/PartnerLeadDetailsPage.tsx`)**:
  - Detection of finishing requests / RFQs.
  - Dedicated Contractor Bid Card displaying the firm's submitted quote or Call-to-Action to submit a new proposal.
  - Award status display: celebratory banner upon contract award with instructions for client contact.
  - Quick action to submit or edit quotes via `SubmitFinishingQuoteModal`.
* **Partner Leads & RFQ Filtering (`components/partner-dashboard/DashboardLeadsPage.tsx`)**:
  - Finishing partners can view assigned leads as well as relevant finishing RFQs.
  - Added visual badge `[مناقصة تشطيب / Finishing RFQ]` in both card and table views.
  - Added quick filter dropdown: "All Inquiries & RFQs", "Finishing RFQs Only", and "Standard Inquiries".
* **Partner Capabilities & Coverage Management (`components/partner-dashboard/PartnerCapabilitiesPage.tsx`)**:
  - Dedicated page for contractors at `/dashboard/capabilities`.
  - Configures disciplines (Turnkey, 3D Architectural, Commercial, Renovation, Smart Home, MEP).
  - Configures coverage areas (New Heliopolis, El Shorouk, New Cairo, Madinaty, Mostakbal City, Badr City, New Administrative Capital).
  - Configures project budget minimums/maximums, simultaneous turnkey capacity, warranty periods, and in-house engineering credentials.
  - Linked directly in partner navigation and profile settings.

---

## 3. Verification & Build Quality
* `compile_applet`: Build succeeded with 0 errors.
* `lint_applet`: ESLint validation completed with 0 errors.
