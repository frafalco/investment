import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AddBetComponent } from './add-bet/add-bet.component';
import { LoginComponent } from './login/login.component';
import { isAuthGuard } from './guards/is-auth.guard';
import { HomeComponent } from './home/home.component';
import { ProfileComponent } from './profile/profile.component';
import { EditStrategyComponent } from './edit-strategy/edit-strategy.component';
import { DashboardInfoComponent } from './dashboard-info/dashboard-info.component';
import { BacktestComponent } from './backtest/backtest.component';

export const routes: Routes = [
    {path: '', pathMatch: 'full', component: HomeComponent},
    {path: 'dashboard', component: DashboardComponent},
    {path: 'add-bet', component: AddBetComponent},
    {path: 'login', component: LoginComponent},
    {path: 'profile', component: ProfileComponent},
    {path: 'backtest', component: BacktestComponent},
    {path: 'edit-strategy/:id', component: EditStrategyComponent},
    {path: 'strategy/:id', component: DashboardInfoComponent},
    {path: '**', redirectTo: '/'}
];
