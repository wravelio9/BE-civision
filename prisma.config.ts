// Prisma v7 config. URL koneksi berada di sini (bukan di schema).
import "dotenv/config";
import { defineConfig } from "prisma/config";

const url = process.env["DATABASE_URL"] ?? "";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url,
  },
});