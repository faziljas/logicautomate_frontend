#!/usr/bin/env node
/**
 * Pre-build migration script for Vercel deployments
 * Runs migrations before build if DATABASE_URL is available
 * 
 * This script is called during Vercel build process
 * Note: Migrations should ideally run via GitHub Actions before deployment
 * This is a safety check that runs during build if DATABASE_URL is available
 */

const { execSync } = require("child_process");

// Check if we're in a CI/CD environment
const isCI = process.env.CI || process.env.VERCEL || process.env.GITHUB_ACTIONS;

// Only run migrations if DATABASE_URL is set
if (process.env.DATABASE_URL || process.env.SUPABASE_DB_URL) {
  console.log("🔄 Running database migrations before build...");
  try {
    execSync("npm run migrate", { 
      stdio: "inherit",
      env: { ...process.env }
    });
    console.log("✅ Migrations completed successfully");
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    // In CI/CD, fail the build if migrations fail
    if (isCI) {
      console.error("🚨 Build aborted due to migration failure");
      process.exit(1);
    }
    // In local dev, just warn
    console.warn("⚠️  Continuing build despite migration failure (local dev)");
  }
} else {
  if (isCI) {
    console.log("⚠️  DATABASE_URL not set in CI/CD - migrations should run via GitHub Actions");
    console.log("⏭️  Skipping migrations during build (will run via GitHub Actions)");
  } else {
    console.log("⏭️  Skipping migrations (DATABASE_URL not set)");
  }
}
