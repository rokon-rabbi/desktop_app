import { getDatabase } from './connection';
import { ScanRepository } from './repositories/scanRepository';
import { FileRepository } from './repositories/fileRepository';
import { OperationRepository } from './repositories/operationRepository';
import { SettingsRepository } from './repositories/settingsRepository';

export { closeDatabase } from './connection';

export interface Repositories {
  scans: ScanRepository;
  files: FileRepository;
  operations: OperationRepository;
  settings: SettingsRepository;
}

let repositories: Repositories | null = null;

export function getRepositories(): Repositories {
  if (repositories) return repositories;
  const db = getDatabase();
  repositories = {
    scans: new ScanRepository(db),
    files: new FileRepository(db),
    operations: new OperationRepository(db),
    settings: new SettingsRepository(db)
  };
  return repositories;
}
