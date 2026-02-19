#!/usr/bin/env node
/**
 * Run database migrations in order.
 * Uses DATABASE_URL or SUPABASE_DB_URL (Supabase: Project Settings > Database > Connection string URI).
 *
 * Usage: node scripts/migrate.js
 * Or:    npm run migrate
 */

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const MIGRATIONS_DIR = path.join(__dirname, "..", "migrations");
const MIGRATION_ORDER = [
  "001_initial_schema.sql",
  "002_rls_policies.sql",
  "003_booking_helpers.sql",
  "003_staff_otp.sql",
  "004_payments_refund_columns.sql",
  "004_staff_push_tokens.sql",
  "add_whatsapp_flags.sql",
  "005_add_retry_mechanism.sql",  // WhatsApp retry mechanism
  "005_seed_templates.sql",   // salon, clinic, coaching
  "006_seed_more_templates.sql",  // consulting, fitness, photography
  "007_add_whatsapp_session_state.sql",  // WhatsApp session state and waitlist
];

async function runMigrations() {
  const dbUrl =
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error(
      "Missing DATABASE_URL or SUPABASE_DB_URL. Set it in env or .env.local."
    );
    process.exit(1);
  }

  const client = new Client({
    connectionString: dbUrl,
    ssl: dbUrl.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await client.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    for (const file of MIGRATION_ORDER) {
      const filePath = path.join(MIGRATIONS_DIR, file);
      if (!fs.existsSync(filePath)) {
        console.warn(`Skipping (not found): ${file}`);
        continue;
      }

      const { rows } = await client.query(
        "SELECT 1 FROM _migrations WHERE name = $1",
        [file]
      );
      if (rows.length > 0) {
        console.log(`Already applied: ${file}`);
        continue;
      }

      const sql = fs.readFileSync(filePath, "utf8");
      console.log(`Applying: ${file}`);
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
        await client.query("COMMIT");
        console.log(`  ✓ ${file}`);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }

    console.log("\nMigrations complete.");
  } finally {
    await client.end();
  }
}

runMigrations().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
