import { AsyncPipe, CommonModule } from '@angular/common';
import { Component, Input, numberAttribute } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  NgbPaginationModule,
  NgbDatepickerModule,
} from '@ng-bootstrap/ng-bootstrap';
import { DashboardTableService } from '../services/dashboard-table.service';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../services/supabase.service';
import { Bet, Profile, Strategy, UserInfo } from '../bean/beans';
import { Observable, switchMap } from 'rxjs';

@Component({
  selector: 'app-dashboard-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgbPaginationModule,
    AsyncPipe,
    MatProgressSpinnerModule,
    NgbDatepickerModule,
  ],
  templateUrl: './dashboard-table.component.html',
  styleUrl: './dashboard-table.component.css',
})
export class DashboardTableComponent {
  @Input({ required: true }) strategy_id!: number;

  profile!: Profile | null;
  strategy!: Strategy;
  mediaQuota: number = 0;
  winRate: number = 0;
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
  ) {}

  ngOnInit() {
    this.supabase.userInfo$.subscribe((userInfo: UserInfo) => {
      this.profile = userInfo.profile;
      this.strategy = userInfo.strategies.find(
        (s) => s.id === this.strategy_id
      )!;
      this.username = userInfo.profile
        ? userInfo.profile.username ?? userInfo.profile.email
        : 'Anonymus';
      this.bets$ = this.dashboardTableService.bets$;
      this.total$ = this.dashboardTableService.total$;
      this.retrieveBetInfo(userInfo.bets);
    });
    this.dashboardTableService.strategyID = this.strategy_id;
  }

  retrieveBetInfo(bets: Bet[]) {
    let totalOdds = 0;
    let wonNumber = 0;
    let totalBets = 0;
    bets
      .filter((b) => b.strategy_id === this.strategy_id)
      .forEach((b) => {
        totalOdds += b.odds;
        if (b.result === 'won') {
          wonNumber++;
        }
        totalBets++;
      });
    if (totalBets > 0) {
      this.mediaQuota = totalOdds / totalBets;
      this.winRate = wonNumber / totalBets;
    }
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
    if (currentState) {
      //TODO update table
      let profit = 0;
      switch (this.newResultValue) {
        case 'won':
          profit = item.bet * item.odds - item.bet;
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
