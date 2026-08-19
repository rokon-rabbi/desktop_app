import {
  Archive,
  FileCode2,
  FileQuestion,
  FileText,
  Film,
  HardDrive,
  Image,
  Music,
  PackageOpen,
  type LucideIcon
} from 'lucide-react';
import type { FileCategory } from '@shared/types';

export const CATEGORY_ICONS: Record<FileCategory, LucideIcon> = {
  Documents: FileText,
  Images: Image,
  Videos: Film,
  Audio: Music,
  Archives: Archive,
  Installers: PackageOpen,
  Code: FileCode2,
  'Disk Images': HardDrive,
  Other: FileQuestion
};

/**
 * CSS custom properties, not raw hex — each swaps light/dark values in
 * index.css so the same category always reads correctly in both themes.
 * Slot order matches the dataviz skill's validated 8-color categorical
 * palette; "Other" intentionally sits outside the ramp (context.md: a 9th
 * series folds into "Other" rather than getting a generated hue).
 */
export const CATEGORY_COLORS: Record<FileCategory, string> = {
  Documents: 'var(--cat-documents)',
  Installers: 'var(--cat-installers)',
  Code: 'var(--cat-code)',
  Archives: 'var(--cat-archives)',
  Images: 'var(--cat-images)',
  Videos: 'var(--cat-videos)',
  'Disk Images': 'var(--cat-diskimages)',
  Audio: 'var(--cat-audio)',
  Other: 'var(--cat-other)'
};
