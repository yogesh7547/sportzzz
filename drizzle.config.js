import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL;

if (
  !databaseUrl ||
  /\[(user|password|neon_hostname|dbname)\]/i.test(databaseUrl)
) {
  throw new Error("Set a real DATABASE_URL in .env before using Drizzle.");
}

export default defineConfig({
  schema: "./src/db/schema.js",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
