# AI Prompts — Authentication, User Management & RBAC

As specified in the assessment guidelines:
> *You may use an AI coding agent only for the Authentication, User Management and RBAC implementation.*
> *Add an AI_PROMPTS.md file to the GitHub repository.*
> *It should contain the actual prompts used while implementing the Authentication, User Management and RBAC functionality.*

Below are the exact prompt queries and context instructions used to configure, generate, and verify the Authentication, User Management, and Role-Based Access Control (RBAC) layers connected to Neon PostgreSQL.

---

### Prompt 1: Neon PostgreSQL Connection & Prisma Engine Alignment
```text
backend code is being connected to neon postgresql run the backend code and check
```
- **Context & Goal:** Connect the backend Express service to Neon PostgreSQL serverless database.
- **Outcome:** Resolved Prisma client export mismatch (`@prisma/client` and `prisma@^6.19.3`), applied PostgreSQL schema with `npx prisma db push`, verified DB connectivity to `ep-billowing-union-b58eton7-pooler.c-7.us-east-2.aws.neon.tech`, and confirmed server startup at port `3001`.

---

### Prompt 2: Authentication (Login, Register, Bcrypt, JWT) & RBAC Implementation
```text
as mentioned in the task assesment use only for below modules i.e AI-Assisted
You may use an AI coding agent only for the Authentication, User Management and RBAC implementation.

accordingly just create endpoints for this accordingly create row, column first start with login register bcrypt authentication i.e autthentication module with JWT
```
- **Context & Goal:**
  Implement and test the allowed AI-assisted modules:
  1. **Authentication:**
     - User Registration (`POST /api/auth/register`) with name, email, password (hashed with bcrypt, 12 rounds), issuing JWT token with role.
     - User Login (`POST /api/auth/login`) with constant-time dummy hashing against timing attacks and password comparison.
     - Profile fetch (`GET /api/auth/me`) protected with JWT Bearer authentication.
  2. **User Management:**
     - List users (`GET /api/users`), get single user (`GET /api/users/:id`), create user (`POST /api/users`), update (`PATCH /api/users/:id`), soft-deactivate (`PATCH /api/users/:id`), delete (`DELETE /api/users/:id`).
  3. **Role-Based Access Control (RBAC):**
     - Roles: `ADMIN` and `USER`.
     - Route protection middleware (`requireRole('ADMIN')` and `requireProjectMember`).
     - Verified enforcement: Standard users receive `403 Forbidden` (`{"error":{"code":"FORBIDDEN","message":"Insufficient permissions"}}`) when attempting to access Admin endpoints.
