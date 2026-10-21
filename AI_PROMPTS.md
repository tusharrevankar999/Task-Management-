# AI Prompts — Authentication, User Management & RBAC

## Overview

As specified in the assessment guidelines:
> *You may use an AI coding agent only for the Authentication, User Management and RBAC implementation.*
> *Add an AI_PROMPTS.md file to the GitHub repository.*
> *It should contain the actual prompts used while implementing the Authentication, User Management and RBAC functionality.*

The prompts below document the AI assistance used for database connectivity, authentication, user management, authorization, and verification of these modules.

The implementation uses **Express.js, Prisma ORM, Neon Serverless PostgreSQL, bcrypt, and JSON Web Tokens (JWT)**.

---

## Prompt 1: Neon PostgreSQL Database Connection and Prisma Configuration

### Objective
Configure and verify the backend connection to Neon PostgreSQL using Prisma ORM.

### Prompt Used

```text
Connect the existing Express.js backend to the Neon Serverless PostgreSQL
database using Prisma ORM.

First, inspect the existing backend code, Prisma schema, package.json,
environment configuration, and database setup.

Then perform the following tasks:

1. Verify that the installed Prisma CLI and @prisma/client versions
   are compatible with each other.
2. Configure the Prisma datasource to use PostgreSQL.
3. Ensure the database connection URL is read securely from the
   environment configuration rather than being hardcoded.
4. Verify the Prisma schema and synchronize the database schema
   with Neon PostgreSQL using the appropriate Prisma command.
5. Check that the Prisma Client can be imported and initialized
   correctly in the existing backend.
6. Verify the database connection and resolve any startup errors.
7. Start the Express.js backend on port 3001, following the
   existing project configuration.
8. Report the changes made and the commands required to verify
   the database connection and backend startup.

Important constraints:
- Reuse the existing project structure and configuration wherever possible.
- Do not expose database credentials or other secrets.
- Do not modify unrelated application modules.
- Explain the root cause of any errors before applying fixes.
```

### Intended Outcome

- Establish a working connection between the Express.js backend and Neon PostgreSQL.
- Resolve Prisma Client or Prisma CLI version incompatibilities.
- Synchronize the Prisma schema with the database.
- Verify that the backend starts successfully on the configured port.

---

## Prompt 2: Authentication — Registration, Login, Password Hashing, and JWT

### Objective
Implement secure user registration and login, password hashing, and JWT-based authentication.

### Prompt Used

```text
According to the assessment guidelines, AI-assisted development is
permitted only for Authentication, User Management, and Role-Based
Access Control (RBAC).

Implement the Authentication module in the existing Express.js backend
using Prisma ORM and Neon PostgreSQL.

Before making changes, inspect the existing project structure, Prisma
schema, user model, routes, middleware, and error-handling conventions.
Reuse the existing architecture wherever possible.

Implement the following endpoints:

1. POST /api/auth/register
   - Accept the user's name, email, and password.
   - Validate required fields and reject invalid input.
   - Normalize the email address consistently.
   - Check whether the email is already registered.
   - Hash the password using bcrypt with 12 salt rounds.
   - Store the user in PostgreSQL through Prisma.
   - Assign the default USER role on the server side.
   - Never accept an unrestricted role value from a public registration
     request.
   - Return an appropriate success status and response without exposing
     the password hash.

2. POST /api/auth/login
   - Accept the user's email and password.
   - Validate the request body.
   - Find the user using the normalized email address.
   - Verify the password against the stored bcrypt hash.
   - Use a consistent authentication-failure response for invalid
     credentials.
   - Consider timing differences for nonexistent users by performing
     a dummy password-hash comparison when appropriate.
   - Generate a signed JWT after successful authentication.
   - Include only the necessary claims, such as the user ID and role.
   - Configure token expiry and signing using environment variables.
   - Never expose the stored password hash or JWT signing secret.

3. GET /api/auth/me
   - Protect the endpoint with JWT authentication middleware.
   - Read the token from the Authorization: Bearer <token> header.
   - Verify the signature and expiry of the token.
   - Attach the authenticated user's identity to the request.
   - Return the authenticated user's profile without the password hash.
   - Return HTTP 401 for missing, invalid, or expired tokens.

Implementation requirements:

- Follow the existing project structure and coding conventions.
- Use Prisma for database operations.
- Handle duplicate emails and expected database errors appropriately.
- Use environment variables for sensitive configuration.
- Add suitable input validation and error handling.
- Keep authentication separate from authorization logic.
- Avoid logging passwords, password hashes, or tokens.
- Do not modify unrelated application features.

After implementation, explain the files changed and provide the commands
and API requests needed to test registration, login, and profile retrieval.
```

