"use strict";
// import pgSessionStore from 'connect-pg-simple';
// import pkg from "pg"
// import session from "express-session";
// import dotenv from "dotenv";
// dotenv.config();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionConfig = void 0;
// const { Pool } = pkg;
// const PgSession = pgSessionStore(session);
// const pool = new Pool({
//     connectionString: process.env.DATABASE_URL,
//     ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
//   });
// export const sessionConfig = {
//     store: new PgSession({
//       pool,
//       tableName: 'session'
//     }),
//     secret: 'your-secure-session-secret',
//     resave: false,
//     saveUninitialized: false,
//     cookie: { 
//       maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
//       secure: process.env.NODE_ENV === 'production'
//     }
//   }
// config/session.js
const express_session_1 = __importDefault(require("express-session"));
const connect_pg_simple_1 = __importDefault(require("connect-pg-simple"));
const pg_1 = __importDefault(require("pg"));
const { Pool } = pg_1.default;
const PgSession = (0, connect_pg_simple_1.default)(express_session_1.default);
// Create pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});
exports.sessionConfig = {
    store: new PgSession({
        pool,
        tableName: 'session'
    }),
    secret: process.env.SESSION_SECRET || 'your-secure-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
};
