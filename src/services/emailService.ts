import apiInstance from "../config/brevo";
import { env } from "../config/env";
import { getEmailTemplate } from "../emails/templates";
import { EmailType } from "../emails/templates/emailTypes";

export async function sendEmail(
	to: string,
	type: EmailType,
	params: Record<string, any>
) {
	try {
		const { subject, htmlContent } = getEmailTemplate(type, params);

		await apiInstance.sendTransacEmail({
			sender: { email: env.EMAIL }, 
			to: [{ email: to }],
			subject,
			htmlContent,
		});

		console.log(`Email sent successfully: ${type}`);
		return { success: true, message: `Email sent: ${type}` };
	} catch (error: any) {
		console.error("Error sending email:", error);
		return { success: false, error: error?.message };
	}
}
