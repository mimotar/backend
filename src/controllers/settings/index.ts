import prisma from "../../utils/prisma.js";
import { SettingsService } from "../../services/settings/index.js";

export class SettingsController {
  async getSettings(req: any, res: any) {
    try {
      const userId = req.user.id;

      const settingsService = new SettingsService(userId, prisma);

      const settings = await settingsService.getSettings();

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

  /** Updates settings from request body; only supplied fields are updated. */
  async updateSettings(req: any, res: any) {
    try {
      const userId = req.user.id;
      const settingsService = new SettingsService(userId, prisma);
      const settings = await settingsService.updateSettings(req.body);
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
}

export const settingsController = new SettingsController();