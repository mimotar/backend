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
    /**
     * Updates settings for the current user. Accepts a partial payload; only supplied
     * fields are updated. Creates a settings record if none exists (upsert).
     */
    async updateSettings(payload: Prisma.SettingUpdateInput) {
        const user = await this.getUser()
        return this.prisma.setting.upsert({
            where: {
                user_id: user.id
            },
            create: {
                user_id: user.id,
                securityQuestions: (payload.securityQuestions as Prisma.InputJsonValue) ?? [],
            },
            update: payload,
        })
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