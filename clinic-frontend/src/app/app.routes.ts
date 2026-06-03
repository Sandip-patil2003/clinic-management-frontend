import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { MainLayout } from './layout/main-layout/main-layout';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/auth/login/login')
        .then(m => m.Login)
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login')
        .then(m => m.Login)
  },
  {
    path: '',
    component: MainLayout,
    children: [

      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard/dashboard')
            .then(m => m.Dashboard)
      },
      {
        path: 'add-patient',
        loadComponent: () =>
          import('./features/Patient/add-patient/add-patient')  
            .then(m => m.AddPatient)
      },
      {
        path: 'add-patient/:id',
        loadComponent: () =>
          import('./features/Patient/add-patient/add-patient')  
            .then(m => m.AddPatient)
      },
      {
        path: 'patients-list',
        loadComponent: () =>
          import('./features/Patient/patient-list/patient-list')  
            .then(m => m.PatientList)
      },
      {
        path: 'visits',
        loadComponent: () =>
          import('./features/visits/visit/visit')
            .then(m => m.Visit)
      },
      {
        path: 'prescriptions',
        loadComponent: () =>
          import('./features/prescriptions/create-prescription/create-prescription')
            .then(m => m.CreatePrescription)
      }
    ]
  },
];
