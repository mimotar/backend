import crypto from 'crypto';

export const generateTransactionReference = () => {
const prefix = "MIM";
const timestamp = Date.now().toString();
const randomBytes = crypto.randomBytes(8).toString('hex');

return `${prefix}_${timestamp}_${randomBytes}`;
}