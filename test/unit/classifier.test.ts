import { describe, expect, it } from 'vitest';
import { classifyFile, getExtension } from '@main/classifier';

describe('getExtension', () => {
  it('lowercases and strips the leading dot', () => {
    expect(getExtension('Report.PDF')).toBe('pdf');
  });

  it('returns empty string for extensionless files', () => {
    expect(getExtension('README')).toBe('');
  });

  it('handles dotfiles without treating the whole name as an extension', () => {
    expect(getExtension('.bashrc')).toBe('');
  });
});

describe('classifyFile', () => {
  it('maps known extensions to their category', () => {
    expect(classifyFile('photo.JPG')).toBe('Images');
    expect(classifyFile('movie.mkv')).toBe('Videos');
    expect(classifyFile('app.deb')).toBe('Installers');
    expect(classifyFile('archive.tar.gz')).toBe('Archives');
    expect(classifyFile('notes.md')).toBe('Documents');
  });

  it('falls back to Other for unknown extensions', () => {
    expect(classifyFile('mystery.xyzabc')).toBe('Other');
    expect(classifyFile('noextension')).toBe('Other');
  });
});
