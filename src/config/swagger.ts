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
- **Transactions (Tickets)** – Create, approve, reject, and manage ordinary or milestone-based escrow transactions
- **Disputes** – Create, cancel, inspect, and resolve transaction-level or milestone-level disputes
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
    {
      url: "https://mim-backend.onrender.com",
      description: "Production (Render)",
    },
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
      CurrentUser: {
        type: "object",
        required: ["id", "email", "name", "isLoggedIn"],
        properties: {
          id: { type: "string", example: "1" },
          email: { type: "string", format: "email", example: "user@example.com" },
          name: { type: "string", example: "Ada Lovelace" },
          isLoggedIn: { type: "boolean", example: true },
        },
      },
      Milestone: {
        type: "object",
        required: ["name", "amount", "deadline"],
        properties: {
          id: { type: "integer", readOnly: true },
          transaction_id: { type: "integer", readOnly: true },
          sequence: {
            type: "integer",
            minimum: 1,
            readOnly: true,
            description: "One-based execution order assigned when the transaction is created",
          },
          name: { type: "string" },
          amount: { type: "integer" },
          deadline: { type: "string", format: "date-time" },
          status: {
            type: "string",
            readOnly: true,
            enum: ["CREATED", "ONGOING", "PENDING_CLOSURE", "DISPUTE", "COMPLETED"],
          },
          activatedAt: { type: "string", format: "date-time", nullable: true, readOnly: true },
          completedAt: { type: "string", format: "date-time", nullable: true, readOnly: true },
          releasedAt: { type: "string", format: "date-time", nullable: true, readOnly: true },
          deadlineExtensions: {
            type: "array",
            readOnly: true,
            items: { $ref: "#/components/schemas/DeadlineExtension" },
          },
          files: {
            type: "array",
            items: {
              type: "object",
              properties: {
                fileName: { type: "string" },
                fileType: { type: "string", enum: ["image", "pdf", "doc", "other"] },
                fileUrl: { type: "string", format: "uri" },
              },
            },
          },
          images: {
            type: "array",
            readOnly: true,
            description: "Cloudinary-hosted milestone images. publicId is retained privately by the server for deletion.",
            items: { $ref: "#/components/schemas/MilestoneImage" },
          },
        },
      },
      MilestoneImage: {
        type: "object",
        required: ["id", "url", "createdAt"],
        properties: {
          id: { type: "integer", readOnly: true },
          url: { type: "string", format: "uri", readOnly: true },
          createdAt: { type: "string", format: "date-time", readOnly: true },
        },
      },
      // Transaction (Ticket)
      TransactionTypeEnum: {
        type: "string",
        enum: ["PHYSICAL_PRODUCT", "ONLINE_PRODUCT", "SERVICE", "RENTAL", "MILESTONE_BASED_PROJECT"],
      },
      CurrencyEnum: {
        type: "string",
        enum: ["NGN", "USD"],
      },
      RoleEnum: { type: "string", enum: ["CLIENT", "FREELANCER"] },
      EscrowFeePayerEnum: { type: "string", enum: ["CLIENT", "FREELANCER", "BOTH"] },
      TransactionCreateBody: {
        type: "object",
        required: [
          "title", "currency", "amount", "transaction_description", "pay_escrow_fee",
          "creator_fullname", "creator_email", "creator_no", "creator_role",
          "receiver_fullname", "reciever_email", "receiver_no", "transactionType",
          "inspection_duration", "expiresAt",
          "deadline",
        ],
        properties: {
          title: { type: "string", maxLength: 200 },
          currency: { $ref: "#/components/schemas/CurrencyEnum" },
          amount: { type: "integer", minimum: 1 },
          transaction_description: { type: "string", maxLength: 200 },
          pay_escrow_fee: { $ref: "#/components/schemas/EscrowFeePayerEnum" },
          additional_agreement: { type: "string", maxLength: 200, nullable: true },
          creator_fullname: { type: "string" },
          creator_email: { type: "string", format: "email" },
          creator_no: { type: "string" },
          creator_address: { type: "string", nullable: true },
          creator_role: {
            allOf: [{ $ref: "#/components/schemas/RoleEnum" }],
            description: "The creator's role. The receiver role is assigned automatically as the opposite role.",
          },
          receiver_fullname: { type: "string" },
          reciever_email: { type: "string", format: "email" },
          receiver_no: { type: "string" },
          receiver_address: { type: "string", nullable: true },
          terms: { type: "string", nullable: true },
          transactionType: { $ref: "#/components/schemas/TransactionTypeEnum" },
          deadline: {
            type: "string",
            format: "date-time",
            description: "Required expected completion date for every transaction. For milestone projects, every milestone deadline must be on or before it.",
          },
          inspection_duration: { type: "integer", minimum: 1 },
          expiresAt: { type: "integer", description: "Unix timestamp" },
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
          milestones: {
            type: "array",
            items: { $ref: "#/components/schemas/Milestone" },
          },
        },
      },
      TransactionHistory: {
        type: "object",
        description: "History of key events in the transaction lifecycle",
        properties: {
          transaction_created_at: { type: "string", format: "date-time" },
          agreement_accepted_at: { type: "string", format: "date-time", nullable: true },
          payment_sent_to_escrow_at: { type: "string", format: "date-time", nullable: true },
          inspection_started_at: { type: "string", format: "date-time", nullable: true },
          inspection_completed_at: { type: "string", format: "date-time", nullable: true },
          transaction_completed_at: { type: "string", format: "date-time", nullable: true },
        },
      },
      DeadlineExtension: {
        type: "object",
        properties: {
          id: { type: "integer", readOnly: true },
          transactionId: { type: "integer", readOnly: true },
          milestoneId: { type: "integer", nullable: true, readOnly: true },
          previousDeadline: { type: "string", format: "date-time", readOnly: true },
          newDeadline: { type: "string", format: "date-time", readOnly: true },
          reason: { type: "string", maxLength: 500, nullable: true },
          extendedById: { type: "integer", readOnly: true },
          createdAt: { type: "string", format: "date-time", readOnly: true },
        },
      },
      DeadlineExtensionBody: {
        type: "object",
        required: ["deadline"],
        properties: {
          deadline: {
            type: "string",
            format: "date-time",
            description: "A future date later than the current deadline",
          },
          reason: { type: "string", minLength: 2, maxLength: 500 },
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
      DisputeStatusEnum: {
        type: "string",
        enum: ["ongoing", "cancel", "closed"],
      },
      DisputeResolutionEnum: {
        type: "string",
        enum: ["RELEASE_TO_SELLER"],
        description: "Final action taken when the dispute is closed. Refund execution is not currently implemented.",
      },
      DisputeCreateBody: {
        type: "object",
        required: ["transactionId", "reason", "description", "resolutionOption"],
        properties: {
          transactionId: { type: "integer" },
          milestoneId: {
            type: "integer",
            description: "Required for MILESTONE_BASED_PROJECT transactions; omit for all other transaction types",
          },
          reason: { type: "string", minLength: 2, maxLength: 100 },
          description: { type: "string", minLength: 2, maxLength: 500 },
          resolutionOption: { $ref: "#/components/schemas/ResolutionOptionEnum" },
          evidenceUrl: { type: "array", items: { type: "string", format: "uri" } },
          evidenceId: { type: "array", items: { type: "string" } },
          status: { $ref: "#/components/schemas/DisputeStatusEnum" },
        },
      },
      Dispute: {
        allOf: [
          { $ref: "#/components/schemas/DisputeCreateBody" },
          {
            type: "object",
            properties: {
              id: { type: "integer", readOnly: true },
              status: { $ref: "#/components/schemas/DisputeStatusEnum" },
              resolution: {
                allOf: [{ $ref: "#/components/schemas/DisputeResolutionEnum" }],
                nullable: true,
              },
              createdAt: { type: "string", format: "date-time", nullable: true, readOnly: true },
              elapsesAt: { type: "string", format: "date-time", nullable: true, readOnly: true },
              resolvedAt: { type: "string", format: "date-time", nullable: true, readOnly: true },
              resolvedById: { type: "integer", nullable: true, readOnly: true },
              milestone: {
                allOf: [{ $ref: "#/components/schemas/Milestone" }],
                nullable: true,
                readOnly: true,
              },
            },
          },
        ],
      },
      // Password reset
      ForgotPasswordBody: {
        type: "object",
        required: ["email"],
        properties: { email: { type: "string", format: "email" } },
      },
      ResetPasswordBody: {
        type: "object",
        required: ["otp", "newPassword", "email"],
        properties: {
          otp: { type: "string", description: "6-digit OTP sent to email" },
          newPassword: { type: "string", minLength: 8 },
          email: { type: "string", format: "email" },
        },
      },
      ChangePasswordRequestBody: {
        type: "object",
        required: ["currentPassword", "newPassword", "confirmPassword"],
        properties: {
          currentPassword: { type: "string", format: "password" },
          newPassword: {
            type: "string",
            format: "password",
            minLength: 8,
            maxLength: 32,
            description: "Must contain uppercase, lowercase, number, and one of @$!%*?&",
          },
          confirmPassword: { type: "string", format: "password" },
        }
      },
      ChangePasswordVerifyBody: {
        type: "object",
        required: ["otp"],
        properties: {
          otp: {
            type: "string",
            pattern: "^[0-9]{6}$",
            example: "123456",
            description: "Six-digit OTP sent to the authenticated user's email",
          },
        }
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
      UpdateProfileBody: {
        type: "object",
        description: "Body to update the user profile",
        properties: {
          fullName: { type: "string" },
          phone_no: { type: "string" },
          address: { type: "string" },
          city: { type: "string" },
          country: { type: "string" },
          postal_code: { type: "string" },
          id_number: { type: "string" },
        },
      },
      ProfileResponse: {
        type: "object",
        properties: {
          fullName: { type: "string" },
          email: { type: "string", format: "email" },
          phone_no: { type: "string", nullable: true },
          address: { type: "string", nullable: true },
          city: { type: "string", nullable: true },
          country: { type: "string", nullable: true },
          postal_code: { type: "string", nullable: true },
          id_number: { type: "string", nullable: true },
        },
      },
      KycChannel: {
        type: "object",
        properties: {
          key: {
            type: "string",
            example: "nin",
            description: "Channel identifier to pass as `channel` when verifying identity.",
          },
          endpoint: { type: "string", example: "verification/vnin-basic" },
          requiredFields: {
            type: "array",
            items: { type: "string" },
            example: ["number"],
          },
        },
      },
      KycCountryChannels: {
        type: "object",
        properties: {
          code: { type: "string", example: "NG" },
          name: { type: "string", example: "Nigeria" },
          channels: {
            type: "array",
            items: { $ref: "#/components/schemas/KycChannel" },
          },
        },
      },
      VerifyIdentityBody: {
        type: "object",
        required: ["country", "channel", "data"],
        properties: {
          country: {
            type: "string",
            example: "NG",
            description: "Country code from `/api/kyc/channels`.",
          },
          channel: {
            type: "string",
            example: "nin",
            description: "Verification channel key from `/api/kyc/channels`.",
          },
          data: {
            type: "object",
            additionalProperties: true,
            description: "Fields required by the selected channel. Send identity numbers as strings, not JSON numbers, so leading zeros or letters are preserved.",
            example: { number: "12345678901" },
          },
        },
      },
      NormalizedIdentity: {
        type: "object",
        properties: {
          firstName: { type: "string", example: "Ada" },
          middleName: { type: "string", example: "Nneka" },
          lastName: { type: "string", example: "Lovelace" },
          sureName: { type: "string", example: "Lovelace" },
        },
      },
      UserKyc: {
        type: "object",
        nullable: true,
        properties: {
          id: { type: "integer", example: 1 },
          userId: { type: "integer", example: 12 },
          isVerified: { type: "boolean", example: true },
          kycDocumentType: { type: "string", example: "nin", nullable: true },
          kycDocumentNumber: { type: "string", example: "12345678901", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      VerifyIdentityResponse: {
        type: "object",
        properties: {
          isVerified: { type: "boolean", example: true },
          kyc: { $ref: "#/components/schemas/UserKyc" },
          identity: { $ref: "#/components/schemas/NormalizedIdentity" },
          providerResponse: {
            type: "object",
            additionalProperties: true,
            description: "Raw response returned by Prembly.",
          },
        },
      },
      CreateNotificationBody: {
        type: "object",
        required: ["title", "avatar", "sender_user_id", "receiver_user_id"],
        properties: {
          title: { type: "string" },
          content: { type: "string", nullable: true },
          link: { type: "string", nullable: true },
          avatar: { type: "string" },
          sender_user_id: { type: "integer" },
          receiver_user_id: { type: "integer" },
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
    "/api/user/exists": {
      get: {
        summary: "Check whether a user exists",
        description: "Returns whether a user with the given email exists in the database.",
        tags: ["Users"],
        parameters: [
          {
            name: "email",
            in: "query",
            required: true,
            schema: { type: "string", format: "email" },
            description: "Email address to check",
          },
        ],
        responses: {
          "200": {
            description: "User existence status",
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
                        exists: { type: "boolean" },
                      },
                    },
                    success: { type: "boolean" },
                  },
                },
              },
            },
          },
          "400": { description: "Missing or invalid email query parameter" },
        },
      },
    },
    "/api/user/current-user": {
      get: {
        summary: "Get the current user",
        description: "Returns the currently authenticated user. Send the JWT obtained during login as `Authorization: Bearer <token>`.",
        tags: ["Users"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Current user retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "number", example: 200 },
                    message: { type: "string", example: "Current user retrieved successfully" },
                    data: { $ref: "#/components/schemas/CurrentUser" },
                    success: { type: "boolean", example: true },
                  },
                },
              },
            },
          },
          "401": {
            description: "Missing, invalid, or expired authentication token",
          },
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
    "/api/password/forgot": {
      post: {
        summary: "Request a password reset",
        description: "Starts the forgot-password flow by sending a 6-digit reset OTP to the given email. Rate limited (10 requests per 10 minutes).",
        tags: ["Password reset"],
        requestBody: {
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/ForgotPasswordBody" } },
          },
        },
        responses: {
          "200": { description: "Reset OTP sent; check inbox" },
          "404": { description: "Email not found" },
          "502": { description: "Reset email could not be delivered" },
        },
      },
    },
    "/api/password/reset": {
      post: {
        summary: "Set new password (OTP)",
        description: "Completes the password reset using the OTP and email. New password must meet complexity rules (length, uppercase, lowercase, number, special character).",
        tags: ["Password reset"],
        requestBody: {
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/ResetPasswordBody" } },
          },
        },
        responses: {
          "200": { description: "Password reset successful" },
          "400": { description: "Invalid OTP, same as old password, or validation error" },
          "401": { description: "Not registered user" },
        },
      },
    },

    // ----- Change Password (Authenticated) -----
    "/api/user/change-password/request": {
      post: {
        summary: "Request a password change",
        description: "Validates the current password and matching new-password fields, then sends a 15-minute OTP to the authenticated user's registered email. The proposed password is securely held until OTP verification.",
        tags: ["Users (Auth)"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/ChangePasswordRequestBody" } },
          },
        },
        responses: {
          "200": { description: "Change password request accepted, OTP sent" },
          "400": { description: "Validation failed, current password is incorrect, or new password matches current password" },
          "401": { description: "Unauthorized" },
          "502": { description: "OTP email could not be delivered" },
        },
      },
    },
    "/api/user/change-password/verify": {
      post: {
        summary: "Verify and apply a password change",
        description: "Verifies the six-digit OTP and applies the password saved during the request step. OTPs expire after 15 minutes and can only be used once.",
        tags: ["Users (Auth)"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/ChangePasswordVerifyBody" } },
          },
        },
        responses: {
          "200": { description: "Password successfully changed" },
          "400": { description: "No active request, or OTP is invalid, expired, or already used" },
          "401": { description: "Unauthorized" },
        },
      },
    },

    // ----- Notifications -----
    "/api/notification": {
      get: {
        summary: "Get my notifications",
        description: "Returns all notifications for the authenticated user, ordered by most recent first.",
        tags: ["Notifications"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "List of notifications" },
          "401": { description: "Unauthorized" },
        },
      },
      post: {
        summary: "Create notification",
        description: "Creates a new notification. Typically an internal operation but exposed for completeness.",
        tags: ["Notifications"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/CreateNotificationBody" } },
          },
        },
        responses: {
          "201": { description: "Notification created" },
          "401": { description: "Unauthorized" },
          "500": { description: "Server error" },
        },
      },
    },
    "/api/notification/read-all": {
      put: {
        summary: "Mark all notifications as read",
        description: "Marks all unread notifications for the authenticated user as read.",
        tags: ["Notifications"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "All notifications marked as read" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/notification/{id}/read": {
      put: {
        summary: "Mark a notification as read",
        description: "Marks a specific notification as read by its ID.",
        tags: ["Notifications"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          "200": { description: "Notification marked as read" },
          "401": { description: "Unauthorized" },
          "404": { description: "Notification not found" },
        },
      },
    },
    "/api/notification/{id}": {
      delete: {
        summary: "Delete a notification",
        description: "Deletes a specific notification by its ID.",
        tags: ["Notifications"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          "200": { description: "Notification deleted" },
          "401": { description: "Unauthorized" },
          "404": { description: "Notification not found" },
        },
      },
    },

    // ----- Ticket (Transactions) -----
    "/api/ticket": {
      post: {
        summary: "Create transaction",
        description: "Create a new escrow transaction. Supply only creator_role; the receiver is assigned the opposite role automatically (CLIENT ↔ FREELANCER). Every transaction requires deadline, its expected completion date. A MILESTONE_BASED_PROJECT additionally requires at least one milestone, each with a deadline on or before the transaction deadline. expiresAt controls approval-link expiry, not completion.",
        tags: ["Transactions (Tickets)"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                description: "Transaction fields plus optional files (max 2). Supply creator_role only; reciever_role is derived automatically as the opposite role.",
                required: [
                  "title", "currency", "amount", "transaction_description", "pay_escrow_fee",
                  "creator_fullname", "creator_email", "creator_no", "creator_role",
                  "receiver_fullname", "reciever_email", "receiver_no", "transactionType",
                  "inspection_duration", "expiresAt", "deadline",
                ],
                properties: {
                  title: { type: "string" },
                  currency: { $ref: "#/components/schemas/CurrencyEnum" },
                  amount: { type: "integer" },
                  transaction_description: { type: "string" },
                  pay_escrow_fee: { $ref: "#/components/schemas/EscrowFeePayerEnum" },
                  additional_agreement: { type: "string", nullable: true },
                  creator_fullname: { type: "string" },
                  creator_email: { type: "string", format: "email" },
                  creator_no: { type: "string" },
                  creator_address: { type: "string", nullable: true },
                  creator_role: {
                    allOf: [{ $ref: "#/components/schemas/RoleEnum" }],
                    description: "The creator's role. The receiver role is assigned automatically as the opposite role.",
                  },
                  receiver_fullname: { type: "string" },
                  reciever_email: { type: "string", format: "email" },
                  receiver_no: { type: "string" },
                  receiver_address: { type: "string", nullable: true },
                  terms: { type: "string", nullable: true },
                  transactionType: { $ref: "#/components/schemas/TransactionTypeEnum" },
                  deadline: { type: "string", format: "date-time", description: "Required expected completion date for every transaction" },
                  inspection_duration: { type: "integer" },
                  expiresAt: { type: "integer" },
                  files: { type: "array", items: { type: "string", format: "binary" }, maxItems: 2 },
                  milestones: { type: "array", items: { $ref: "#/components/schemas/Milestone" } },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Transaction created with ordered project milestones when applicable" },
          "400": { description: "Validation error" },
          "401": { description: "Unauthorized" },
        },
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
    "/api/ticket/projects": {
      get: {
        summary: "List my projects (paginated)",
        description:
          "Returns paginated projects where the authenticated user is creator or receiver. Supports text search, status filter (including COMPLETED and all other StatusEnum values), and amount filters. Each item includes full transaction detail plus myRole, counterparty, dueAt, and milestoneSummary.",
        tags: ["Transactions (Tickets)"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "page",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, default: 1 },
          },
          {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 50, default: 10 },
          },
          {
            name: "q",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Case-insensitive search on title or description",
          },
          {
            name: "status",
            in: "query",
            required: false,
            schema: { type: "string" },
            description:
              "Comma-separated StatusEnum values. Allowed: CREATED, APPROVED, ONGOING, PENDING_CLOSURE, DISPUTE, REJECTED, CANCELED, EXPIRED, CHANGES_REQUESTED, COMPLETED. Omit for all statuses.",
            example: "COMPLETED,ONGOING,DISPUTE",
          },
          {
            name: "amount",
            in: "query",
            required: false,
            schema: { type: "integer" },
            description: "Exact transaction amount match",
          },
          {
            name: "minAmount",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 0 },
            description: "Inclusive minimum amount",
          },
          {
            name: "maxAmount",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1 },
            description: "Inclusive maximum amount",
          },
        ],
        responses: {
          "200": {
            description: "Paginated project list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    data: {
                      type: "object",
                      properties: {
                        items: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              id: { type: "integer" },
                              title: { type: "string" },
                              status: { type: "string" },
                              amount: { type: "integer" },
                              transaction_description: { type: "string" },
                              myRole: { type: "string", enum: ["CLIENT", "FREELANCER"] },
                              counterparty: {
                                type: "object",
                                properties: {
                                  name: { type: "string" },
                                  email: { type: "string" },
                                  role: { type: "string", enum: ["CLIENT", "FREELANCER"] },
                                },
                              },
                              dueAt: { type: "string", format: "date-time" },
                              milestoneSummary: {
                                type: "object",
                                nullable: true,
                                properties: {
                                  total: { type: "integer" },
                                  activeIndex: { type: "integer", nullable: true },
                                  completedCount: { type: "integer" },
                                  active: {
                                    type: "object",
                                    nullable: true,
                                    properties: {
                                      id: { type: "integer" },
                                      sequence: { type: "integer" },
                                      name: { type: "string" },
                                      status: { type: "string" },
                                      amount: { type: "integer" },
                                    },
                                  },
                                },
                              },
                            },
                          },
                        },
                        pagination: {
                          type: "object",
                          properties: {
                            page: { type: "integer" },
                            limit: { type: "integer" },
                            total: { type: "integer" },
                            totalPages: { type: "integer" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": { description: "Invalid query parameters" },
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
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["otp", "rejection_reason"],
                properties: {
                  otp: { type: "string", description: "6-digit verification code" },
                  rejection_reason: { type: "string", description: "Reason for rejecting the transaction" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Transaction rejected" },
          "400": { description: "Validation error or invalid OTP" },
          "401": { description: "Unauthorized" },
          "404": { description: "Transaction not found" },
        },
      },
    },
    "/api/ticket/{id}/resolve": {
      put: {
        summary: "Request closure of a non-milestone transaction",
        description: "Moves an ordinary transaction to PENDING_CLOSURE and schedules auto-closure after 48 hours. Use the milestone-specific route for MILESTONE_BASED_PROJECT transactions.",
        tags: ["Transactions (Tickets)"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          "200": { description: "Transaction resolution requested" },
          "400": { description: "Transaction is not ongoing" },
          "401": { description: "Unauthorized" },
          "403": { description: "User is not a transaction participant" },
          "404": { description: "Transaction not found" },
        },
      },
    },
    "/api/ticket/{id}/accept-resolution": {
      put: {
        summary: "Accept closure of a non-milestone transaction",
        description: "The buyer accepts the closure request. Escrow is released exactly once, the transaction becomes COMPLETED, and the 48-hour timer is removed.",
        tags: ["Transactions (Tickets)"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          "200": { description: "Transaction closure accepted" },
          "400": { description: "Transaction is not pending closure" },
          "401": { description: "Unauthorized" },
          "403": { description: "Only the buyer can approve escrow release" },
          "404": { description: "Transaction not found" },
        },
      },
    },
    "/api/ticket/{id}/reject-resolution": {
      put: {
        summary: "Reject transaction resolution",
        description: "Rejects the closure request and moves the transaction to DISPUTE status. Cancels the 48-hour auto-completion timer.",
        tags: ["Transactions (Tickets)"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          "200": { description: "Transaction closure rejected (Moved to dispute)" },
          "400": { description: "Transaction is not pending closure" },
          "401": { description: "Unauthorized" },
          "403": { description: "User is not a transaction participant" },
          "404": { description: "Transaction not found" },
        },
      },
    },
    "/api/ticket/{id}/request-changes": {
      post: {
        summary: "Receiver requests changes before approval",
        description:
          "While the transaction is CREATED, the receiver can request the creator to revise commercial terms instead of rejecting. Requires a comment. Moves status to CHANGES_REQUESTED.",
        tags: ["Transactions (Tickets)"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["comment"],
                properties: {
                  comment: { type: "string", minLength: 1, maxLength: 500 },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Changes requested; creator notified" },
          "403": { description: "Only the receiver can request changes" },
          "409": { description: "Transaction is not in CREATED status" },
        },
      },
    },
    "/api/ticket/{id}/revise": {
      patch: {
        summary: "Creator revises commercial terms after a change request",
        description:
          "Allowed only while status is CHANGES_REQUESTED. Updates title, amount, description, terms, deadlines, fees, files, and milestones. Does not resubmit for approval.",
        tags: ["Transactions (Tickets)"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  amount: { type: "integer" },
                  transaction_description: { type: "string" },
                  terms: { type: "string", nullable: true },
                  additional_agreement: { type: "string", nullable: true },
                  deadline: { type: "string", format: "date-time" },
                  inspection_duration: { type: "integer" },
                  pay_escrow_fee: { type: "string", enum: ["CLIENT", "FREELANCER", "BOTH"] },
                  pay_shipping_cost: { type: "string", enum: ["CLIENT", "FREELANCER", "BOTH"], nullable: true },
                  files: { type: "array", items: { type: "object" } },
                  milestones: { type: "array", items: { type: "object" } },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Transaction revised" },
          "403": { description: "Only the creator can revise" },
          "409": { description: "Transaction is not CHANGES_REQUESTED" },
        },
      },
    },
    "/api/ticket/{id}/resubmit": {
      post: {
        summary: "Creator resubmits revised transaction for approval",
        description:
          "Moves CHANGES_REQUESTED back to CREATED, increments revision_count, and notifies the receiver to approve again. Keeps the last change_request_comment for display.",
        tags: ["Transactions (Tickets)"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          "200": { description: "Resubmitted; receiver notified" },
          "403": { description: "Only the creator can resubmit" },
          "409": { description: "Transaction is not CHANGES_REQUESTED" },
        },
      },
    },
    "/api/ticket/{id}/cancel-request": {
      post: {
        summary: "Request or apply transaction cancel",
        description:
          "For CREATED/APPROVED/CHANGES_REQUESTED (unpaid), cancels immediately. For ONGOING/PENDING_CLOSURE/DISPUTE, creates a mutual cancel request that the counterparty must approve. On funded cancel approval, escrow minus the 3% platform fee is refunded to the buyer wallet and payment is marked REFUNDED.",
        tags: ["Transactions (Tickets)"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { reason: { type: "string", maxLength: 500 } },
              },
            },
          },
        },
        responses: {
          "200": { description: "Canceled immediately or cancel request pending" },
          "401": { description: "Unauthorized" },
          "403": { description: "Not a participant" },
          "409": { description: "Invalid status or cancel already requested" },
        },
      },
    },
    "/api/ticket/{id}/cancel-approve": {
      post: {
        summary: "Approve a pending mutual cancel request",
        tags: ["Transactions (Tickets)"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          "200": { description: "Transaction canceled; escrow refunded less 3% platform fee when applicable" },
          "403": { description: "Requester cannot approve their own cancel" },
          "409": { description: "No pending cancel request" },
        },
      },
    },
    "/api/ticket/{id}/cancel-reject": {
      post: {
        summary: "Reject a pending mutual cancel request",
        tags: ["Transactions (Tickets)"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          "200": { description: "Cancel request cleared; transaction continues" },
          "409": { description: "No pending cancel request" },
        },
      },
    },
    "/api/ticket/{id}/deadline": {
      patch: {
        summary: "Extend transaction deadline",
        description: "Extends the expected completion date of any active transaction, including non-milestone transactions. The new date must be later than the current deadline and cannot be earlier than any milestone deadline. The change is retained in the deadline-extension audit history.",
        tags: ["Transactions (Tickets)"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" }, description: "Project transaction ID" }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/DeadlineExtensionBody" } },
          },
        },
        responses: {
          "200": { description: "Transaction deadline extended and audit record created" },
          "400": { description: "Invalid deadline" },
          "401": { description: "Unauthorized" },
          "403": { description: "Only a transaction participant can extend the deadline" },
          "404": { description: "Transaction not found" },
          "409": { description: "Deadline did not move later, project is inactive, or concurrent update conflict" },
        },
      },
    },
    "/api/ticket/{id}/milestones/{milestoneId}/deadline": {
      patch: {
        summary: "Extend milestone deadline",
        description: "Extends an incomplete milestone deadline. The new date must be later than its current deadline and cannot exceed the parent transaction deadline. Extend the transaction first when more room is required. Every change is audited.",
        tags: ["Transactions (Tickets)"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" }, description: "Project transaction ID" },
          { name: "milestoneId", in: "path", required: true, schema: { type: "integer" }, description: "Milestone ID" },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/DeadlineExtensionBody" } },
          },
        },
        responses: {
          "200": { description: "Milestone deadline extended and audit record created" },
          "400": { description: "Invalid date, milestone mismatch, or transaction deadline would be exceeded" },
          "401": { description: "Unauthorized" },
          "403": { description: "Only a transaction participant can extend the deadline" },
          "404": { description: "Milestone or transaction not found" },
          "409": { description: "Deadline did not move later, milestone is completed, or concurrent update conflict" },
        },
      },
    },
    "/api/ticket/{id}/milestones/{milestoneId}/images": {
      post: {
        summary: "Attach images to a milestone",
        description: "Uploads up to five images to Cloudinary and immediately stores their references. Only the transaction creator may upload, and only while the transaction is CREATED. A milestone may contain at most five images in total.",
        tags: ["Transactions (Tickets)"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
          { name: "milestoneId", in: "path", required: true, schema: { type: "integer" } },
        ],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["images"],
                properties: {
                  images: {
                    type: "array",
                    maxItems: 5,
                    items: { type: "string", format: "binary" },
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Images uploaded and saved" },
          "400": { description: "Invalid file, image limit exceeded, or invalid path parameter" },
          "401": { description: "Unauthorized" },
          "403": { description: "Only the transaction creator can manage images" },
          "404": { description: "Milestone does not belong to the transaction" },
          "409": { description: "Transaction is no longer editable" },
        },
      },
    },
    "/api/ticket/{id}/milestones/{milestoneId}/images/{imageId}": {
      delete: {
        summary: "Remove a milestone image",
        description: "Deletes the asset from Cloudinary and then removes its database record. Only the transaction creator may delete images while the transaction is CREATED.",
        tags: ["Transactions (Tickets)"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
          { name: "milestoneId", in: "path", required: true, schema: { type: "integer" } },
          { name: "imageId", in: "path", required: true, schema: { type: "integer" } },
        ],
        responses: {
          "204": { description: "Image deleted" },
          "401": { description: "Unauthorized" },
          "403": { description: "Only the transaction creator can manage images" },
          "404": { description: "Milestone or image not found" },
          "409": { description: "Transaction is no longer editable" },
        },
      },
    },
    "/api/ticket/{id}/milestones/{milestoneId}/resolve": {
      put: {
        summary: "Request closure of a milestone",
        description: "Moves the active milestone and parent transaction to PENDING_CLOSURE and schedules auto-closure after 48 hours. Only an ONGOING or DISPUTE-marked milestone belonging to the transaction can enter closure.",
        tags: ["Transactions (Tickets)"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" }, description: "Transaction ID" },
          { name: "milestoneId", in: "path", required: true, schema: { type: "integer" }, description: "Active milestone ID" },
        ],
        responses: {
          "200": { description: "Milestone closure requested" },
          "400": { description: "Milestone is missing, does not belong to the transaction, or is not active" },
          "401": { description: "Unauthorized" },
          "403": { description: "User is not a transaction participant" },
          "404": { description: "Transaction not found" },
        },
      },
    },
    "/api/ticket/{id}/milestones/{milestoneId}/accept-resolution": {
      put: {
        summary: "Accept milestone closure and release escrow",
        description: "The buyer accepts milestone completion. Only that milestone's net amount is released, the milestone becomes COMPLETED, and the next milestone becomes ONGOING. Completing the final milestone completes the parent transaction.",
        tags: ["Transactions (Tickets)"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" }, description: "Transaction ID" },
          { name: "milestoneId", in: "path", required: true, schema: { type: "integer" }, description: "Pending milestone ID" },
        ],
        responses: {
          "200": { description: "Milestone escrow released and next milestone activated, or project completed" },
          "400": { description: "Transaction or milestone is not pending closure" },
          "401": { description: "Unauthorized" },
          "403": { description: "Only the buyer can approve escrow release" },
          "404": { description: "Transaction not found" },
          "409": { description: "Milestone is not ready for settlement" },
        },
      },
    },
    "/api/ticket/{id}/milestones/{milestoneId}/reject-resolution": {
      put: {
        summary: "Reject milestone closure",
        description: "Moves the milestone and parent transaction to DISPUTE and removes the scheduled closure job. A participant must then open the detailed dispute using POST /api/dispute with the same transactionId and milestoneId.",
        tags: ["Transactions (Tickets)"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" }, description: "Transaction ID" },
          { name: "milestoneId", in: "path", required: true, schema: { type: "integer" }, description: "Pending milestone ID" },
        ],
        responses: {
          "200": { description: "Milestone closure rejected and scope moved to DISPUTE" },
          "400": { description: "Transaction is not pending closure or milestone is invalid" },
          "401": { description: "Unauthorized" },
          "403": { description: "User is not a transaction participant" },
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
          "200": {
            description: "Transaction details retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Transaction retrieved successfully" },
                    data: {
                      type: "object",
                      properties: {
                        id: { type: "integer" },
                        amount: { type: "integer" },
                        transaction_description: { type: "string" },
                        status: { type: "string" },
                        deadline: { type: "string", format: "date-time" },
                        deadlineExtensions: {
                          type: "array",
                          items: { $ref: "#/components/schemas/DeadlineExtension" },
                        },
                        milestones: {
                          type: "array",
                          items: { $ref: "#/components/schemas/Milestone" },
                        },
                        history: { $ref: "#/components/schemas/TransactionHistory" },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
          "404": { description: "Not found" },
        },
      },
      delete: {
        summary: "Delete transaction",
        description: "Deletes a CREATED transaction and its Cloudinary attachments. Only the transaction creator can perform this operation.",
        tags: ["Transactions (Tickets)"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          "200": { description: "Transaction deleted" },
          "400": { description: "Invalid transaction ID" },
          "401": { description: "Unauthorized" },
          "403": { description: "Only the transaction creator can delete it" },
          "404": { description: "Transaction not found" },
          "409": { description: "Transaction is no longer in CREATED status" },
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
          "200": {
            description: "List of transaction-level and milestone-level disputes visible to the user",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    status: { type: "string", example: "success" },
                    data: { type: "array", items: { $ref: "#/components/schemas/Dispute" } },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
        },
      },
      post: {
        summary: "Create dispute",
        description: "Create a dispute for a transaction or its active milestone. milestoneId is required for milestone projects. Upload up to 5 evidence files (multipart/form-data). Rate limited.",
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
                  milestoneId: { type: "integer", description: "Required for milestone projects" },
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
          "201": {
            description: "Dispute created; the transaction and active milestone, when applicable, move to DISPUTE",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    status: { type: "string", example: "success" },
                    dispute: { $ref: "#/components/schemas/Dispute" },
                  },
                },
              },
            },
          },
          "400": { description: "Validation error, missing milestoneId, or milestone/transaction mismatch" },
          "401": { description: "Unauthorized" },
          "403": { description: "User is not a transaction participant" },
          "404": { description: "Transaction, milestone, or user not found" },
          "409": { description: "Scope is not disputable or an ongoing dispute already exists" },
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
          "200": {
            description: "Dispute details including its transaction and optional milestone",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    status: { type: "string", example: "success" },
                    payload: { $ref: "#/components/schemas/Dispute" },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
          "403": { description: "User cannot view this dispute" },
          "404": { description: "Not found" },
        },
      },
      delete: {
        summary: "Cancel dispute",
        description: "Cancels an ongoing dispute without deleting its audit record. Only the dispute creator can cancel it.",
        tags: ["Disputes"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          "200": { description: "Dispute cancelled" },
          "401": { description: "Unauthorized" },
          "403": { description: "Only the dispute creator can cancel it" },
          "404": { description: "Not found" },
          "409": { description: "Only an ongoing dispute can be cancelled" },
        },
      },
    },
    "/api/dispute/{id}/resolve": {
      patch: {
        summary: "Resolve dispute and release escrow",
        description: "Closes an ongoing dispute in the seller's favour. The buyer must authorize the request. For a milestone dispute, only that milestone is released and the next milestone is activated.",
        tags: ["Disputes"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          "200": { description: "Dispute closed and escrow released exactly once" },
          "401": { description: "Unauthorized" },
          "403": { description: "Only the transaction buyer can approve release" },
          "404": { description: "Dispute not found" },
          "409": { description: "Dispute already resolved or cancelled" },
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
    // ----- Profile -----
    "/api/profile": {
      get: {
        summary: "Get user profile",
        description: "Returns the authenticated user's profile.",
        tags: ["Profile"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Profile Details",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/ProfileResponse" },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
        },
      },
      put: {
        summary: "Update user profile",
        description: "Update the authenticated user's profile details.",
        tags: ["Profile"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/UpdateProfileBody" } },
          },
        },
        responses: {
          "200": {
            description: "Profile updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/ProfileResponse" },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/profile/avatar": {
      post: {
        summary: "Upload profile avatar",
        description: "Uploads an image file to be used as the user's profile avatar.",
        tags: ["Profile"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  avatar: {
                    type: "string",
                    format: "binary",
                    description: "The image file to upload",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Avatar uploaded successfully",
          },
          "400": { description: "No image file provided" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    // ----- KYC -----
    "/api/kyc/channels": {
      get: {
        summary: "List supported KYC channels",
        description: "Returns the country/channel combinations configured for Prembly identity verification and their required payload fields.",
        tags: ["KYC"],
        responses: {
          "200": {
            description: "KYC channels fetched successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    success: { type: "boolean" },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/KycCountryChannels" },
                    },
                  },
                },
              },
            },
          },
          "500": { description: "Failed to fetch KYC channels" },
        },
      },
    },
    "/api/kyc/status": {
      get: {
        summary: "Get authenticated user's KYC status",
        description: "Returns the current KYC record for the authenticated user, or null if no identity verification has been attempted.",
        tags: ["KYC"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "KYC status fetched successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/UserKyc" },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
          "500": { description: "Failed to fetch KYC status" },
        },
      },
    },
    "/api/kyc/verify": {
      post: {
        summary: "Verify authenticated user's identity",
        description: "Uses the configured Prembly country/channel mapping to verify identity. On successful verification, the user table is updated with normalized firstName, middleName, lastName, and sureName values returned by the provider.",
        tags: ["KYC"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/VerifyIdentityBody" },
              examples: {
                nin: {
                  summary: "Nigeria NIN",
                  value: {
                    country: "NG",
                    channel: "nin",
                    data: { number: "12345678901" },
                  },
                },
                driversLicense: {
                  summary: "Nigeria driver's license",
                  value: {
                    country: "NG",
                    channel: "driver_license",
                    data: {
                      number: "ABC12345678",
                      first_name: "Ada",
                      last_name: "Lovelace",
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Identity verification completed",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/VerifyIdentityResponse" },
                  },
                },
              },
            },
          },
          "400": { description: "Missing fields or unsupported country/channel" },
          "401": { description: "Unauthorized" },
          "502": { description: "Prembly rejected the request or returned an upstream error. The response includes provider status and response data when available." },
        },
      },
    },
    // ----- Withdrawals -----
    "/api/withdrawal/banks": {
      get: {
        summary: "List Nigerian banks (Flutterwave)",
        tags: ["Withdrawals"],
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Bank list" }, "401": { description: "Unauthorized" } },
      },
    },
    "/api/withdrawal/bank": {
      get: {
        summary: "Get my saved bank account",
        tags: ["Withdrawals"],
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Bank account or null" }, "401": { description: "Unauthorized" } },
      },
      put: {
        summary: "Resolve and save bank account",
        description:
          "Requires email verification + Prembly KYC. Resolves account via Flutterwave and soft-matches account name to KYC legal name before saving.",
        tags: ["Withdrawals"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["bankCode", "accountNumber"],
                properties: {
                  bankCode: { type: "string", example: "044" },
                  accountNumber: { type: "string", example: "0123456789" },
                  bankName: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Bank saved" },
          "403": { description: "Email or KYC not verified" },
          "409": { description: "Name mismatch" },
        },
      },
    },
    "/api/withdrawal/request": {
      post: {
        summary: "Request withdrawal (sends OTP)",
        description:
          "NGN min 5000 (auto Flutterwave after OTP). USD min 50 (queued PENDING_MANUAL for admin after OTP). Debit happens only after OTP confirm.",
        tags: ["Withdrawals"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["amount", "currency"],
                properties: {
                  amount: { type: "number", example: 5000 },
                  currency: { type: "string", enum: ["NGN", "USD"] },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "OTP sent; returns withdrawalId" },
          "403": { description: "Email/KYC gate failed" },
          "409": { description: "Insufficient balance / bank required / in progress" },
        },
      },
    },
    "/api/withdrawal/{id}/confirm": {
      post: {
        summary: "Confirm withdrawal with OTP",
        description:
          "Debits wallet immediately. NGN initiates Flutterwave transfer (refund on hard failure). USD moves to PENDING_MANUAL for admin payout.",
        tags: ["Withdrawals"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["otp"],
                properties: { otp: { type: "string", pattern: "^\\d{6}$" } },
              },
            },
          },
        },
        responses: {
          "200": { description: "Withdrawal processing / queued / completed" },
          "400": { description: "Invalid or expired OTP" },
        },
      },
    },
    "/api/withdrawal": {
      get: {
        summary: "List my withdrawals",
        tags: ["Withdrawals"],
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Withdrawal history" } },
      },
    },
    "/api/withdrawal/webhook/transfer": {
      post: {
        summary: "Flutterwave transfer webhook",
        description: "Protected by verif-hash. Completes or fails PROCESSING NGN withdrawals; refunds wallet on failure.",
        tags: ["Withdrawals"],
        responses: { "200": { description: "Processed" }, "401": { description: "Invalid signature" } },
      },
    },
    "/api/withdrawal/admin/pending-manual": {
      get: {
        summary: "Admin: list PENDING_MANUAL (USD) withdrawals",
        tags: ["Withdrawals"],
        parameters: [
          { name: "x-admin-api-key", in: "header", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "Pending manual list" }, "401": { description: "Unauthorized" } },
      },
    },
    "/api/withdrawal/admin/{id}/complete": {
      post: {
        summary: "Admin: mark manual USD withdrawal completed",
        tags: ["Withdrawals"],
        parameters: [
          { name: "x-admin-api-key", in: "header", required: true, schema: { type: "string" } },
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
        ],
        responses: { "200": { description: "Completed" } },
      },
    },
    "/api/withdrawal/admin/{id}/fail": {
      post: {
        summary: "Admin: fail manual USD withdrawal and refund wallet",
        tags: ["Withdrawals"],
        parameters: [
          { name: "x-admin-api-key", in: "header", required: true, schema: { type: "string" } },
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["reason"],
                properties: { reason: { type: "string" } },
              },
            },
          },
        },
        responses: { "200": { description: "Failed and refunded" } },
      },
    },
    // ----- Dashboard -----
    "/api/dashboard": {
      get: {
        summary: "Get dashboard summary",
        description:
          "Returns wallet balances (available withdrawable and locked escrow by currency), actions required, active contracts, recent activity, plus legacy summary counts and amount-per-period.",
        tags: ["Dashboard"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "months",
            in: "query",
            required: false,
            schema: { type: "integer" },
            description:
              "Timeframe in months for historical counts/earnings (e.g. 1, 2, 6, 12). If omitted, returns all-time data for those aggregates.",
          },
        ],
        responses: {
          "200": {
            description: "Dashboard Summary Details",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        escrowBalance: {
                          type: "number",
                          description: "Alias of balance.lockedEscrow.NGN (legacy)",
                        },
                        totalTransactions: { type: "integer" },
                        openDisputes: { type: "integer" },
                        transactionCount: {
                          type: "object",
                          properties: {
                            ongoing: { type: "integer" },
                            cancelled: { type: "integer" },
                            completed: { type: "integer" },
                          },
                        },
                        amountPerPeriod: {
                          type: "object",
                          additionalProperties: { type: "number" },
                          description: "Earnings amount aggregated by YYYY-MM",
                        },
                        balance: {
                          type: "object",
                          properties: {
                            availableWithdrawable: {
                              type: "object",
                              properties: {
                                NGN: { type: "number" },
                                USD: { type: "number" },
                              },
                            },
                            lockedEscrow: {
                              type: "object",
                              properties: {
                                NGN: { type: "number" },
                                USD: { type: "number" },
                              },
                              description:
                                "Principal still held in funded ONGOING/PENDING_CLOSURE/DISPUTE contracts",
                            },
                          },
                        },
                        actionsRequired: {
                          type: "object",
                          properties: {
                            count: { type: "integer" },
                            items: {
                              type: "array",
                              maxItems: 20,
                              items: {
                                type: "object",
                                properties: {
                                  type: {
                                    type: "string",
                                    enum: [
                                      "APPROVE_OR_REJECT",
                                      "REVISE_AND_RESUBMIT",
                                      "PAY_ESCROW",
                                      "ACCEPT_OR_REJECT_CLOSURE",
                                      "APPROVE_OR_REJECT_CANCEL",
                                      "RESPOND_TO_DISPUTE",
                                    ],
                                  },
                                  transactionId: { type: "integer" },
                                  title: { type: "string" },
                                  amount: { type: "number" },
                                  currency: { type: "string" },
                                  status: { type: "string" },
                                  from: {
                                    type: "object",
                                    properties: {
                                      name: { type: "string" },
                                      email: { type: "string" },
                                    },
                                  },
                                  createdAt: { type: "string", format: "date-time" },
                                },
                              },
                            },
                          },
                        },
                        activeContracts: {
                          type: "array",
                          maxItems: 20,
                          items: {
                            type: "object",
                            properties: {
                              id: { type: "integer" },
                              title: { type: "string" },
                              amount: { type: "number" },
                              currency: { type: "string" },
                              status: { type: "string" },
                              deadline: { type: "string", format: "date-time" },
                              counterparty: {
                                type: "object",
                                properties: {
                                  name: { type: "string" },
                                  email: { type: "string" },
                                },
                              },
                              paymentSentToEscrowAt: {
                                type: "string",
                                format: "date-time",
                                nullable: true,
                              },
                              activeMilestone: {
                                type: "object",
                                nullable: true,
                                properties: {
                                  id: { type: "integer" },
                                  name: { type: "string" },
                                  amount: { type: "number" },
                                  status: { type: "string" },
                                },
                              },
                            },
                          },
                        },
                        recentActivity: {
                          type: "array",
                          maxItems: 15,
                          items: {
                            type: "object",
                            properties: {
                              id: { type: "integer" },
                              title: { type: "string" },
                              description: { type: "string", nullable: true },
                              time: { type: "string", format: "date-time" },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
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
