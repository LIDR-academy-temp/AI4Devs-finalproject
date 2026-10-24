import { randomUUID, createHash } from 'node:crypto';
import path from 'node:path';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import {
  Prisma,
  type ImportedFile,
  type ReconciliationStatus,
  type SourceType,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ImportFileDto } from './dto/import-file.dto.js';
import { FILE_STORAGE, type FileStorage } from './file-storage.js';
import {
  buildPreview,
  extractTable,
  parseFile,
  type FileKind,
  type ParsedFile,
} from './file-parser.js';
import { isValidDateFormat } from './normalizers/index.js';
import { transformRow, type BankData, type PosData, type RowError } from './row-transformer.js';
import { fieldsFor } from './standard-fields.js';

export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const INSERT_BATCH_SIZE = 1000;
export const MAX_RESPONSE_ERRORS = 50;
export const MAX_STORED_ERRORS = 1000;

/** Estados de la conciliación que admiten cargar o reimportar archivos. */
const EDITABLE_STATUSES: readonly ReconciliationStatus[] = ['DRAFT', 'COMPLETED', 'FAILED'];

const ALLOWED_MIME: Record<FileKind, readonly string[]> = {
  csv: [
    'text/csv',
    'application/csv',
    'text/plain',
    'application/vnd.ms-excel',
    'application/octet-stream',
  ],
  xlsx: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/octet-stream',
  ],
};

export const UNSUPPORTED_FORMAT_MESSAGE =
  'Formato no admitido: solo se aceptan archivos .csv o .xlsx';

export interface UploadedBuffer {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface ImportSummary {
  fileId: string;
  status: ImportedFile['status'];
  totalRows: number;
  validRows: number;
  errorRows: number;
  discardedDebits: number;
  errors: RowError[];
}

const toKind = (name: string): FileKind | null => {
  const ext = path.extname(name).toLowerCase();
  return ext === '.csv' ? 'csv' : ext === '.xlsx' ? 'xlsx' : null;
};

/** Convención de aislamiento: companyId (del token) primer argumento y presente en todo where. */
@Injectable()
export class ImportsService {
  private readonly logger = new Logger(ImportsService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(FILE_STORAGE) private readonly storage: FileStorage,
  ) {}

  async upload(
    companyId: string,
    reconciliationId: string,
    sourceType: SourceType,
    file: UploadedBuffer | undefined,
  ) {
    if (!file) throw new BadRequestException('Falta el archivo (campo "file")');
    const reconciliation = await this.prisma.reconciliation.findFirst({
      where: { id: reconciliationId, companyId },
    });
    if (!reconciliation) throw new NotFoundException('Conciliación no encontrada');
    this.assertEditable(reconciliation.status);

    const kind = toKind(file.originalname);
    if (!kind || !ALLOWED_MIME[kind].includes(file.mimetype.toLowerCase())) {
      throw new UnsupportedMediaTypeException(UNSUPPORTED_FORMAT_MESSAGE);
    }
    // Un .xlsx es un zip: el contenido debe coincidir con la extensión
    if (kind === 'xlsx' && file.buffer.subarray(0, 2).toString('latin1') !== 'PK') {
      throw new UnsupportedMediaTypeException(UNSUPPORTED_FORMAT_MESSAGE);
    }

    const sha256 = createHash('sha256').update(file.buffer).digest('hex');
    const duplicate = await this.prisma.importedFile.findFirst({
      where: { reconciliationId, sha256 },
      select: { originalName: true },
    });
    if (duplicate) {
      throw new ConflictException(
        `Este archivo ya fue cargado en la conciliación como "${duplicate.originalName}"`,
      );
    }

    let totalRows: number;
    try {
      totalRows = extractTable(parseFile(file.buffer, kind), 1).dataRows.length;
    } catch (error) {
      this.logger.warn(`No se pudo leer el archivo subido: ${(error as Error).message}`);
      throw new BadRequestException(
        'No se pudo leer el archivo: está dañado o su formato no es válido',
      );
    }

    const id = randomUUID();
    const storagePath = `${companyId}/${id}`;
    await this.storage.save(storagePath, file.buffer);
    try {
      const created = await this.prisma.importedFile.create({
        data: {
          id,
          reconciliationId,
          sourceType,
          originalName: path.basename(file.originalname),
          storagePath,
          sha256,
          totalRows,
        },
      });
      return this.toFileDto(created);
    } catch (error) {
      await this.storage.delete(storagePath);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Este archivo ya fue cargado en la conciliación');
      }
      throw error;
    }
  }

