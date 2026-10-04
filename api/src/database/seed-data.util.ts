import * as fs from 'fs';
import * as path from 'path';

/**
 * Helpers for the seed migrations. This file lives outside `migrations/` on
 * purpose: TypeORM loads every export in that folder as a migration class.
 */

// Folders, relative to a root, that may hold the competition CSVs. The
// reference tables ship in the dataset's "General Data" folder.
const DATA_DIRS = ['data', path.join('data', 'General Data')];

/** Locates a dataset CSV whether the API runs from `api/`, the repo root, `src` or `dist`. */
export function findDataFile(filename: string): string {
  const roots = [
    process.cwd(),
    path.join(process.cwd(), 'api'),
    path.resolve(__dirname, '../..'),
    path.resolve(__dirname, '../../..'),
  ];

  for (const root of roots) {
    for (const dir of DATA_DIRS) {
      const candidate = path.join(root, dir, filename);
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }
  throw new Error(`Cannot find seed data file: ${filename}`);
}

/**
 * Reads a dataset CSV into one object per row, keyed by the header. The
 * reference files have no quoted fields, so a plain split is enough.
 */
export function readCsvRows(filename: string): Record<string, string>[] {
  const lines = fs
    .readFileSync(findDataFile(filename), 'utf8')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const headers = lines[0].split(',').map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const cols = line.split(',').map((col) => col.trim());
    return Object.fromEntries(
      headers.map((header, i) => [header, cols[i] ?? '']),
    );
  });
}
