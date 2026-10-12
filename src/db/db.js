import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;

if (
  !databaseUrl ||
  /\[(user|password|neon_hostname|dbname)\]/i.test(databaseUrl)
) {
  throw new Error("Set a real DATABASE_URL in .env before using the database.");
}

export const pool = new Pool({
  connectionString: databaseUrl,
});

export const db = drizzle(pool);
