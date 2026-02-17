import { GlobalError } from "../../middlewares/error/GlobalErrorHandler.js";
import { SettingsService } from "../../services/settings/index.js";

/**
 * Controller for user settings. Handles fetching and updating notification,
 * security, transaction, and account settings for the authenticated user.
 */
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * Fetches the current user's settings (currency, notifications, 2FA, account status, etc.).
   * @returns 200 with `{ message, data, success }` or 500 on error
   */
  async getSettings(req: any, res: any) {
    try {
      const settings = await this.settingsService.getSettings();
      return res.status(200).json({
        message: "Settings fetched successfully",
        data: settings,
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Failed to fetch settings",
        error: error instanceof Error ? error.message : String(error),
        success: false,
      });
    }
  }

  /**
   * Updates notification preferences (e.g. SMS, EMAIL, BOTH).
   * Request body is merged into the user's settings via Prisma `SettingUpdateInput`.
   * @returns 200 with updated settings or 500 on error
   */
  async updateNotificationSettings(req: any, res: any) {
    try {
      const settings = await this.settingsService.NotificationSettings(req.body);
      return res.status(200).json({
        message: "Settings updated successfully",
        data: settings,
        success: true,
      });
    }
    catch (error) {
      return res.status(500).json({
        message: "Failed to update settings",
        error: error instanceof Error ? error.message : String(error),
        success: false,
      });
    }
  }

  /**
   * Updates security-related settings (e.g. twoFactorAuth).
   * @returns 200 with updated settings or 500 on error
   */
  async updateSecuritySettings(req: any, res: any) {
    try {
      const settings = await this.settingsService.SecuritySettings(req.body);
      return res.status(200).json({
        message: "Settings updated successfully",
        data: settings,
        success: true,
      });
    }
    catch (error) {
      return res.status(500).json({
        message: "Failed to update settings",
        error: error instanceof Error ? error.message : String(error),
        success: false,
      });
    }
  }

  /**
   * Updates transaction-related settings (e.g. defaultCurrency).
   * @returns 200 with updated settings or 500 on error
   */
  async updateTransactionSettings(req: any, res: any) {
    try {
      const settings = await this.settingsService.TransactionSettings(req.body);
      return res.status(200).json({
        message: "Settings updated successfully",
        data: settings,
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Failed to update settings",
        error: error instanceof Error ? error.message : String(error),
        success: false,
      });
    }
  }

  /**
   * Updates account management settings (e.g. accountStatus).
   * @returns 200 with updated settings or 500 on error
   */
  async updateManageAccountSettings(req: any, res: any) {
    try {
      const settings = await this.settingsService.ManageAccountSettings(req.body);
      return res.status(200).json({
        message: "Settings updated successfully",
        data: settings,
        success: true,
      });
    }
    catch (error) {
      return res.status(500).json({
        message: "Failed to update settings",
        error: error instanceof Error ? error.message : String(error),
        success: false,
      });
    }
  }
}
