import prisma from "../../utils/prisma";

export const getALlUsersService = async () => {
    try {
        const users = await prisma.user.findMany({
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            verified: true,
            createdAt: true,
        },
        });
        return {
        status: 200,
        message: "Users fetched successfully",
        users,
        };
    } catch (error) {
        console.error("Error in fetching all users:", error);
        return {
        status: 500,
        message: "Server error",
        };
    }
}


export const deleteAUserService = async (email: string) => {
    try {
        const user = await prisma.user.delete({
            where: {
                email: email
            }
        })
        return {
            status: 200,
            message: "User deleted successfully",
            user
        }
    } catch (error) {
        console.error("Error in deleting a user:", error);
        return {
            status: 500,
            message: "Server error",
        };
    }
}