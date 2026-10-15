/**
 * Seed script — creates the first ADMIN from environment variables.
 *
 * Run with: npm run seed
 *
 * Safe to run multiple times — upserts on email so it won't create duplicates.
 */

import "dotenv/config";
import bcrypt from "bcrypt";
import prisma from "../lib/prisma.js";
import { env } from "../config/env.js";

const BCRYPT_ROUNDS = 12;

async function seed(): Promise<void> {
  console.log("🌱 Starting seed…");

  const { SEED_ADMIN_NAME, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD } = env;

  const passwordHash = await bcrypt.hash(SEED_ADMIN_PASSWORD, BCRYPT_ROUNDS);

  const admin = await prisma.user.upsert({
    where: { email: SEED_ADMIN_EMAIL },
    update: {
      // If the admin already exists, update name and ensure they're active+ADMIN.
      // We do NOT update the password on re-seed to avoid overwriting manual changes.
      name: SEED_ADMIN_NAME,
      role: "ADMIN",
      isActive: true,
    },
    create: {
      name: SEED_ADMIN_NAME,
      email: SEED_ADMIN_EMAIL,
      passwordHash,
      role: "ADMIN",
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
    },
  });

  console.log("✅ Admin user seeded:");
  console.log(`   ID:    ${admin.id}`);
  console.log(`   Name:  ${admin.name}`);
  console.log(`   Email: ${admin.email}`);
  console.log(`   Role:  ${admin.role}`);
  console.log("\n⚠️  Change the default password immediately in production!");
}

seed()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
