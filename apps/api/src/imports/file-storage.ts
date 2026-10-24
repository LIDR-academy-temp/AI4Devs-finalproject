import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const FILE_STORAGE = Symbol('FILE_STORAGE');

/** Almacén de archivos originales. La implementación local puede sustituirse por S3 sin tocar el servicio. */
export interface FileStorage {
  save(key: string, content: Buffer): Promise<void>;
  read(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

/** Disco local bajo `<baseDir>/<companyId>/<fileId>`. */
export class LocalFileStorage implements FileStorage {
  private readonly baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = path.resolve(baseDir);
  }

  private resolve(key: string): string {
    const target = path.resolve(this.baseDir, key);
    if (!target.startsWith(this.baseDir + path.sep)) {
      throw new Error('Ruta de almacenamiento inválida');
    }
    return target;
  }

  async save(key: string, content: Buffer): Promise<void> {
    const target = this.resolve(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }

  read(key: string): Promise<Buffer> {
    return readFile(this.resolve(key));
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolve(key), { force: true });
  }
}
