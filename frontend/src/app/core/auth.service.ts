import { computed, Injectable, signal } from '@angular/core';

export const TOKEN_STORAGE_KEY = 'firmadoc:admin-token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly stored = signal<string | null>(sessionStorage.getItem(TOKEN_STORAGE_KEY));

  readonly token = this.stored.asReadonly();
  readonly isLoggedIn = computed(() => this.stored() !== null);

  login(token: string): void {
    const value = token.trim();
    sessionStorage.setItem(TOKEN_STORAGE_KEY, value);
    this.stored.set(value);
  }

  logout(): void {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    this.stored.set(null);
  }
}
