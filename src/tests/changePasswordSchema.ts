import {
  changePasswordRequestSchema,
  changePasswordVerifySchema,
} from "../zod/changePassword.schema.js";

describe("change password request validation", () => {
  it("accepts a valid matching password request", () => {
    const result = changePasswordRequestSchema.safeParse({
      currentPassword: "Current1!",
      newPassword: "NewPassword1!",
      confirmPassword: "NewPassword1!",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a mismatched password confirmation", () => {
    const result = changePasswordRequestSchema.safeParse({
      currentPassword: "Current1!",
      newPassword: "NewPassword1!",
      confirmPassword: "Different1!",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a weak new password", () => {
    const result = changePasswordRequestSchema.safeParse({
      currentPassword: "Current1!",
      newPassword: "weak",
      confirmPassword: "weak",
    });

    expect(result.success).toBe(false);
  });
});

describe("change password OTP validation", () => {
  it("accepts exactly six numeric digits", () => {
    expect(changePasswordVerifySchema.safeParse({ otp: "123456" }).success).toBe(true);
  });

  it.each(["12345", "1234567", "abcdef"])("rejects invalid OTP %s", (otp) => {
    expect(changePasswordVerifySchema.safeParse({ otp }).success).toBe(false);
  });
});
