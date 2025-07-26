import fs from 'node:fs';
import path from 'node:path';
import { promises as stream } from 'node:stream';

import { isMachO, isUniversalMachO } from './macho.js';

export enum AppFileType {
  MACHO,
  PLAIN,
  INFO_PLIST,
  SNAPSHOT,
  APP_CODE,
}

export type AppFile = {
  relativePath: string;
  type: AppFileType;
};

/**
 *
 * @param appPath Path to the application
 */
export const getAllAppFiles = async (appPath: string): Promise<AppFile[]> => {
  const files: AppFile[] = [];

  const visited = new Set<string>();
  const traverse = async (p: string) => {
    p = await fs.promises.realpath(p);
    if (visited.has(p)) return;
    visited.add(p);

    const info = await fs.promises.stat(p);
    if (info.isSymbolicLink()) return;
    if (info.isFile()) {
      let fileType = AppFileType.PLAIN;

      let isMachOFile = false;
      try {
        const header = await readMachOHeader(p);
        isMachOFile = isMachO(header) || isUniversalMachO(header);
      } catch (e) {
        /* silently accept errors from readMachOHeader */
      }

      if (p.endsWith('.asar')) {
        fileType = AppFileType.APP_CODE;
      } else if (isMachOFile) {
        fileType = AppFileType.MACHO;
      } else if (p.endsWith('.bin')) {
        fileType = AppFileType.SNAPSHOT;
      } else if (path.basename(p) === 'Info.plist') {
        fileType = AppFileType.INFO_PLIST;
      }

      files.push({
        relativePath: path.relative(appPath, p),
        type: fileType,
      });
    }

    if (info.isDirectory()) {
      for (const child of await fs.promises.readdir(p)) {
        await traverse(path.resolve(p, child));
      }
    }
  };
  await traverse(appPath);

  return files;
};

export const readMachOHeader = async (path: string) => {
  const buffer = Buffer.allocUnsafe(4);
  const fd = await fs.promises.open(path, 'r');
  try {
    const { bytesRead } = await fd.read(buffer, 0, 4, 0);
    return bytesRead < 4 ? buffer.subarray(0, bytesRead) : buffer;
  } finally {
    await fd.close();
  }
};

export const fsMove = async (oldPath: string, newPath: string) => {
  try {
    await fs.promises.rename(oldPath, newPath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'EXDEV') {
      // Cross-device link, fallback to copy and delete
      await fs.promises.cp(oldPath, newPath, {
        force: true,
        recursive: true,
        verbatimSymlinks: true,
      });
      await fs.promises.rm(oldPath, { force: true, recursive: true });
    } else {
      throw err;
    }
  }
};
