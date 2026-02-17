import { PrismaClient } from "../../generated/prisma/client.js";
import { Prisma } from "../../generated/prisma/client.js";

/**
 * Service for reading and updating user settings. All operations are scoped to the
 * user identified by `userId`. Settings include default currency, notification
 * preference, security questions, 2FA, and account status.
 */
export class SettingsService {
    constructor(
        private readonly userId: string,
        private readonly prisma: PrismaClient
    ) { }

    /** Resolves the user by ID; throws if not found. */
    async getUser() {
        const user = await this.prisma.user.findUnique({
            where: {
                id: Number(this.userId)
            }
        })
        if (!user) {
            throw new Error("User not found")
        }
        return user
    }
    private async updateSettings(payload: Prisma.SettingUpdateInput) {
        const user = await this.getUser()
        return this.prisma.setting.update({
            where: {
                user_id: user.id
            },
            data: payload,
        })
    }

    /** Updates transaction-related settings (e.g. defaultCurrency). */
    async TransactionSettings(payload: Prisma.SettingUpdateInput) {
        return this.updateSettings(payload)
    }

    /** Updates security settings (e.g. twoFactorAuth). */
    async SecuritySettings(payload: Prisma.SettingUpdateInput) {
        return this.updateSettings(payload)
    }

    /** Updates notification preference (SMS, EMAIL, BOTH). */
    async NotificationSettings(payload: Prisma.SettingUpdateInput) {
        return this.updateSettings(payload)
    }

    /** Updates account management settings (e.g. accountStatus). */
    async ManageAccountSettings(payload: Prisma.SettingUpdateInput) {
        return this.updateSettings(payload)
    }

    /** Returns the settings record for the current user, or null if none. */
    async getSettings() {
        return this.prisma.setting.findUnique({
            where: {
                user_id: Number(this.userId)
            }
        })
    }

}