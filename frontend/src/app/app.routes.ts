import { Routes } from '@angular/router';

import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'acceso',
    loadComponent: () => import('./access/access').then((m) => m.Access),
    title: 'Acceso · Firmadoc',
  },
  {
    path: 'firmar',
    loadComponent: () => import('./signing/sign-document').then((m) => m.SignDocument),
    canActivate: [authGuard],
    title: 'Firmar documento · Firmadoc',
  },
  { path: '', pathMatch: 'full', redirectTo: 'firmar' },
  { path: '**', redirectTo: 'firmar' },
];
