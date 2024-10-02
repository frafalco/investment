import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AddBetComponent } from './add-bet/add-bet.component';

export const routes: Routes = [
    {path: 'dashboard', component: DashboardComponent},
    {path: 'add-bet', component: AddBetComponent},
    {path: '**', redirectTo: '/dashboard'}
];
