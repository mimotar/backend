export default function getChangePasswordOtpEmail(otp: string) {
    return {
      subject: "Security Alert: Change Password Request",
      htmlContent: `<h1>Change Password OTP</h1>
                    <p>You initiated a change password request on your account.</p>
                    <p>Use the following One-Time Password (OTP) to complete your request:</p>
                    <h2 style="background: #f4f4f4; padding: 10px; display: inline-block;">${otp}</h2>
                    <p>This OTP is valid for 15 minutes. If you did not request this, please secure your account immediately.</p>`,
    };
  }
