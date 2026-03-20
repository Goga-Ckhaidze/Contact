import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const sendEmail = async (to, subject, html) => {
  try {
    await sgMail.send({
      to,                        // recipient email
      from: "yourverifiedemail@gmail.com", // any email you own
      subject,
      html,
    });
    console.log("Email sent successfully");
  } catch (err) {
    console.error("SendGrid email error:", err);
    throw err;
  }
};