import { prisma } from "../../config/db.js";

export const verifyOTPService = async (email: string, otp: string) => {

    const user = await prisma.user.findUnique({
        where: { email },
    });
    if (!user) {    
        return {
            status: 404,
            message: "User not found",
        };
    }
    if (user.otp !== otp) {
        return {
            status: 400,
            message: "Invalid OTP",
        };
    }
    const currentTime = new Date();
    const otpCreatedAt = user.otpCreatedAt;
    if (!otpCreatedAt) {
        return {
            status: 400,
            message: "OTP creation time is missing",
        };
    }
    const otpExpiryTime = new Date(otpCreatedAt);
    otpExpiryTime.setMinutes(otpExpiryTime.getMinutes() + 30); 
    if (currentTime > otpExpiryTime) {
        return {
            status: 400,
            message: "OTP has expired",
        };
    }
    await prisma.user.update({
        where: { email },
        data: {     
            verified: true,
            otp: null,
            otpCreatedAt: null,
        },
    });
    return {
        status: 200,
        message: "OTP verified successfully",
    };
    
};
