import { AsyncPipe, CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  NgbPaginationModule,
  NgbDatepickerModule,
} from '@ng-bootstrap/ng-bootstrap';
import { DashboardTableService } from '../services/dashboard-table.service';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../services/supabase.service';
import { Observable } from 'rxjs';
import { Strategy } from '../models/strategy.model';
import { Bet } from '../models/bet.model';
import { AppState } from '../store/app.state';
import { Store } from '@ngrx/store';
import { updateBet } from '../store/profile.actions';
import { Profile } from '../models/profile.model';
import * as ProfileActions from '../store/profile.actions';
import { TableBet } from '../models/table-bet.model';

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
  @Input({ required: true }) strategy$!: Observable<Strategy | undefined>;

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
  strategy?: Strategy;
  isLive: boolean = false;

  constructor(
    private store: Store<AppState>,
    public dashboardTableService: DashboardTableService
  ) {}

  ngOnInit() {
    this.bets$ = this.dashboardTableService.bets$;
    this.total$ = this.dashboardTableService.total$;
    this.strategy$.subscribe(s => {
      if(s) {
        this.strategy = s;
        if(this.strategy) {
          this.isLive = this.strategy.type === 'live';
          if(this.isLive) {
            const betRecord = this.strategy.bets.reduce((groups, bet) => {
              const key = `${bet.event}-${bet.date}`;
              if (!groups[key]) {
                groups[key] = [];
              }
              groups[key].push(bet);
              return groups;
            }, {} as Record<string, Bet[]>);
            const betsTable: TableBet[] = [];
            Object.keys(betRecord).forEach((key) => {
              const keySplitted = key.split('-');
              betsTable.push({
                date: keySplitted[1],
                bookmaker: betRecord[key][0].bookmaker,
                unit: 0,
                bet: 0,
                result: '',
                strategy_id: s.id,
                event: keySplitted[0],
                sub_bets: betRecord[key].map(bet => {
                  return {
                    unit: bet.unit,
                    bet: bet.bet,
                    result: bet.result,
                    profit: bet.profit,
                  }
                })
              })
            });
            this.dashboardTableService.initializeBets(this.strategy.bets);
          } else {
            this.dashboardTableService.initializeBets(this.strategy.bets);
          }
        }
      }
    })
  }

  resetFilters(): void {
    this.dashboardTableService.bookmaker = '';
    this.dashboardTableService.date = null;
    this.dashboardTableService.result = '';
  }

  toogleEditRow(item: Bet, cancel: boolean) {
    const id = item.id!;
    const currentState = this.editRow[id];
    this.editRow[id] = !currentState;
    if (currentState && !cancel) {
      //TODO update table
      let profit = 0;
      const previousProfit = item.profit ?? 0;
      switch (this.newResultValue) {
        case 'won':
          profit = item.bet * item.odds! - item.bet;
          break;
        case 'lost':
          profit = -item.bet;
          break;
        default:
          break;
      }
      const bet: Bet = {
        ...item,
        result: this.newResultValue,
        profit,
        updated_at: new Date().toISOString()
      };
      // this.dashboardTableService.addLoader();
      this.store.dispatch(updateBet({bet, strategy: this.strategy!, previousProfit}))
      // this.dashboardTableService.refreshData();
    }
  }

  deleteItem(item: Bet) {
    this.store.dispatch(ProfileActions.deleteBet({bet: item, strategy: this.strategy!}));
  }
}
