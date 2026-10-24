import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { extractTable, parseFile, type FileKind } from '../../imports/file-parser.js';
import { normalizeStoreName } from './store-name.js';

export interface StoreMappingRow {
  posStoreName: string;
  bankStoreCode: string;
}

const fileKind = (name: string): FileKind | null => {
  const ext = name.toLowerCase().split('.').pop();
  return ext === 'xlsx' ? 'xlsx' : ext === 'csv' ? 'csv' : null;
};

/** Convención de aislamiento: `companyId` (del token) es siempre el primer argumento. */
@Injectable()
export class StoreMappingsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  list(companyId: string): Promise<StoreMappingRow[]> {
    return this.prisma.storeMapping.findMany({
      where: { companyId },
      orderBy: { posStoreName: 'asc' },
      select: { posStoreName: true, bankStoreCode: true },
    });
  }

  /** Mapa nombre normalizado → código del banco, para el motor. */
  async asMap(companyId: string): Promise<Map<string, string>> {
    const rows = await this.list(companyId);
    return new Map(rows.map((r) => [r.posStoreName, r.bankStoreCode]));
  }

  /**
   * Reemplaza la tabla de la empresa con el contenido de un archivo de dos columnas:
   * código de establecimiento del banco y nombre del local del POS (primera fila = cabecera).
   */
  async replaceFromFile(
    companyId: string,
    file: { originalname: string; buffer: Buffer } | undefined,
  ): Promise<{ count: number }> {
    if (!file) throw new BadRequestException('Falta el archivo');
    const kind = fileKind(file.originalname);
    if (!kind) throw new BadRequestException('Formato no admitido: solo .csv o .xlsx');
    let table;
    try {
      table = extractTable(parseFile(file.buffer, kind), 1);
    } catch {
      throw new BadRequestException('No se pudo leer el archivo');
    }

    const byName = new Map<string, string>();
    for (const { rowNumber, cells } of table.dataRows) {
      const code = cells[0] === null || cells[0] === undefined ? '' : String(cells[0]).trim();
      const name = normalizeStoreName(
        cells[1] === null || cells[1] === undefined ? null : String(cells[1]),
      );
      if (code === '' || name === null) {
        throw new BadRequestException(`Fila ${rowNumber}: faltan el código o el nombre del local`);
      }
      const previous = byName.get(name);
      if (previous !== undefined && previous !== code) {
        throw new BadRequestException(
          `Fila ${rowNumber}: el local "${name}" tiene dos códigos distintos`,
        );
      }
      byName.set(name, code);
    }
    if (byName.size === 0)
      throw new BadRequestException('El archivo no contiene relaciones de locales');

    await this.prisma.$transaction([
      this.prisma.storeMapping.deleteMany({ where: { companyId } }),
      this.prisma.storeMapping.createMany({
        data: [...byName].map(([posStoreName, bankStoreCode]) => ({
          companyId,
          posStoreName,
          bankStoreCode,
        })),
      }),
    ]);
    return { count: byName.size };
  }
}
