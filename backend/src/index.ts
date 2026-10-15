// Load env variables FIRST — before any other imports that read process.env
import "dotenv/config";

import { env } from "./config/env.js";
import app from "./app.js";
import prisma from "./lib/prisma.js";

const PORT = env.PORT;

async function main(): Promise<void> {
  // Verify DB connectivity before accepting traffic
  await prisma.$connect();
  console.log("✅ Database connected");

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`   Environment: ${env.NODE_ENV}`);
  });
}

main().catch((err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});