### Intended Outcome

- Register users securely.
- Store passwords as bcrypt hashes instead of plaintext.
- Authenticate users through JWT.
- Protect profile access using authentication middleware.
- Handle invalid credentials, duplicate registrations, and invalid tokens.

---

## Prompt 3: User Management — CRUD Operations

### Objective
Implement user management endpoints using Prisma and PostgreSQL, with appropriate access controls.

### Prompt Used

```text
Implement the User Management module in the existing Express.js backend
using Prisma ORM and Neon PostgreSQL.

This work is permitted under the assessment's AI-assisted development
allowance for Authentication, User Management, and RBAC.

First, inspect the existing user model, Prisma schema, authentication
middleware, route structure, and API response conventions.

Implement the following endpoints:

1. GET /api/users
   - Return a list of users.
   - Support pagination where appropriate.
   - Exclude password hashes and other sensitive information.
   - Restrict access to authorized administrators.

2. GET /api/users/:id
   - Retrieve a user by ID.
   - Validate the supplied ID.
   - Return an appropriate 404 response when the user does not exist.
   - Apply the required authorization checks.

3. POST /api/users
   - Allow authorized administrators to create a user.
   - Validate the supplied user details.
   - Hash the password using bcrypt before storing it.
   - Apply the appropriate default values and role-assignment rules.
   - Prevent duplicate email registrations.

4. PATCH /api/users/:id
   - Update permitted user fields.
   - Validate the supplied fields.
   - Prevent unauthorized users from changing protected fields,
     including administrative roles.
   - Support account deactivation through an explicit field if the
     existing schema supports soft deactivation.
   - Do not expose sensitive information in the response.

5. DELETE /api/users/:id
   - Implement deletion according to the existing data model and
     assessment requirements.
   - If soft deletion is required, use an appropriate deactivation
     field rather than permanently removing the record.
   - Consider related records and foreign-key constraints.
   - Restrict this operation to authorized administrators.

Security and implementation requirements:

- Use the existing Prisma schema and database configuration.
- Enforce authorization on the server for every protected endpoint.
- Do not trust a user ID, role, or permission supplied by the client
  as proof of authorization.
- Prevent mass assignment by explicitly selecting allowed fields.
- Never return password hashes.
- Use appropriate HTTP status codes and consistent error responses.
- Handle missing records, duplicate emails, invalid input, and
  database errors.
- Avoid changing unrelated application modules.

After implementation, list the endpoints, explain the authorization
rules, and provide API requests for testing each operation.
```

### Intended Outcome

- Implement user listing, retrieval, creation, updating, and deletion or deactivation.
- Protect administrative operations.
- Prevent unauthorized role changes and exposure of sensitive user data.
- Handle database errors and invalid requests appropriately.

---

## Prompt 4: Role-Based Access Control (RBAC) and Route Authorization

### Objective
Implement server-side authorization for administrative and user-specific operations.

### Prompt Used

