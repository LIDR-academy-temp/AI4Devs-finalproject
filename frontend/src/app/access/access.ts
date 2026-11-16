import { Component, computed, inject, input } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';

import { INVALID_TOKEN_REASON } from '../core/auth.interceptor';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-access',
  imports: [ReactiveFormsModule, ButtonModule, CardModule, InputTextModule, MessageModule],
  templateUrl: './access.html',
  styleUrl: './access.scss',
})
export class Access {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly motivo = input<string>();
  protected readonly rejected = computed(() => this.motivo() === INVALID_TOKEN_REASON);
  protected readonly form = new FormGroup({
    token: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] }),
  });

  protected submit(): void {
    if (this.form.invalid) return;
    this.auth.login(this.form.controls.token.value);
    void this.router.navigate(['/firmar']);
  }
}
