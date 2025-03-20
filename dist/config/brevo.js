"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sib = require("sib-api-v3-sdk");
const env_1 = require("./env");
const client = sib.ApiClient.instance;
const apiKey = client.authentications["api-key"];
apiKey.apiKey = env_1.env.brevoApiKey;
const apiInstance = new sib.TransactionalEmailsApi();
exports.default = apiInstance;
