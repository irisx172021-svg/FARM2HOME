import path from 'path';
import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';

let dbInstance: DatabaseSync | null = null;

export function getDatabasePath(): string {
  const customPath = process.env.DATABASE_PATH || process.env.DATABASE_URL;
  if (customPath && !customPath.startsWith('postgres://') && !customPath.startsWith('postgresql://')) {
    return path.isAbsolute(customPath) ? customPath : path.join(process.cwd(), customPath);
  }
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'farm2home.db');
}

export function getDatabase(): DatabaseSync {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = getDatabasePath();
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  dbInstance = new DatabaseSync(dbPath);

  // Performance and integrity configurations
  try {
    dbInstance.exec('PRAGMA journal_mode = WAL;');
    dbInstance.exec('PRAGMA synchronous = NORMAL;');
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    dbInstance.exec('PRAGMA busy_timeout = 5000;');
  } catch (err) {
    console.warn('Note on SQLite pragmas:', err);
  }

  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      // ignore
    }
    dbInstance = null;
  }
}
