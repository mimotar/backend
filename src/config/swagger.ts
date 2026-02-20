import swaggerUi from "swagger-ui-express";
import type { Express } from "express";
import { env } from "./env.js";

const PORT = env.PORT || "3000";

/**
 * OpenAPI 3.0 specification for the Mimotar API.
 * All routes are documented here for clarity and easy discovery.
 */
const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "Mimotar API",
    version: "1.0.0",
    description: `
Welcome to the **Mimotar API** documentation. This API supports:

- **Authentication** – Register and login with email (OTP) or OAuth (Google, Facebook)
- **Users** – User registration, OTP verification, and profile
- **Transactions (Tickets)** – Create, approve, reject, and manage escrow transactions
- **Disputes** – Create and manage disputes on transactions
- **Payments** – Initialize payments and handle webhooks
- **Settings** – User preferences (currency, notifications, 2FA)
- **Password reset** – Request and confirm password reset via email
- **Contacts** – Submit and manage contact form entries
- **Helpers** – Token verification (validate JWT without using Authorization header)

**Base path:** All endpoints are prefixed with \`/api\` (e.g. \`/api/user\`, \`/api/ticket\`).

**Authentication:** Many endpoints require a JWT in the \`Authorization\` header: \`Bearer <token>\`.
    `.trim(),
  },
  servers: [
    { url: `http://localhost:${PORT}`, description: "Development server" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT obtained from login or register endpoints",
      },
    },
    schemas: {
      // Reusable response wrapper
      ApiResponse: {
        type: "object",
        properties: {
          status: { type: "number", example: 200 },
          message: { type: "string" },
          data: {},
          success: { type: "boolean" },
        },
      },
      // User / Auth
      RegisterBody: {
        type: "object",
        required: ["email", "password", "firstName", "lastName"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 8 },
          firstName: { type: "string" },
          lastName: { type: "string" },
        },
      },
      LoginBody: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string" },
        },
      },
      VerifyOtpBody: {
        type: "object",
        required: ["email", "otp"],
        properties: {
          email: { type: "string", format: "email" },
          otp: { type: "string", description: "One-time password sent to email" },
        },
      },
      ResendOtpBody: {
        type: "object",
        required: ["email"],
        properties: { email: { type: "string", format: "email" } },
      },
      // Transaction (Ticket)
      TransactionTypeEnum: {
        type: "string",
        enum: ["PHYSICAL_PRODUCT", "ONLINE_PRODUCT", "SERVICE", "RENTAL", "MILESTONE_BASED_PROJECT"],
      },
      RoleEnum: { type: "string", enum: ["BUYER", "SELLER"] },
      EscrowFeePayerEnum: { type: "string", enum: ["BUYER", "SELLER", "BOTH"] },
      TransactionCreateBody: {
        type: "object",
        required: [
          "amount", "transaction_description", "pay_escrow_fee", "additional_agreement",
          "pay_shipping_cost", "creator_fullname", "creator_email", "creator_no", "creator_role",
          "receiver_fullname", "reciever_email", "receiver_no", "reciever_role", "transactionType",
          "inspection_duration", "expiresAt",
        ],
        properties: {
          amount: { type: "integer", minimum: 1 },
          transaction_description: { type: "string", maxLength: 200 },
          user_id: { type: "integer", minimum: 1 },
          pay_escrow_fee: { $ref: "#/components/schemas/EscrowFeePayerEnum" },
          additional_agreement: { type: "string", maxLength: 200 },
          pay_shipping_cost: { $ref: "#/components/schemas/EscrowFeePayerEnum" },
          creator_fullname: { type: "string" },
          creator_email: { type: "string", format: "email" },
          creator_no: { type: "string" },
          creator_address: { type: "string", nullable: true },
          creator_role: { $ref: "#/components/schemas/RoleEnum" },
          receiver_fullname: { type: "string" },
          reciever_email: { type: "string", format: "email" },
          receiver_no: { type: "string" },
          receiver_address: { type: "string", nullable: true },
          reciever_role: { $ref: "#/components/schemas/RoleEnum" },
          terms: { type: "string", nullable: true },
          transactionType: { $ref: "#/components/schemas/TransactionTypeEnum" },
          inspection_duration: { type: "integer", minimum: 1 },
          expiresAt: { type: "integer", description: "Unix timestamp" },
          isApproved: { type: "boolean" },
          files: {
            type: "array",
            maxItems: 2,
            items: {
              type: "object",
              properties: {
                fileName: { type: "string" },
                fileType: { type: "string", enum: ["image", "pdf", "doc", "other"] },
                fileUrl: { type: "string", format: "uri" },
              },
            },
          },
        },
      },
      // Dispute
      ResolutionOptionEnum: {
        type: "string",
        enum: [
          "REFUND_ONLY", "REPLACEMENT_ONLY", "REFUND_OR_REPLACEMENT",
          "PARTIAL_REPAYMENT", "RESEND_PRODUCT", "REPEAT_SERVICE",
          "CANCEL_TRANSACTION", "OTHERS",
        ],
      },
      DisputeCreateBody: {
        type: "object",
        required: ["transactionId", "reason", "description", "resolutionOption"],
        properties: {
          transactionId: { type: "integer" },
          reason: { type: "string", minLength: 2, maxLength: 100 },
          description: { type: "string", minLength: 2, maxLength: 500 },
          resolutionOption: { $ref: "#/components/schemas/ResolutionOptionEnum" },
          evidenceUrl: { type: "array", items: { type: "string", format: "uri" } },
          evidenceId: { type: "array", items: { type: "string" } },
          status: { type: "string", enum: ["ongoing", "closed", "cancel"] },
        },
      },
      // Password reset
      ConfirmEmailPasswordResetBody: {
        type: "object",
        required: ["email"],
        properties: { email: { type: "string", format: "email" } },
      },
      PasswordResetBody: {
        type: "object",
        required: ["token", "newPassword", "email"],
        properties: {
          token: { type: "string", description: "Token from reset email link" },
          newPassword: { type: "string", minLength: 8 },
          email: { type: "string", format: "email" },
        },
      },
      // Setting
      SettingFindBody: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "integer", description: "User ID whose settings to fetch" } },
      },
      SettingUpdateBody: {
        type: "object",
        required: ["user_id", "field"],
        properties: {
          user_id: { type: "integer", description: "User ID whose settings to update" },
          field: { $ref: "#/components/schemas/SettingUpdateField" },
        },
      },
      SettingUpdateField: {
        type: "object",
        description: "Partial setting fields to update. Only include fields you want to change.",
        properties: {
          defaultCurrency: { type: "string", enum: ["GBP", "USD", "NGN"], description: "Preferred display currency" },
          notificationPreference: { type: "string", enum: ["SMS", "EMAIL", "BOTH"], description: "How to receive notifications" },
          securityQuestions: { type: "array", items: { type: "string" }, maxItems: 4, description: "Security question answers (exactly 4)" },
          twoFactorAuth: { type: "boolean", description: "Whether 2FA is enabled" },
          accountStatus: { type: "string", enum: ["ACTIVE", "DISABLED", "DELETED"], description: "Account status" },
        },
      },
      Setting: {
        type: "object",
        description: "User settings record",
        properties: {
          id: { type: "integer", description: "Setting record ID" },
          user_id: { type: "integer", description: "User ID" },
          defaultCurrency: { type: "string", enum: ["GBP", "USD", "NGN"] },
          notificationPreference: { type: "string", enum: ["SMS", "EMAIL", "BOTH"] },
          securityQuestions: { type: "array", items: { type: "string" } },
          twoFactorAuth: { type: "boolean" },
          accountStatus: { type: "string", enum: ["ACTIVE", "DISABLED", "DELETED"] },
        },
      },
      // Token verification (helpers)
      VerifyTokenBody: {
        type: "object",
        required: ["token"],
        properties: {
          token: { type: "string", description: "JWT to verify (e.g. from login or stored client-side)" },
        },
      },
      // Create user (test/simple)
      CreateUserBody: {
        type: "object",
        required: ["firstName", "lastName", "email", "password"],
        properties: {
          firstName: { type: "string" },
          lastName: { type: "string" },
          email: { type: "string", format: "email" },
          password: { type: "string" },
        },
      },
      // Contact (contact form)
      ContactCreateBody: {
        type: "object",
        required: ["email", "name", "message"],
        properties: {
          email: { type: "string", format: "email" },
          name: { type: "string" },
          message: { type: "string", maxLength: 300, description: "Contact message" },
        },
      },
      ContactUpdateBody: {
        type: "object",
        description: "Partial contact fields to update. Only include fields you want to change.",
        properties: {
          email: { type: "string", format: "email" },
          name: { type: "string" },
          message: { type: "string", maxLength: 300 },
        },
      },
      Contact: {
        type: "object",
        description: "Contact form entry",
        properties: {
          id: { type: "integer", description: "Contact ID" },
          email: { type: "string", format: "email" },
          name: { type: "string" },
          message: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
  paths: {
    // ----- Root & demo -----
    "/api": {
      get: {
        summary: "Health / root",
        description: "Simple root endpoint; returns a greeting.",
        tags: ["General"],
        responses: {
          "200": { description: "Hello World" },
        },
      },
    },
    "/api/demo": {
      post: {
        summary: "Demo route",
        description: "Demo endpoint that validates a transaction-shaped body. Used for testing.",
        tags: ["General"],
        requestBody: {
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/TransactionCreateBody" } },
          },
        },
        responses: {
          "200": { description: "Demo response" },
          "400": { description: "Validation error" },
        },
      },
    },

    // ----- Auth (signup – OAuth redirects) -----
    "/api/auth/signup/google": {
      get: {
        summary: "Start Google signup",
        description: "Redirects the user to Google OAuth for signup. After auth, user is redirected to `/auth/google/verify` then to `/auth/home`.",
        tags: ["Auth (OAuth)"],
        responses: { "302": { description: "Redirect to Google" } },
      },
    },
    "/api/auth/login/google": {
      get: {
        summary: "Start Google login",
        description: "Redirects the user to Google OAuth for login. Callback then redirects to `/auth/dashboard`.",
        tags: ["Auth (OAuth)"],
        responses: { "302": { description: "Redirect to Google" } },
      },
    },
    "/api/auth/google/verify": {
      get: {
        summary: "Google OAuth callback",
        description: "Handles the redirect from Google. Not typically called directly by clients.",
        tags: ["Auth (OAuth)"],
        responses: { "302": { description: "Redirect to dashboard or home" } },
      },
    },
    "/api/auth/facebook": {
      get: {
        summary: "Start Facebook signup",
        description: "Redirects the user to Facebook OAuth for signup.",
        tags: ["Auth (OAuth)"],
        responses: { "302": { description: "Redirect to Facebook" } },
      },
    },
    "/api/auth/facebook/callback": {
      get: {
        summary: "Facebook OAuth callback",
        description: "Handles the redirect from Facebook after signup.",
        tags: ["Auth (OAuth)"],
        responses: { "302": { description: "Redirect to home" } },
      },
    },

    // ----- Users (email auth + list) – under /api/user and /api/users -----
    "/api/user": {
      get: {
        summary: "Get all users",
        description: "Returns a list of all users. Useful for admin or debugging.",
        tags: ["Users"],
        responses: {
          "200": {
            description: "List of users",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    data: { type: "array", items: { type: "object" } },
                    success: { type: "boolean" },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: "Register with email (full flow)",
        description: "Register a new user with email and password. Sends OTP to email; use **Verify OTP** to complete registration.",
        tags: ["Users"],
        requestBody: {
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/RegisterBody" } },
          },
        },
        responses: {
          "200": { description: "Registration initiated; check email for OTP" },
          "400": { description: "Validation error or email already registered" },
        },
      },
    },
    "/api/user/verify-otp": {
      post: {
        summary: "Verify OTP",
        description: "Complete registration by verifying the OTP sent to the user's email.",
        tags: ["Users"],
        requestBody: {
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/VerifyOtpBody" } },
          },
        },
        responses: {
          "200": { description: "Email verified; registration complete" },
          "400": { description: "Invalid or expired OTP" },
        },
      },
    },
    "/api/user/resend-otp": {
      post: {
        summary: "Resend OTP",
        description: "Resend the verification OTP to the given email.",
        tags: ["Users"],
        requestBody: {
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/ResendOtpBody" } },
          },
        },
        responses: {
          "200": { description: "OTP resent" },
          "400": { description: "Validation error" },
        },
      },
    },
    "/api/user/login-with-email": {
      post: {
        summary: "Login with email and password",
        description: "Authenticate with email and password. Returns a JWT and user info. Use the token in the `Authorization: Bearer <token>` header for protected routes.",
        tags: ["Users"],
        requestBody: {
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/LoginBody" } },
          },
        },
        responses: {
          "200": {
            description: "Login successful",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "number" },
                    message: { type: "string" },
                    data: {
                      type: "object",
                      properties: {
                        token: { type: "string" },
                        user: { type: "object" },
                      },
                    },
                    success: { type: "boolean" },
                  },
                },
              },
            },
          },
          "400": { description: "Invalid credentials" },
        },
      },
    },
    "/api/user/test": {
      get: {
        summary: "Protected test route",
        description: "Example of a route that requires a valid JWT. Use to verify your token.",
        tags: ["Users"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Token valid" },
          "401": { description: "Missing or invalid token" },
        },
      },
    },

    // ----- Legacy /api/users (same auth under different prefix) -----
    "/api/users/login-with-email": {
      post: {
        summary: "Login with email (alternate path)",
        description: "Same as `POST /api/user/login-with-email`. Use either path.",
        tags: ["Users"],
        requestBody: {
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/LoginBody" } },
          },
        },
        responses: { "200": { description: "Login successful" }, "400": { description: "Invalid credentials" } },
      },
    },
    "/api/users/register-with-email": {
      post: {
        summary: "Register with email (alternate path)",
        description: "Same as `POST /api/user`. Register and receive OTP by email.",
        tags: ["Users"],
        requestBody: {
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/RegisterBody" } },
          },
        },
        responses: { "200": { description: "Registration initiated" }, "400": { description: "Validation error" } },
      },
    },
    "/api/users/register-with-email/verify-otp": {
      post: {
        summary: "Verify OTP (alternate path)",
        description: "Same as `POST /api/user/verify-otp`.",
        tags: ["Users"],
        requestBody: {
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/VerifyOtpBody" } },
          },
        },
        responses: { "200": { description: "Verified" }, "400": { description: "Invalid OTP" } },
      },
    },
    "/api/users/resend-otp": {
      post: {
        summary: "Resend OTP (alternate path)",
        description: "Same as `POST /api/user/resend-otp`.",
        tags: ["Users"],
        requestBody: {
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/ResendOtpBody" } },
          },
        },
        responses: { "200": { description: "OTP resent" } },
      },
    },
    "/api/users/all-users": {
      get: {
        summary: "Get all users (alternate path)",
        description: "Same as `GET /api/user`. Returns all users.",
        tags: ["Users"],
        responses: { "200": { description: "List of users" } },
      },
    },

    // ----- Password reset -----
    "/api/password-reset/confirm-email-password-reset": {
      post: {
        summary: "Confirm email for password reset",
        description: "Sends a password reset link to the given email. Rate limited (10 requests per 10 minutes).",
        tags: ["Password reset"],
        requestBody: {
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/ConfirmEmailPasswordResetBody" } },
          },
        },
        responses: {
          "200": { description: "Reset email sent; check inbox" },
          "404": { description: "Email not found" },
        },
      },
    },
    "/api/password-reset": {
      post: {
        summary: "Set new password",
        description: "Completes the password reset using the token and email from the reset link. New password must meet complexity rules (length, uppercase, lowercase, number, special character).",
        tags: ["Password reset"],
        requestBody: {
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/PasswordResetBody" } },
          },
        },
        responses: {
          "200": { description: "Password reset successful" },
          "400": { description: "Invalid token, same as old password, or validation error" },
          "401": { description: "Token/email mismatch" },
        },
      },
    },

    // ----- Ticket (Transactions) -----
    "/api/ticket": {
      post: {
        summary: "Create transaction",
        description: "Create a new escrow transaction (ticket). Requires authentication. You may upload up to 2 files (multipart/form-data). Body fields match TransactionCreateBody.",
        tags: ["Transactions (Tickets)"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                description: "All transaction fields (amount, transaction_description, pay_escrow_fee, creator_*, receiver_*, transactionType, inspection_duration, expiresAt, etc.) plus optional files (max 2).",
                properties: {
                  amount: { type: "string" },
                  transaction_description: { type: "string" },
                  pay_escrow_fee: { type: "string" },
                  additional_agreement: { type: "string" },
                  pay_shipping_cost: { type: "string" },
                  creator_fullname: { type: "string" },
                  creator_email: { type: "string" },
                  creator_no: { type: "string" },
                  creator_address: { type: "string" },
                  creator_role: { type: "string" },
                  receiver_fullname: { type: "string" },
                  reciever_email: { type: "string" },
                  receiver_no: { type: "string" },
                  receiver_address: { type: "string" },
                  reciever_role: { type: "string" },
                  terms: { type: "string" },
                  transactionType: { type: "string" },
                  inspection_duration: { type: "string" },
                  expiresAt: { type: "string" },
                  files: { type: "array", items: { type: "string", format: "binary" }, maxItems: 2 },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Transaction created" },
          "400": { description: "Validation error" },
          "401": { description: "Unauthorized" },
        },
      },
      delete: {
        summary: "Delete all transactions",
        description: "Deletes all transactions. Use with caution.",
        tags: ["Transactions (Tickets)"],
        responses: { "200": { description: "All transactions deleted" } },
      },
    },
    "/api/ticket/transactions": {
      get: {
        summary: "Get my transactions",
        description: "Returns all transactions for the authenticated user. Rate limited.",
        tags: ["Transactions (Tickets)"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "List of transactions" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/ticket/approve/{id}": {
      put: {
        summary: "Approve transaction",
        description: "Approve a transaction by ID. Only the counterparty can approve. Rate limited.",
        tags: ["Transactions (Tickets)"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          "200": { description: "Transaction approved" },
          "401": { description: "Unauthorized" },
          "404": { description: "Transaction not found" },
        },
      },
    },
    "/api/ticket/reject/{id}": {
      put: {
        summary: "Reject transaction",
        description: "Reject a transaction by ID. Rate limited.",
        tags: ["Transactions (Tickets)"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          "200": { description: "Transaction rejected" },
          "401": { description: "Unauthorized" },
          "404": { description: "Transaction not found" },
        },
      },
    },
    "/api/ticket/{id}/request-token": {
      post: {
        summary: "Request validation token",
        description: "Request a token (e.g. OTP) to validate or complete the transaction. Rate limited.",
        tags: ["Transactions (Tickets)"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          "200": { description: "Token sent (e.g. via email)" },
          "401": { description: "Unauthorized" },
          "404": { description: "Transaction not found" },
        },
      },
    },
    "/api/ticket/{id}": {
      get: {
        summary: "Get transaction by ID",
        description: "Returns a single transaction by ID for the authenticated user. Rate limited.",
        tags: ["Transactions (Tickets)"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          "200": { description: "Transaction details" },
          "401": { description: "Unauthorized" },
          "404": { description: "Not found" },
        },
      },
      delete: {
        summary: "Delete transaction",
        description: "Deletes a single transaction by ID.",
        tags: ["Transactions (Tickets)"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          "200": { description: "Transaction deleted" },
          "400": { description: "Could not delete" },
          "404": { description: "Not found" },
        },
      },
    },

    // ----- Disputes -----
    "/api/dispute": {
      get: {
        summary: "Get my disputes",
        description: "Returns all disputes for the authenticated user. Rate limited (10 per 10 min).",
        tags: ["Disputes"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "List of disputes" },
          "401": { description: "Unauthorized" },
        },
      },
      post: {
        summary: "Create dispute",
        description: "Create a dispute for a transaction. Upload up to 5 evidence files (multipart/form-data). Rate limited.",
        tags: ["Disputes"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["transactionId", "reason", "description", "resolutionOption"],
                properties: {
                  transactionId: { type: "integer" },
                  reason: { type: "string" },
                  description: { type: "string" },
                  resolutionOption: { type: "string", enum: ["REFUND_ONLY", "REPLACEMENT_ONLY", "REFUND_OR_REPLACEMENT", "PARTIAL_REPAYMENT", "RESEND_PRODUCT", "REPEAT_SERVICE", "CANCEL_TRANSACTION", "OTHERS"] },
                  evidence: { type: "array", items: { type: "string", format: "binary" }, maxItems: 5 },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Dispute created" },
          "400": { description: "Validation error" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/dispute/{id}": {
      get: {
        summary: "Get dispute by ID",
        description: "Returns a single dispute by ID. Rate limited.",
        tags: ["Disputes"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          "200": { description: "Dispute details" },
          "401": { description: "Unauthorized" },
          "404": { description: "Not found" },
        },
      },
      delete: {
        summary: "Delete dispute",
        description: "Deletes a dispute by ID. Rate limited.",
        tags: ["Disputes"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          "200": { description: "Dispute deleted" },
          "401": { description: "Unauthorized" },
          "404": { description: "Not found" },
        },
      },
    },

    // ----- Payment -----
    "/api/payment/initialize/{id}": {
      post: {
        summary: "Initialize payment",
        description: "Starts the payment flow for an approved transaction. Returns a payment link (e.g. Flutterwave). Transaction must be in APPROVED status.",
        tags: ["Payment"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" }, description: "Transaction ID" }],
        responses: {
          "200": { description: "Payment link and details returned" },
          "400": { description: "Transaction not approved or invalid state" },
          "404": { description: "Transaction not found" },
          "500": { description: "Payment provider error" },
        },
      },
    },
    "/api/payment/webhook": {
      post: {
        summary: "Payment webhook",
        description: "Called by the payment provider (e.g. Flutterwave) to notify payment status. Do not call manually.",
        tags: ["Payment"],
        requestBody: { content: { "application/json": { schema: { type: "object" } } } },
        responses: { "200": { description: "Webhook processed" } },
      },
    },

    // ----- Settings -----
    "/api/setting": {
      get: {
        summary: "Get user settings",
        description: "Returns the settings for the given user (currency, notification preference, 2FA, account status, etc.). Send the user ID in the request body as `{ \"id\": <user_id> }`. Response shape: `{ message, data: Setting | null, success }`.",
        tags: ["Settings"],
        requestBody: {
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/SettingFindBody" } },
          },
        },
        responses: {
          "200": {
            description: "Settings fetched successfully; `data` is the setting record or null",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "setting fetch successfully" },
                    data: { $ref: "#/components/schemas/Setting" },
                    success: { type: "boolean", example: true },
                  },
                },
              },
            },
          },
          "400": { description: "Bad request (e.g. missing id)" },
          "500": { description: "Internal server error" },
        },
      },
    },
    "/api/setting/update": {
      put: {
        summary: "Update user settings",
        description: "Updates one or more setting fields for the given user. Send `user_id` and `field` (object with only the keys you want to update: defaultCurrency, notificationPreference, securityQuestions, twoFactorAuth, accountStatus). Valid enums: defaultCurrency — GBP, USD, NGN; notificationPreference — SMS, EMAIL, BOTH; accountStatus — ACTIVE, DISABLED, DELETED. Response: `{ message, data: updatedSetting[], success }`.",
        tags: ["Settings"],
        requestBody: {
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/SettingUpdateBody" } },
          },
        },
        responses: {
          "200": {
            description: "Settings updated successfully; `data` is the updated setting record(s)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "setting update successfully" },
                    data: { type: "array", items: { $ref: "#/components/schemas/Setting" } },
                    success: { type: "boolean", example: true },
                  },
                },
              },
            },
          },
          "400": { description: "Validation error (e.g. invalid field values or Zod schema failure)" },
          "500": { description: "Internal server error" },
        },
      },
    },
    // ----- Helpers (token verification) -----
    "/api/token/verify-token": {
      post: {
        summary: "Verify token",
        description: "Validates a JWT and returns the decoded payload (e.g. user id, email, exp). Use this to check if a stored token is still valid before calling protected routes. Does not require the Authorization header — send the token in the request body.",
        tags: ["Helpers"],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/VerifyTokenBody" } },
          },
        },
        responses: {
          "200": {
            description: "Token verified; decoded payload returned in data",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "number", example: 200 },
                    message: { type: "string", example: "Token verified" },
                    data: {
                      type: "object",
                      description: "Decoded JWT payload (e.g. id, email, iat, exp)",
                      additionalProperties: true,
                    },
                    success: { type: "boolean", example: true },
                  },
                },
              },
            },
          },
          "401": {
            description: "Missing token or invalid/expired token",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "number", example: 401 },
                    message: { type: "string", example: "Authorization token required" },
                    data: { type: "object", nullable: true },
                    success: { type: "boolean", example: false },
                  },
                },
              },
            },
          },
        },
      },
    },

    // Consolidated settings API (authenticated; user from JWT)
    "/api/settings": {
      get: {
        summary: "Get current user settings",
        description: "Returns the settings for the authenticated user (currency, notification preference, 2FA, account status, etc.). Requires JWT. Response: `{ message, data: Setting | null, success }`.",
        tags: ["Settings"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Settings fetched successfully; `data` is the setting record or null",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Settings fetched successfully" },
                    data: { $ref: "#/components/schemas/Setting" },
                    success: { type: "boolean", example: true },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized (missing or invalid JWT)" },
          "500": { description: "Internal server error" },
        },
      },
      put: {
        summary: "Update current user settings",
        description: "Updates one or more setting fields for the authenticated user. Send only the fields you want to change in the body (e.g. `defaultCurrency`, `notificationPreference`, `securityQuestions`, `twoFactorAuth`, `accountStatus`). Creates a settings record if none exists. Requires JWT. Valid enums: defaultCurrency — GBP, USD, NGN; notificationPreference — SMS, EMAIL, BOTH; accountStatus — ACTIVE, DISABLED, DELETED.",
        tags: ["Settings"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SettingUpdateField" },
              example: { defaultCurrency: "NGN", notificationPreference: "EMAIL" },
            },
          },
        },
        responses: {
          "200": {
            description: "Settings updated successfully; `data` is the updated setting record",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Settings updated successfully" },
                    data: { $ref: "#/components/schemas/Setting" },
                    success: { type: "boolean", example: true },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized (missing or invalid JWT)" },
          "500": { description: "Internal server error" },
        },
      },
    },

    // ----- Contact (contact form) -----
    "/api/contact": {
      post: {
        summary: "Create contact",
        description: "Submit a new contact form entry (email, name, message).",
        tags: ["Contacts"],
        requestBody: {
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/ContactCreateBody" } },
          },
        },
        responses: {
          "201": {
            description: "Contact created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Contact created" },
                    data: { $ref: "#/components/schemas/Contact" },
                    success: { type: "boolean", example: true },
                  },
                },
              },
            },
          },
          "500": { description: "Failed to create contact" },
        },
      },
      get: {
        summary: "Get all contacts",
        description: "Returns all contact form entries.",
        tags: ["Contacts"],
        responses: {
          "200": {
            description: "List of contacts",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Contacts fetched" },
                    data: { type: "array", items: { $ref: "#/components/schemas/Contact" } },
                    success: { type: "boolean", example: true },
                  },
                },
              },
            },
          },
          "500": { description: "Failed to fetch contacts" },
        },
      },
      delete: {
        summary: "Delete all contacts",
        description: "Deletes all contact form entries. Returns count of deleted records.",
        tags: ["Contacts"],
        responses: {
          "200": {
            description: "All contacts deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "All contacts deleted" },
                    data: { type: "object", description: "Delete result (e.g. count)" },
                    success: { type: "boolean", example: true },
                  },
                },
              },
            },
          },
          "500": { description: "Failed to delete contacts" },
        },
      },
    },
    "/api/contact/{id}": {
      get: {
        summary: "Get contact by ID",
        description: "Returns a single contact form entry by ID.",
        tags: ["Contacts"],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" }, description: "Contact ID" },
        ],
        responses: {
          "200": {
            description: "Contact found",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Contact fetched" },
                    data: { $ref: "#/components/schemas/Contact" },
                    success: { type: "boolean", example: true },
                  },
                },
              },
            },
          },
          "400": { description: "Invalid contact id" },
          "404": { description: "Contact not found" },
          "500": { description: "Failed to fetch contact" },
        },
      },
      put: {
        summary: "Update contact",
        description: "Update an existing contact form entry by ID.",
        tags: ["Contacts"],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" }, description: "Contact ID" },
        ],
        requestBody: {
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/ContactUpdateBody" } },
          },
        },
        responses: {
          "200": {
            description: "Contact updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Contact updated" },
                    data: { $ref: "#/components/schemas/Contact" },
                    success: { type: "boolean", example: true },
                  },
                },
              },
            },
          },
          "400": { description: "Invalid contact id" },
          "404": { description: "Contact not found" },
          "500": { description: "Failed to update contact" },
        },
      },
      delete: {
        summary: "Delete contact",
        description: "Delete a single contact form entry by ID.",
        tags: ["Contacts"],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" }, description: "Contact ID" },
        ],
        responses: {
          "200": {
            description: "Contact deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Contact deleted" },
                    success: { type: "boolean", example: true },
                  },
                },
              },
            },
          },
          "400": { description: "Invalid contact id" },
          "404": { description: "Contact not found" },
          "500": { description: "Failed to delete contact" },
        },
      },
    },
  },
};

/**
 * Mounts the Swagger UI and OpenAPI spec on the Express app.
 * Call this after all routes are registered (e.g. in app.ts).
 */
export function setupSwagger(app: Express): void {
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));
}
