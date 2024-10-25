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
  @Input({ required: true }) profile$!: Observable<Profile | undefined>;
  @Input({ required: true }) strategy_id!: number;

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

  constructor(
    private store: Store<AppState>,
    public dashboardTableService: DashboardTableService
  ) {}

  ngOnInit() {
    this.bets$ = this.dashboardTableService.bets$;
    this.total$ = this.dashboardTableService.total$;
    this.profile$.subscribe(p => {
      if(p) {
        this.strategy = p.strategies.find(s => s.id === this.strategy_id);
        if(this.strategy) {
          this.dashboardTableService.initializeBets(this.strategy.bets);
        }
      }
    })
  }

  resetFilters(): void {
    this.dashboardTableService.bookmaker = '';
    this.dashboardTableService.date = null;
    this.dashboardTableService.result = '';
  }

  toogleEditRow(item: Bet) {
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
      const bet: Bet = {
        ...item,
        result: this.newResultValue,
        profit,
        updated_at: new Date().toISOString()
      };
      // this.dashboardTableService.addLoader();
      this.store.dispatch(updateBet({bet, strategy: this.strategy!}))
      // this.dashboardTableService.refreshData();
    }
  }

  deleteItem(item: Bet) {
    this.store.dispatch(ProfileActions.deleteBet({bet: item, strategy: this.strategy!}));
  }
}
