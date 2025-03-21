const sib = require("sib-api-v3-sdk");
import { env } from "./env";

const client = sib.ApiClient.instance;
const apiKey = client.authentications["api-key"];
apiKey.apiKey = env.BREVO_API_KEY;

const apiInstance = new sib.TransactionalEmailsApi();
export default apiInstance;
