import { AsyncPipe, CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NgbPaginationModule, NgbDatepickerModule } from '@ng-bootstrap/ng-bootstrap';
import { DashboardTableService } from '../services/dashboard-table.service';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../services/supabase.service';
import { Bet, Profile, UserInfo } from '../bean/beans';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-dashboard-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgbPaginationModule,
    AsyncPipe,
    MatProgressSpinnerModule,
    NgbDatepickerModule
  ],
  templateUrl: './dashboard-table.component.html',
  styleUrl: './dashboard-table.component.css'
})
export class DashboardTableComponent {
  profile!: Profile | null;
  username!: string;
  resultOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'lost', label: 'Lost' },
    { value: 'won', label: 'Won' },
    { value: 'void', label: 'Void' },
  ];
  editRow: any = {};
  newResultValue: string = '';
	bets$!: Observable<Bet[]>;
	total$!: Observable<number>;

  constructor(
    private supabase: SupabaseService,
    public dashboardTableService: DashboardTableService
  ) {
    supabase.userInfo$.subscribe((userInfo: UserInfo) => {
      this.profile = userInfo.profile;
      this.username = userInfo.profile ? userInfo.profile.username ?? userInfo.profile.email : 'Anonymus';
      this.bets$ = this.dashboardTableService.bets$;
      this.total$ = this.dashboardTableService.total$;
    })
  }

  resetFilters(): void {
    this.dashboardTableService.bookmaker = '';
    this.dashboardTableService.date = null;
    this.dashboardTableService.result = '';
  }

  async toogleEditRow(item: Bet) {
    const id = item.id!;
    const currentState = this.editRow[id];
    this.editRow[id] = !currentState;
    if(currentState) {
      //TODO update table
      let profit = 0;
      switch(this.newResultValue) {
        case 'won':
          profit = (item.bet * item.odds) - item.bet;
          break;
        case 'lost':
          profit = -item.bet;
          break;
        case 'void':
          break;
        default:
          return;
      }
      item.result = this.newResultValue;
      item.profit = profit;
      this.dashboardTableService.addLoader();
      await this.supabase.updateBetAndStrategy(item);
      this.dashboardTableService.refreshData();
    }
  }

  async deleteItem(item: Bet) {
    this.dashboardTableService.addLoader();
    await this.supabase.deleteBet(item);
    this.dashboardTableService.refreshData();
  }
}
