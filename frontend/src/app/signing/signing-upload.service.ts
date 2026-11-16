import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export interface SignatureRequestCreated {
  id: string;
  document_id: string;
  status: string;
  signing_url: string;
  created_at: string;
}

export interface SigningUpload {
  file: File;
  fullName: string;
  identifier: string;
  email: string;
}

export interface DownloadedFile {
  blob: Blob;
  fileName: string;
}

const FALLBACK_FILE_NAME = 'documento.pdf';

export function fileNameFromDisposition(header: string | null): string {
  if (!header) return FALLBACK_FILE_NAME;
  const encoded = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header);
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1].trim());
    } catch {
      // filename* mal codificado: se usa el nombre ASCII de respaldo.
    }
  }
  return /filename\s*=\s*"([^"]+)"/i.exec(header)?.[1] ?? FALLBACK_FILE_NAME;
}

@Injectable({ providedIn: 'root' })
export class SigningUploadService {
  private readonly http = inject(HttpClient);

  upload(data: SigningUpload): Observable<SignatureRequestCreated> {
    const body = new FormData();
    body.append('file', data.file, data.file.name);
    body.append('signer_full_name', data.fullName.trim());
    body.append('signer_identifier', data.identifier);
    if (data.email.trim()) body.append('signer_email', data.email.trim());
    return this.http.post<SignatureRequestCreated>(`${environment.apiUrl}/admin/signing-uploads`, body);
  }

  downloadVersion(documentId: string, versionNumber = 1): Observable<DownloadedFile> {
    return this.http
      .get(`${environment.apiUrl}/documents/${documentId}/versions/${versionNumber}/download`, {
        responseType: 'blob',
        observe: 'response',
      })
      .pipe(
        map((response) => ({
          blob: response.body ?? new Blob(),
          fileName: fileNameFromDisposition(response.headers.get('Content-Disposition')),
        })),
      );
  }
}
