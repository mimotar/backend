"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: '.env.test' });
jest.setTimeout(30000);
beforeAll(() => {
    // Any global setup code can go here
    console.log('Starting tests...');
});
afterAll(() => {
    // Any global cleanup code can go here
    console.log('All tests completed.');
});
