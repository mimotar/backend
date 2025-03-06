"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sib = require("sib-api-v3-sdk");
const env_1 = require("./env");
const apiInstance = new sib.TransactionalEmailsApi();
apiInstance.authentications["apiKey"].apiKey = env_1.env.brevoApiKey;
exports.default = apiInstance;
