import { AbstractControl, ValidationErrors } from '@angular/forms';

const CUIL_PATTERN = /^\d{11}$/;

export function cuilValidator(control: AbstractControl<string | null>): ValidationErrors | null {
  return !control.value || CUIL_PATTERN.test(control.value) ? null : { cuil: true };
}

export type FileProblem = 'not_pdf' | 'too_large';

export function checkPdfFile(file: File, maxMb: number): FileProblem | null {
  if (!file.name.toLowerCase().endsWith('.pdf') || file.size === 0) return 'not_pdf';
  if (file.size > maxMb * 1024 * 1024) return 'too_large';
  return null;
}
