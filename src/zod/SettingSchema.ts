import { z } from "zod";

export const DefaultCurrencyEnum = z.enum(["GBP", "USD", "NGN"]);
export type DefaultCurrency = z.infer<typeof DefaultCurrencyEnum>;

export const NotificationPreferenceEnum = z.enum(["SMS", "EMAIL", "BOTH"]);
export type NotificationPreference = z.infer<typeof NotificationPreferenceEnum>;

const SettingAccountStatusSchema = z.object({
  id: z.number(),
  // Add more fields here if needed
});

const UserSchema = z.object({
  id: z.number(),
  // Add more fields here if needed
});

export const SettingSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  defaultCurrency: DefaultCurrencyEnum,
  notificationPreference: NotificationPreferenceEnum,
  securityQuestionId: z.number(),
  twoFactorAuth: z.boolean(),
  accountId: z.number().nullable().optional(),
  account: SettingAccountStatusSchema.nullable().optional(),
  user: UserSchema,
  // Uncomment if needed:
  // securityQuestion: SecurityQuestionSchema
});

export type ISetting = z.infer<typeof SettingSchema>;
