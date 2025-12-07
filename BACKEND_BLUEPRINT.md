
# ONLY HELIO - Backend Implementation Blueprint

## 1. Overview
This document outlines the architectural plan to migrate the "ONLY HELIO" platform from a frontend-only prototype to a production-ready full-stack application using **Node.js**, **Express/NestJS**, **Prisma ORM**, and **PostgreSQL**.

## 2. Core Architecture

### Database Strategy
*   **Database:** PostgreSQL 15+
*   **ORM:** Prisma (Schema defined in `prisma/schema.prisma`)
*   **Localization:** Static content (UI labels) remains on frontend. Dynamic content (Entities) stored in DB with suffix columns (`_en`, `_ar`) or JSONB fields for flexible schemas.

### Authentication
*   **Strategy:** JWT (JSON Web Tokens)
*   **Flow:**
    1.  Login Endpoint -> Returns `accessToken` & `refreshToken`.
    2.  Frontend stores token in `httpOnly` cookie or memory (Zustand).
    3.  Middleware validates token and injects `user` object into request.
    4.  **RBAC (Role-Based Access Control):** Middleware checks `user.role` against required permissions defined in `permissions.ts`.

---

## 3. API Specification (RESTful)

### Auth Module
| Method | Endpoint | Protected | Description |
| :--- | :--- | :--- | :--- |
| POST | `/api/auth/login` | No | Authenticate user, return JWT. |
| POST | `/api/auth/register` | No | Register new partner/user application. |
| POST | `/api/auth/refresh` | Yes | Refresh access token. |
| POST | `/api/auth/logout` | Yes | Invalidate tokens. |
| GET | `/api/auth/me` | Yes | Get current user profile. |

### Properties Module
| Method | Endpoint | Protected | Description |
| :--- | :--- | :--- | :--- |
| GET | `/api/properties` | No | List properties with filters & pagination. |
| GET | `/api/properties/:id` | No | Get single property details. |
| POST | `/api/properties` | Yes (Partner) | Create new property listing. |
| PATCH | `/api/properties/:id` | Yes (Owner/Admin) | Update property details. |
| DELETE | `/api/properties/:id` | Yes (Owner/Admin) | Soft delete/Archive property. |

### Projects Module
| Method | Endpoint | Protected | Description |
| :--- | :--- | :--- | :--- |
| GET | `/api/projects` | No | List all projects. |
| POST | `/api/projects` | Yes (Dev/Admin) | Create new project. |
| PATCH | `/api/projects/:id` | Yes (Dev/Admin) | Update project. |

### Requests & Leads Module (CRM)
| Method | Endpoint | Protected | Description |
| :--- | :--- | :--- | :--- |
| POST | `/api/requests` | No | Public submission (Contact, Inquiry, Lead). |
| GET | `/api/requests` | Yes (Admin) | List all raw requests (Triage). |
| GET | `/api/leads` | Yes (Partner) | List leads assigned to partner. |
| PATCH | `/api/leads/:id` | Yes (Partner) | Update lead status/notes. |
| POST | `/api/leads/:id/messages` | Yes | Add comment/message to lead thread. |

### Finance Module
| Method | Endpoint | Protected | Description |
| :--- | :--- | :--- | :--- |
| POST | `/api/finance/pay` | Yes | Initiate payment (Stripe/Paymob integration). |
| POST | `/api/finance/webhook` | No | Payment gateway webhook listener. |
| GET | `/api/finance/transactions`| Yes | List user transactions. |

### Content Management (CMS)
| Method | Endpoint | Protected | Description |
| :--- | :--- | :--- | :--- |
| GET | `/api/content` | No | Get site content (Hero, Settings, Banners). |
| PATCH | `/api/content` | Yes (Admin) | Update site config JSON. |
| GET | `/api/banners` | No | Get active banners. |
| POST | `/api/banners` | Yes (Admin) | Upload/Create new banner. |

---

## 4. Implementation Steps

### Phase 1: Backend Setup
1.  Initialize Node.js project.
2.  Setup Prisma with PostgreSQL connection.
3.  Run `prisma migrate dev` to create tables.
4.  Seed database using `prisma/seed.ts`.

### Phase 2: API Development
1.  Build Auth Controller & Guards.
2.  Implement Property & Project CRUD services.
3.  Implement File Upload service (S3/Cloudinary) for images.

### Phase 3: Frontend Integration
1.  Replace `services/*.ts` mock functions with `axios` or `fetch` calls to real API.
2.  Update `useAuthStore` to handle JWT storage.
3.  Test dynamic forms submission against `/api/requests`.

### Phase 4: Advanced Features
1.  **Routing Rules Engine:** Implement logic in backend to assign leads based on `RoutingRule` DB records.
2.  **Notification System:** Implement WebSocket (Socket.io) or Polling for real-time notifications.
