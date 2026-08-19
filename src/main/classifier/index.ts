import { extname } from 'node:path';
import { EXTENSION_CATEGORY_MAP } from '@shared/constants';
import type { FileCategory } from '@shared/types';

/** Extension without the leading dot, lowercased. Empty string when there is none. */
export function getExtension(filename: string): string {
  const ext = extname(filename);
  return ext.startsWith('.') ? ext.slice(1).toLowerCase() : '';
}

/**
 * Deterministic categorization (context.md §16): extension-based lookup
 * only. No heuristics, no AI, no content inspection — this must stay
 * reliable and explainable before anything smarter is layered on top.
 */
export function classifyFile(filename: string): FileCategory {
  const ext = getExtension(filename);
  return EXTENSION_CATEGORY_MAP[ext] ?? 'Other';
}
