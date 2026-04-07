export default function getPasswordResetOtpEmail(otp: string) {
    return {
      subject: "Your Password Reset OTP",
      htmlContent: `<h1>Password Reset</h1>
                    <p>You requested to reset your password. Use the following One-Time Password (OTP) to proceed:</p>
                    <h2 style="background: #f4f4f4; padding: 10px; display: inline-block;">${otp}</h2>
                    <p>This OTP is valid for 15 minutes. Do not share it with anyone.</p>`,
    };
  }
