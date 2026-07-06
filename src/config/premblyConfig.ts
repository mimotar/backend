import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const premblyConfig = {
  baseURL: process.env.PREMBLY_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.PREMBLY_SECRET_KEY
  },
};

export const premblyAxiosInstance = axios.create(premblyConfig);