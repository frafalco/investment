import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AddBetComponent } from './add-bet/add-bet.component';
import { LoginComponent } from './login/login.component';
import { isAuthGuard } from './guards/is-auth.guard';

export const routes: Routes = [
    {path: '', redirectTo: '/dashboard', pathMatch: 'full'},
    {path: 'dashboard', component: DashboardComponent, pathMatch: 'full', canActivate: [isAuthGuard]},
    {path: 'add-bet', component: AddBetComponent, canActivate: [isAuthGuard]},
    {path: 'login', component: LoginComponent},
    {path: '**', redirectTo: '/dashboard'}
];
