import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { FileUpload, FileUploadHandlerEvent, FileUploadModule } from 'primeng/fileupload';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { environment } from '../../environments/environment';
import { SignatureRequestCreated, SigningUploadService } from './signing-upload.service';
import { checkPdfFile, cuilValidator } from './validators';

type TextField = 'fullName' | 'identifier' | 'email';

interface UploadResult {
  request: SignatureRequestCreated;
  fileName: string;
  signerName: string;
  signerIdentifier: string;
  widgetSrc: SafeResourceUrl | null;
}

const notBlank = Validators.pattern(/\S/);

const API_FIELDS: Record<string, TextField> = {
  signer_full_name: 'fullName',
  signer_identifier: 'identifier',
  signer_email: 'email',
};

const UNAVAILABLE = 'No pudimos conectar con Firmadoc. Intentá de nuevo en unos minutos.';

@Component({
  selector: 'app-sign-document',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    CardModule,
    FileUploadModule,
    InputTextModule,
    MessageModule,
    ProgressSpinnerModule,
  ],
  templateUrl: './sign-document.html',
  styleUrl: './sign-document.scss',
})
export class SignDocument {
  private readonly uploads = inject(SigningUploadService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly fileUpload = viewChild(FileUpload);

  protected readonly maxUploadMb = environment.maxUploadMb;
  protected readonly uploading = signal(false);
  protected readonly fileError = signal<string | null>(null);
  protected readonly uploadError = signal<string | null>(null);
  protected readonly downloadError = signal<string | null>(null);
  protected readonly result = signal<UploadResult | null>(null);

  protected readonly form = new FormGroup({
    fullName: new FormControl('', { nonNullable: true, validators: [Validators.required, notBlank, Validators.maxLength(200)] }),
    identifier: new FormControl('', { nonNullable: true, validators: [Validators.required, cuilValidator] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.email] }),
    file: new FormControl<File | null>(null, { validators: [Validators.required] }),
  });

  protected onFileChosen(event: FileUploadHandlerEvent): void {
    const file = event.files[0];
    this.fileUpload()?.clear();
    const problem = file ? checkPdfFile(file, this.maxUploadMb) : 'not_pdf';
    this.fileError.set(
      problem === 'not_pdf' ? 'Elegí un archivo PDF' : problem === 'too_large' ? `El archivo supera los ${this.maxUploadMb} MB` : null,
    );
    this.form.controls.file.setValue(problem ? null : file);
  }

  protected showError(name: TextField): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.dirty || control.touched);
  }

  protected errorText(name: TextField, fallback: string): string {
    return this.form.controls[name].errors?.['api'] ?? fallback;
  }

  protected submit(): void {
    const { file, fullName, identifier, email } = this.form.getRawValue();
    if (this.form.invalid || !file || this.uploading()) return;
    this.uploading.set(true);
    this.uploadError.set(null);
    this.uploads.upload({ file, fullName, identifier, email }).subscribe({
      next: (request) => {
        this.uploading.set(false);
        this.result.set({
          request,
          fileName: file.name,
          signerName: fullName.trim(),
          signerIdentifier: identifier,
          widgetSrc: this.trustedWidgetUrl(request.signing_url),
        });
      },
      error: (error: unknown) => {
        this.uploading.set(false);
        this.showUploadError(error);
      },
    });
  }

  protected downloadOriginal(): void {
    const current = this.result();
    if (!current) return;
    this.downloadError.set(null);
    this.uploads.downloadVersion(current.request.document_id).subscribe({
      next: ({ blob, fileName }) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.downloadError.set('No pudimos descargar el documento. Intentá de nuevo.'),
    });
  }

  protected uploadAnother(): void {
    this.result.set(null);
    this.uploadError.set(null);
    this.downloadError.set(null);
    this.fileError.set(null);
    this.form.reset();
  }

  private trustedWidgetUrl(signingUrl: string): SafeResourceUrl | null {
    return signingUrl.startsWith(`${environment.widgetUrl}/`)
      ? this.sanitizer.bypassSecurityTrustResourceUrl(signingUrl)
      : null;
  }

  private showUploadError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse) || error.status === 0 || error.status >= 500) {
      this.uploadError.set(UNAVAILABLE);
      return;
    }
    if (error.status === 401) return;

    const body = error.error as { code?: string; message?: string; details?: { errors?: { field: string; message: string }[] } } | null;
    switch (body?.code) {
      case 'invalid_pdf':
        this.uploadError.set('El archivo no es un PDF válido o está protegido con contraseña');
        return;
      case 'file_too_large':
        this.uploadError.set('El archivo supera el tamaño máximo permitido');
        return;
      case 'validation_error': {
        const fieldErrors = (body.details?.errors ?? []).filter((e) => e.field in API_FIELDS);
        for (const fieldError of fieldErrors) {
          const control = this.form.controls[API_FIELDS[fieldError.field]];
          control.setErrors({ api: fieldError.message });
          control.markAsTouched();
        }
        if (fieldErrors.length === 0) this.uploadError.set(body.message ?? 'La API rechazó los datos de la carga');
        return;
      }
      default:
        this.uploadError.set(body?.message ?? UNAVAILABLE);
    }
  }
}
