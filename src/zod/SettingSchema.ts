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
  securityQuestions: z.array(z.string()).length(4),
  twoFactorAuth: z.boolean(),
  accountStatus: z.enum(["ACTIVE", "DISABLED", "DELETED"]),
  user: UserSchema,
});

export type ISetting = z.infer<typeof SettingSchema>;