```text
Implement Role-Based Access Control (RBAC) in the existing Express.js
backend using the current authentication middleware and Prisma schema.

The application uses the following roles:

- ADMIN
- USER

Inspect the existing routes, JWT authentication middleware, user model,
and project membership relationships before making changes.

Implement the following:

1. Authentication Middleware
   - Extract the JWT from the Authorization: Bearer <token> header.
   - Verify the token's signature and expiry.
   - Attach the authenticated identity to req.user.
   - Return HTTP 401 for missing, invalid, or expired tokens.

2. Role Authorization Middleware
   - Implement reusable middleware such as requireRole('ADMIN').
   - Ensure the middleware runs after authentication.
   - Allow only users with the required role to access protected routes.
   - Return HTTP 403 when an authenticated user lacks the required role.
   - Do not trust role values submitted in request bodies or headers.

3. Route Protection
   - Restrict user administration endpoints to ADMIN where required.
   - Protect other sensitive endpoints according to their intended
     access rules.
   - Ensure every protected route explicitly applies the required
     authentication and authorization middleware.

4. Project Membership Authorization
   - If the existing application includes project membership
     relationships, implement requireProjectMember middleware.
   - Verify membership using trusted database records.
   - Ensure users cannot access another user's project resources
     simply by changing a project ID in the request.
   - Apply the appropriate ADMIN access rules without bypassing
     unrelated security checks.

5. Error Handling
   - Return HTTP 401 when authentication fails.
   - Return HTTP 403 when authentication succeeds but authorization
     fails.
   - Use consistent error response structures.
   - Avoid revealing unnecessary internal implementation details.

6. Verification
   - Test protected endpoints without a token.
   - Test with an invalid or expired token.
   - Test administrative endpoints using an ADMIN account.
   - Test administrative endpoints using a USER account.
   - Test project resources with authorized and unauthorized users.
   - Verify that users cannot elevate their own roles through
     registration, profile updates, or user management requests.

Use the existing project architecture and avoid modifying unrelated
application modules.

Explain the middleware execution order and provide API requests or
automated tests demonstrating that each authorization rule works.
```

### Intended Outcome

- Enforce role-based permissions on the server.
- Restrict administrative endpoints to authorized administrators.
- Prevent unauthorized access to project resources where project membership applies.
- Distinguish authentication failures (401) from authorization failures (403).

---

## Prompt 5: Integration Testing and Security Verification

### Objective
Verify that authentication, user management, and RBAC work together correctly.

### Prompt Used

```text
Review and test the Authentication, User Management, and RBAC modules
implemented in the existing Express.js backend.

Do not rewrite working functionality or modify unrelated application
features. First inspect the implementation and identify any actual
issues.

Verify the following scenarios:

Authentication:
- Register a new user successfully.
- Reject registration with missing or invalid fields.
- Reject duplicate email registration.
- Confirm that passwords are stored as bcrypt hashes.
- Log in with valid credentials.
- Reject incorrect credentials.
- Reject requests to protected endpoints without a JWT.
- Reject invalid and expired JWTs.
- Retrieve the current user's profile using a valid token.

User Management:
- List users using an authorized ADMIN account.
- Retrieve an existing user.
- Handle nonexistent user IDs.
- Create and update users using the appropriate permissions.
- Verify that unauthorized users cannot access administrative
  operations.
- Verify that password hashes are never returned.
- Verify account deactivation or deletion according to the
  implementation.

RBAC:
- Confirm that ADMIN users can access permitted administrative routes.
- Confirm that USER accounts receive HTTP 403 when accessing
  ADMIN-only routes.
- Confirm that unauthenticated requests receive HTTP 401.
- Verify that users cannot change their own role or obtain elevated
  permissions through request parameters or bodies.
- If project membership is implemented, test both authorized and
  unauthorized project access.

Database and configuration:
- Verify that Prisma operations work with Neon PostgreSQL.
- Confirm that database credentials and JWT secrets are read from
  environment variables.
- Check error handling and response status codes.
- Ensure that tests do not expose secrets or modify production data.

Report the test cases, actual results, and any issues found.
Fix only issues related to the permitted modules, and distinguish
verified results from tests that have not been executed.
```

### Intended Outcome

- Verify the integration of authentication, user management, and authorization.
- Confirm that expected HTTP status codes and permission checks are enforced.
- Identify and resolve implementation issues within the permitted modules.
- Document actual test results without claiming unexecuted tests passed.

---

## Implementation Scope and Assessment Compliance

The AI-assisted implementation documented above is limited to:

1. Database connectivity and Prisma configuration required by the permitted modules.
2. Authentication using registration, login, bcrypt, and JWT.
3. User management endpoints and associated validation.
4. Role-based access control and route authorization.
5. Testing and verification of the above functionality.

Other application features should be implemented independently, in accordance with the assessment guidelines.
