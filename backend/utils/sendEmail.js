import SibApiV3Sdk from "sib-api-v3-sdk";
import dotenv from "dotenv";

dotenv.config();

const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.SENDINBLUE_API_KEY;

const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

export const sendEmail = async ({ toEmail, toName, subject, htmlContent }) => {
  try {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender = { email: "dopex1121@gmail.com", name: "Goga Portfolio" };
    sendSmtpEmail.to = [{ email: toEmail, name: toName }];
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = htmlContent;

    const response = await tranEmailApi.sendTransacEmail(sendSmtpEmail);
    console.log("Sendinblue email response:", response);
    return response;
  } catch (err) {
    console.error("Sendinblue email error:", err);
    throw err;
  }
};