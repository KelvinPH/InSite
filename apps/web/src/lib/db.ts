import { createDb } from "@insite/db";

let _db: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL is not set. Copy .env.example to apps/web/.env.local and set your Neon/Postgres URL.",
      );
    }
    _db = createDb(url);
  }
  return _db;
}
