export default function getWelcomeEmail(name: string) {
    return {
      subject: `Welcome to Mimotar, ${name}!`,
      htmlContent: `<h1>Hi ${name},</h1>
                    <p>Thank you for signing up! We are excited to have you.</p>
                    <p>Enjoy our services.</p>`,
    };
  }
  