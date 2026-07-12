import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Prefer direct/session URL for migrate; fall back to pooled
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