  async getFile(companyId: string, fileId: string) {
    const file = await this.findFile(companyId, fileId);
    return { ...this.toFileDto(file), errors: (file.errors as unknown as RowError[] | null) ?? [] };
  }

  async preview(companyId: string, fileId: string, headerRow: number) {
    const file = await this.findFile(companyId, fileId);
    const parsed = await this.load(file);
    return {
      fileId: file.id,
      sourceType: file.sourceType,
      headerRow,
      fields: fieldsFor(file.sourceType),
      ...buildPreview(parsed, headerRow),
    };
  }

  async import(companyId: string, fileId: string, dto: ImportFileDto): Promise<ImportSummary> {
    const file = await this.findFile(companyId, fileId);
    this.assertEditable(file.reconciliation.status);
    if (!isValidDateFormat(dto.dateFormat)) {
      throw new BadRequestException(
        'dateFormat no es un formato de fecha válido (p. ej. dd/MM/yyyy)',
      );
    }

    const parsed = await this.load(file);
    const table = extractTable(parsed, dto.headerRow);
    const mapping = this.validateMapping(file.sourceType, dto.columnMapping, table.headers.length);

    const errors: RowError[] = [];
    const rowsWithErrors = new Set<number>();
    const posRows: Prisma.PosTransactionCreateManyInput[] = [];
    const bankRows: Prisma.BankMovementCreateManyInput[] = [];
    let discardedDebits = 0;

    for (const row of table.dataRows) {
      const result = transformRow(row.rowNumber, row.cells, {
        sourceType: file.sourceType,
        mapping,
        dateFormat: dto.dateFormat,
        decimalSeparator: dto.decimalSeparator,
        headers: table.headers,
      });
      if (result.kind === 'discarded') {
        discardedDebits++;
      } else if (result.kind === 'error') {
        rowsWithErrors.add(result.rowNumber);
        errors.push(...result.errors);
      } else {
        const base = {
          reconciliationId: file.reconciliationId,
          fileId: file.id,
          rowNumber: result.rowNumber,
          rawData: result.rawData as Prisma.InputJsonValue,
        };
        if (file.sourceType === 'POS') {
          const { transactionAt, amount, ...rest } = result.data as PosData;
          posRows.push({ ...base, transactionAt, amount: amount.toFixed(2), ...rest });
        } else {
          const { amount, grossAmount, feeAmount, withholdingAmount, ...rest } =
            result.data as BankData;
          bankRows.push({
            ...base,
            ...rest,
            amount: amount.toFixed(2),
            grossAmount: grossAmount?.toFixed(2) ?? null,
            feeAmount: feeAmount?.toFixed(2) ?? null,
            withholdingAmount: withholdingAmount?.toFixed(2) ?? null,
          });
        }
      }
    }

    const validRows = posRows.length + bankRows.length;
    const errorRows = rowsWithErrors.size;
    const status = validRows === 0 && errorRows > 0 ? 'FAILED' : 'IMPORTED';

    try {
      // Todo o nada: una reimportación sustituye las filas del archivo en una sola transacción
      await this.prisma.$transaction(
        async (tx) => {
          await tx.posTransaction.deleteMany({ where: { fileId } });
          await tx.bankMovement.deleteMany({ where: { fileId } });
          for (let i = 0; i < posRows.length; i += INSERT_BATCH_SIZE) {
            await tx.posTransaction.createMany({ data: posRows.slice(i, i + INSERT_BATCH_SIZE) });
          }
          for (let i = 0; i < bankRows.length; i += INSERT_BATCH_SIZE) {
            await tx.bankMovement.createMany({ data: bankRows.slice(i, i + INSERT_BATCH_SIZE) });
          }
          await tx.importedFile.update({
            where: { id: fileId },
            data: {
              status,
              totalRows: table.dataRows.length,
              validRows,
              errorRows,
              discardedRows: discardedDebits,
              errors: errors.slice(0, MAX_STORED_ERRORS) as unknown as Prisma.InputJsonValue,
            },
          });
        },
        { timeout: 120_000, maxWait: 10_000 },
      );
    } catch (error) {
      this.logger.error(`Falló la importación del archivo ${fileId}: ${(error as Error).message}`);
      await this.prisma.importedFile
        .update({ where: { id: fileId }, data: { status: 'FAILED' } })
        .catch(() => undefined);
      throw new InternalServerErrorException(
        'La importación falló y no se guardó ninguna fila. Inténtalo de nuevo',
      );
    }

    return {
      fileId,
      status,
      totalRows: table.dataRows.length,
      validRows,
      errorRows,
      discardedDebits,
      errors: errors.slice(0, MAX_RESPONSE_ERRORS),
    };
  }

