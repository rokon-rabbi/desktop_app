import type Database from 'better-sqlite3';
import type { AppSettings } from '@shared/types';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  monitoredFolders: [],
  defaultScanRoots: [],
  confirmBeforeApply: true
};

export class SettingsRepository {
  constructor(private readonly db: Database.Database) {}

  get(): AppSettings {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get('app') as
      { value: string } | undefined;
    if (!row) return DEFAULT_SETTINGS;
    try {
      return { ...DEFAULT_SETTINGS, ...(JSON.parse(row.value) as Partial<AppSettings>) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  update(partial: Partial<AppSettings>): AppSettings {
    const merged = { ...this.get(), ...partial };
    this.db
      .prepare(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
      )
      .run('app', JSON.stringify(merged));
    return merged;
  }
}
