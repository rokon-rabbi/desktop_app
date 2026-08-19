import { rename, copyFile, unlink, stat } from 'node:fs/promises';

/**
 * Renames a file, falling back to copy+delete when source and destination
 * are on different filesystems (EXDEV, which plain rename() cannot cross).
 * The original is only removed after the copy is confirmed on disk.
 */
export async function moveFile(source: string, destination: string): Promise<void> {
  try {
    await rename(source, destination);
    return;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EXDEV') throw error;
  }

  await copyFile(source, destination);
  const [sourceStat, destStat] = await Promise.all([stat(source), stat(destination)]);
  if (sourceStat.size !== destStat.size) {
    throw new Error('Copy verification failed: size mismatch after cross-filesystem move');
  }
  await unlink(source);
}