  /** Verifica el mapeo y lo convierte a campo → índice de columna. */
  private validateMapping(
    sourceType: SourceType,
    columnMapping: Record<string, string>,
    columnCount: number,
  ): Map<string, number> {
    const defs = fieldsFor(sourceType);
    const allowed = new Set(defs.map((d) => d.field));
    const mapping = new Map<string, number>();

    for (const [key, field] of Object.entries(columnMapping)) {
      if (field === '' || field === null) continue; // columna sin asignar
      const index = Number(key);
      if (!/^\d+$/.test(key) || index >= columnCount) {
        throw new BadRequestException(`columnMapping: la columna "${key}" no existe en el archivo`);
      }
      if (!allowed.has(field)) {
        throw new BadRequestException(
          `columnMapping: "${field}" no es un campo válido para un archivo ${sourceType}`,
        );
      }
      if (mapping.has(field)) {
        throw new BadRequestException(`El campo "${field}" está asignado a más de una columna`);
      }
      mapping.set(field, index);
    }

    const missing = defs.filter((d) => d.required && !mapping.has(d.field));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Falta asignar el campo obligatorio: ${missing.map((d) => `${d.label} (${d.field})`).join(', ')}`,
      );
    }
    return mapping;
  }

  private assertEditable(status: ReconciliationStatus): void {
    if (!EDITABLE_STATUSES.includes(status)) {
      throw new ConflictException('La conciliación no admite cambios en su estado actual');
    }
  }

  private async findFile(companyId: string, fileId: string) {
    const file = await this.prisma.importedFile.findFirst({
      where: { id: fileId, reconciliation: { companyId } },
      include: { reconciliation: { select: { status: true } } },
    });
    if (!file) throw new NotFoundException('Archivo no encontrado');
    return file;
  }

  private async load(file: ImportedFile): Promise<ParsedFile> {
    const kind = toKind(file.originalName);
    if (!kind) throw new BadRequestException(UNSUPPORTED_FORMAT_MESSAGE);
    return parseFile(await this.storage.read(file.storagePath), kind);
  }

  private toFileDto(file: ImportedFile) {
    return {
      id: file.id,
      reconciliationId: file.reconciliationId,
      sourceType: file.sourceType,
      originalName: file.originalName,
      status: file.status,
      totalRows: file.totalRows,
      validRows: file.validRows,
      errorRows: file.errorRows,
      discardedRows: file.discardedRows,
      createdAt: file.createdAt,
    };
  }
}
