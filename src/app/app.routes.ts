import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './core/auth/guards';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell').then((m) => m.Shell),
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'clients',
        loadComponent: () => import('./features/clients/client-list').then((m) => m.ClientList),
      },
      {
        path: 'clients/new',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/clients/client-form').then((m) => m.ClientForm),
      },
      {
        path: 'clients/:id/edit',
        loadComponent: () => import('./features/clients/client-form').then((m) => m.ClientForm),
      },
      {
        path: 'clients/:id',
        loadComponent: () => import('./features/clients/client-view').then((m) => m.ClientView),
      },
      {
        path: 'tasks',
        loadComponent: () => import('./features/tasks/task-list').then((m) => m.TaskList),
      },
      {
        path: 'time',
        loadComponent: () => import('./features/time/time-entries').then((m) => m.TimeEntries),
      },
      {
        path: 'users',
        loadComponent: () => import('./features/users/user-list').then((m) => m.UserList),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
