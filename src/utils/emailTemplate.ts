export const emailTemplates = {
    welcome: (name: string) => ({
      subject: "Welcome to Our Platform!",
      html: `<h1>Hello, ${name}!</h1><p>Thank you for signing up. We are excited to have you!</p>`,
    }),
  
    passwordReset: (name: string, resetLink: string) => ({
      subject: "Password Reset Request",
      html: `<h1>Hi ${name},</h1><p>Click <a href="${resetLink}">here</a> to reset your password.</p>`,
    }),
  
    orderConfirmation: (name: string, orderId: string) => ({
      subject: `Order Confirmation - #${orderId}`,
      html: `<h1>Thank you, ${name}!</h1><p>Your order #${orderId} has been confirmed.</p>`,
    }),
  };
  