const sib = require("sib-api-v3-sdk");
import { env } from "./env";


const apiInstance = new sib.TransactionalEmailsApi();
apiInstance.authentications["apiKey"].apiKey = env.brevoApiKey

export default apiInstance;
