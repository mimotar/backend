import sib from "sib-api-v3-sdk";
import { env } from "./env.js";

const client = sib.ApiClient.instance;

const apiKey = client.authentications["api-key"];
apiKey.apiKey = env.BREVO_API_KEY;

const apiInstance = new sib.TransactionalEmailsApi();

export default apiInstance;
