import { PrismaClient, Setting } from "../../generated/prisma/client.js";
import { Prisma } from "../../generated/prisma/client.js";


export class SettingsService {
    constructor(
        private readonly userId: string,
        private readonly prisma: PrismaClient
    ) { }

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
    async TransactionSettings(payload: Prisma.SettingUpdateInput) {
        return this.updateSettings(payload)
    }
    async SecuritySettings(payload: Prisma.SettingUpdateInput) {
        return this.updateSettings(payload)
    }
    async NotificationSettings(payload: Prisma.SettingUpdateInput) {
        return this.updateSettings(payload)
    }
    async ManageAccountSettings(payload: Prisma.SettingUpdateInput) {
        return this.updateSettings(payload)
    }

}