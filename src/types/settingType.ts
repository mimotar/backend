// Enums
export enum DefaultCurrency {
  GBP = "GBP",
  USD = "USD",
  NGN = "NGN",
}

export enum NotificationPreference {
  SMS = "SMS",
  EMAIL = "EMAIL",
  BOTH = "BOTH",
}

// Related types (assumed minimal versions based on relations)
export type SettingAccountStatus = {
  id: number;
  // Add more fields as needed
};

export type User = {
  id: number;
  // Add more fields as needed
};

// Main Setting type
export type ISetting = {
  id: number;
  user_id: number;
  defaultCurrency: DefaultCurrency;
  notificationPreference: NotificationPreference;
  securityQuestionId: number;
  twoFactorAuth: boolean;
  accountId?: number | null;
  account?: SettingAccountStatus | null;
  user?: User;
  // securityQuestion?: SecurityQuestion; // Uncomment if needed
};
