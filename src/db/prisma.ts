// Helper koneksi Prisma v7 dengan adapter MariaDB (kompatibel MySQL).
// URL koneksi dibaca dari DATABASE_URL (.env), lalu diurai menjadi PoolConfig
// karena adapter mariadb yang terpasang lebih andal menerima objek config
// ketimbang string mentah.
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../../generated/prisma/client.js";

function parseDatabaseUrl(raw: string) {
  // Contoh: mysql://root:password@localhost:3306/civision_db
  const u = new URL(raw);
  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ""),
    // Adapter mariadb: nonaktifkan prepared-statement cache secara eksplisit.
    prepareCacheLength: 0,
  };
}

const adapter = new PrismaMariaDb(parseDatabaseUrl(process.env.DATABASE_URL as string));

const prisma = new PrismaClient({ adapter });

export default prisma;