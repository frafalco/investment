import { AsyncPipe, CommonModule } from '@angular/common';
import { Component, Input, TemplateRef } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  NgbPaginationModule,
  NgbDatepickerModule,
  NgbModal,
  NgbActiveModal,
} from '@ng-bootstrap/ng-bootstrap';
import { DashboardTableService } from '../services/dashboard-table.service';
import {
  FormArray,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
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
import { DatetimepickerComponent } from '../datetimepicker/datetimepicker.component';

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
    ReactiveFormsModule,
    DatetimepickerComponent,
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

  editBetForm = new FormGroup(
    {
      id: new FormControl<number | null>(null, Validators.required),
      strategy_id: new FormControl<number | null>(null, Validators.required),
      date: new FormControl<string | null>('', Validators.required),
      event: new FormControl<string>('', Validators.required),
      bookmaker: new FormControl<string>('', Validators.required),
      odds: new FormControl<number | null>(null, [
        Validators.required,
        Validators.pattern(/^\d+(\.\d{1,2})?$/),
      ]),
      unit: new FormControl<number>(0, [
        Validators.required,
        Validators.min(0.01),
      ]),
      bet: new FormControl<number>(0, [Validators.required, Validators.min(1)]),
      result: new FormControl<string>('pending', Validators.required),
    },
    { updateOn: 'change' }
  );
  bankroll: number = 0;
  selectedBet?: Bet;

  constructor(
    private store: Store<AppState>,
    public dashboardTableService: DashboardTableService,
    private modalService: NgbModal
  ) {}

  ngOnInit() {
    this.bets$ = this.dashboardTableService.bets$;
    this.total$ = this.dashboardTableService.total$;
    this.strategy$.subscribe((s) => {
      if (s) {
        this.strategy = s;
        if (this.strategy) {
          this.isLive = this.strategy.type === 'live';
          if (this.isLive) {
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
                sub_bets: betRecord[key].map((bet) => {
                  return {
                    unit: bet.unit,
                    bet: bet.bet,
                    result: bet.result,
                    profit: bet.profit,
                  };
                }),
              });
            });
            this.dashboardTableService.initializeBets(this.strategy.bets);
          } else {
            this.dashboardTableService.initializeBets(this.strategy.bets);
          }
        }
      }
    });
    this.editBetForm.get('unit')?.valueChanges.subscribe((value) => {
      let betValue = 0;
      if (value) {
        if (!isNaN(value)) {
          betValue = this.bankroll * value * 0.01;
        }
      }
      this.editBetForm.patchValue({ bet: betValue });
    });
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
        updated_at: new Date().toISOString(),
      };
      // this.dashboardTableService.addLoader();
      this.store.dispatch(updateBet({ bet, previousProfit }));
      // this.dashboardTableService.refreshData();
    }
  }

  deleteItem(modal: NgbActiveModal) {
    if (confirm('Are you sure to delete this bet?')) {
      this.store.dispatch(ProfileActions.deleteBet({ bet: this.selectedBet! }));
      modal.close();
    }
  }

  open(content: TemplateRef<any>, bet: Bet) {
    this.selectedBet = bet;
    this.editBetForm.patchValue({
      id: bet.id,
      strategy_id: bet.strategy_id,
      bookmaker: bet.bookmaker,
      date: bet.date,
      event: bet.event,
      unit: bet.unit,
      bet: bet.bet,
      odds: bet.odds,
      result: bet.result,
    });
    this.bankroll = (bet.bet * 100) / bet.unit;
    this.modalService.open(content, {
      ariaLabelledBy: 'modal-edit-bet',
      backdrop: 'static',
    });
  }

  editBet(modal: NgbActiveModal) {
    const item = this.editBetForm.getRawValue() as Bet;
    let profit = 0;
    const previousProfit = this.selectedBet!.profit ?? 0;
    switch (item.result) {
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
      profit,
      updated_at: new Date().toISOString(),
    };
    this.store.dispatch(updateBet({ bet, previousProfit }));
    modal.close();
  }
}
