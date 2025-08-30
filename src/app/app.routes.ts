import { Routes } from '@angular/router';
import { TabsComponent } from './components/tabs/tabs.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'tabs',
    component: TabsComponent,
    canActivateChild: [authGuard],
    children: [
      {
        path: 'home',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/home/home.page').then((m) => m.HomePage),
          },
          {
            path: 'completar_mantencion/:id',
            loadComponent: () =>
              import('./pages/home/completar_mantencion/completar_mantencion.page').then((m) => m.CompletarMantencionPage),
          },
          {
            path: 'completar_mantencion',
            loadComponent: () =>
              import('./pages/home/completar_mantencion/completar_mantencion.page').then((m) => m.CompletarMantencionPage),
          },
        ],
      },
      {
        path: 'clientes',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/clientes/clientes.page').then((m) => m.ClientesPage),
          },
          {
            path: 'crear-clientes',
            loadComponent: () =>
              import('./pages/clientes/crear-clientes/crear-clientes.page').then((m) => m.CrearClientesPage),
          },
          {
            path: 'crear-clientes/:id',
            loadComponent: () =>
              import('./pages/clientes/crear-clientes/crear-clientes.page').then((m) => m.CrearClientesPage),
          },
        ],
      },
      {
        path: 'estadisticas',
        loadComponent: () =>
          import('./pages/estadisticas/estadisticas.page').then((m) => m.EstadisticasPage),
      },
      {
        path: 'perfil',
        loadComponent: () =>
          import('./pages/perfil/perfil.page').then(m => m.PerfilPage),
      },
      {
        path: '',
        redirectTo: '/tabs/home',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '',
    redirectTo: '/tabs/home',
    pathMatch: 'full',
  },  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then( m => m.LoginPage)
  },

];