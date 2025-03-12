export default function getVerifyEmailTemplate(verificationLink: string) {
    return {
        subject: "Verify Your Email",
        htmlContent: `
           <!DOCTYPE html>
<html>
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>Welcome to Mimotar</title>
	</head>
	<body
		style="
			margin: 0;
			padding: 0;
			background-color: #f4f4f4;
			font-family: Arial, sans-serif;
		"
	>
		<table
			width="100%"
			bgcolor="#f4f4f4"
			cellpadding="0"
			cellspacing="0"
			border="0"
		>
			<tr>
				<td align="center">
					<table
						width="600"
						bgcolor="#ffffff"
						cellpadding="0"
						cellspacing="0"
						border="0"
						style="max-width: 600px; border-radius: 8px"
					>
						<!-- Header -->
						<tr>
							<td
								align="center"
								bgcolor="#A21CAF"
								style="
									padding: 20px;
									border-top-left-radius: 8px;
									border-top-right-radius: 8px;
								"
							>
								<img
									src="YOUR_COMPANY_LOGO_URL"
									alt="Company Logo"
									width="150"
									style="display: block"
								/>
							</td>
						</tr>
						<!-- Content -->
						<tr>
							<td align="left" style="padding: 16px">
								<h2 style="color: #333; margin: 0">Hello Olawale Ade,</h2>
								<p style="color: #555; font-size: 16px">
									Thank you for signing up with MIMOTAR. To complete your
									registration, please confirm your email by clicking the button
									below.
								</p>
								<a
									href="[VERIFICATION_LINK]"
									style="
										display: inline-block;
										padding: 12px 24px;
										margin-top: 10px;
										background-color: #a21caf;
										color: #ffffff;
										text-decoration: none;
										font-size: 16px;
										border-radius: 5px;
									"
									>Confirm Email</a
								>
								<p style="margin-top: 20px">
									If you did not sign up for this account, please ignore this
									email.
								</p>
							</td>
						</tr>
						<!-- Footer -->
						<tr>
							<td
								align="left"
								bgcolor="#0e1621"
								style="padding: 20px; color: #ffffff; font-size: 14px"
							>
								<p style="margin: 0; color: #b0b0b0">
									Need help? Contact our support team at
									<a
										href="mailto:support@yourcompany.com"
										style="color: #ffffff; text-decoration: none"
										>support@yourcompany.com</a
									>
								</p>
								<!-- Social Media Links -->
								<table
									cellspacing="0"
									cellpadding="5"
									border="0"
									align="left"
									style="margin-top: 10px"
								>
									<tr>
										<td align="left" style="color: #b0b0b0">Follow us:</td>
										<td>
											<a href="https://facebook.com/yourpage"
												><img src="FACEBOOK_ICON_URL" alt="Facebook" width="20"
											/></a>
										</td>
										<td>
											<a href="https://twitter.com/yourpage"
												><img src="TWITTER_ICON_URL" alt="Twitter" width="20"
											/></a>
										</td>
										<td>
											<a href="https://instagram.com/yourpage"
												><img
													src="INSTAGRAM_ICON_URL"
													alt="Instagram"
													width="20"
											/></a>
										</td>
									</tr>
								</table>

							
								<table width="100%" cellspacing="0" cellpadding="10">
									<tr>
										<td align="left">
											<p style="margin-top: 10px; font-weight: bold">
												<a
													href="[UNSUBSCRIBE_LINK]"
													style="
														color: #d63384;
														text-decoration: none;
														font-size: 16px;
													"
												>
													<strong>Unsubscribe</strong>
												</a>
											</p>
										</td>
									</tr>
								</table>
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
	</body>
</html>

        `,
    };
}
