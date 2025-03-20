// import pgSessionStore from 'connect-pg-simple';
// import pkg from "pg"
// import session from "express-session";
// import dotenv from "dotenv";
// dotenv.config();


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
import session from 'express-session';
import pgSessionStore from 'connect-pg-simple';
import pkg from 'pg';

const { Pool } = pkg;
const PgSession = pgSessionStore(session);

// Create pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export const sessionConfig = {
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