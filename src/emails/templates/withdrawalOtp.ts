export default function getWithdrawalOtpEmail(
  otp: string,
  amount: number,
  currency: string
) {
  return {
    subject: "Confirm your Mimotar withdrawal",
    htmlContent: `<h1>Withdrawal OTP</h1>
      <p>You requested a withdrawal of <strong>${amount} ${currency}</strong>.</p>
      <p>Use this One-Time Password to confirm:</p>
      <h2 style="background: #f4f4f4; padding: 10px; display: inline-block;">${otp}</h2>
      <p>This OTP is valid for 15 minutes. If you did not request this, ignore this email and secure your account.</p>`,
  };
}
