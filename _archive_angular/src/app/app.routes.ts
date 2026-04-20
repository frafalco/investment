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
import { BacktestOverComponent } from './backtest-over/backtest-over.component';
import { AddBonusComponent } from './add-bonus/add-bonus.component';
import { BacktestUnderComponent } from './backtest-under/backtest-under.component';
import { BacktestDalembertComponent } from './backtest-dalembert/backtest-dalembert.component';
import { BacktestHtComponent } from './backtest-ht/backtest-ht.component';
import { JsonUtilityComponent } from './json-utility/json-utility.component';

export const routes: Routes = [
    {path: '', pathMatch: 'full', component: HomeComponent},
    {path: 'dashboard', component: DashboardComponent},
    {path: 'add-bet', component: AddBetComponent},
    {path: 'add-bonus', component: AddBonusComponent},
    {path: 'login', component: LoginComponent},
    {path: 'profile', component: ProfileComponent},
    {path: 'backtest', component: BacktestComponent},
    {path: 'backtest-ht', component: BacktestHtComponent},
    {path: 'backtest-dalembert', component: BacktestDalembertComponent},
    {path: 'backtest-over', component: BacktestOverComponent},
    {path: 'backtest-under', component: BacktestUnderComponent},
    {path: 'edit-strategy/:id', component: EditStrategyComponent},
    {path: 'strategy/:id', component: DashboardInfoComponent},
    {path: 'json', component: JsonUtilityComponent},
    {path: '**', redirectTo: '/'}
];
