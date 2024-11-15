import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { User } from '@supabase/supabase-js';
import { Strategy } from '../models/strategy.model';
import { Bet } from '../models/bet.model';
import { Store } from '@ngrx/store';
import { AppState } from '../store/app.state';
import { Observable } from 'rxjs';
import { selectStrategiesAddBet } from '../store/profile.selector';
import { DatetimepickerComponent } from '../datetimepicker/datetimepicker.component';
import * as ProfileActions from '../store/profile.actions';

@Component({
  selector: 'app-add-bet',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    FormsModule,
    RouterLink,
    RouterLinkActive,
    ReactiveFormsModule,
    DatetimepickerComponent,
  ],
  templateUrl: './add-bet.component.html',
  styleUrl: './add-bet.component.css',
})
export class AddBetComponent {
  strategies$: Observable<Strategy[] | undefined>;
  errorMessage: string | null = null;
  options = ['Won', 'Lost', 'Pending'];
  selectedOption: string | undefined;
  user: User | null = null;
  bankroll: number = 0;
  isLive: boolean = false;

  results: any[] = [
    { value: 'pending', label: 'Pending', disabled: false },
    { value: 'lost', label: 'Lost', disabled: true },
    { value: 'won', label: 'Won', disabled: true },
    { value: 'void', label: 'Void', disabled: true },
  ];

  submitForm!: FormGroup;

  constructor(private store: Store<AppState>, private router: Router) {
    this.strategies$ = store.select(selectStrategiesAddBet);
  }

  ngOnInit() {
    this.submitForm = new FormGroup(
      {
        strategy_id: new FormControl('', Validators.required),
        date: new FormControl('', Validators.required),
        event: new FormControl('', Validators.required),
        bookmaker: new FormControl('', Validators.required),
        odds: new FormControl('', [
          Validators.required,
          Validators.pattern(/^\d+(\.\d{1,2})?$/),
        ]),
        unit: new FormControl('', [
          Validators.required,
          Validators.pattern(/^\d+(\.\d{1,2})?$/),
        ]),
        bet: new FormControl(''),
        result: new FormControl('pending', Validators.required),
        bets: new FormArray([])
      },
      { updateOn: 'change' }
    );
    this.submitForm
      .get('strategy_id')
      ?.valueChanges.subscribe((strategy_id) => {
        if (strategy_id) {
          this.strategies$.forEach((strategies) => {
            if (strategies) {
              const selectedStrategy = strategies.find(
                (s) => s.id === +strategy_id
              );
              if (selectedStrategy) {
                this.bankroll = selectedStrategy.starting_bankroll;
                const oddsControl = this.submitForm.get('odds');
                const unitControl = this.submitForm.get('unit');
                const betsControl = this.submitForm.get('bets');
                if (selectedStrategy.type === 'live') {
                  this.isLive = true;
                  oddsControl?.setValidators([Validators.pattern(/^\d+(\.\d{1,2})?$/)]);
                  unitControl?.setValidators([Validators.pattern(/^\d+(\.\d{1,2})?$/)]);
                  betsControl?.setValidators([Validators.required]);
                  oddsControl?.updateValueAndValidity();
                  unitControl?.updateValueAndValidity();
                  betsControl?.updateValueAndValidity();
                } else {
                  this.isLive = false;
                  oddsControl?.setValidators([Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)]);
                  unitControl?.setValidators([Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)]);
                  betsControl?.setValidators([]);
                  oddsControl?.updateValueAndValidity();
                  unitControl?.updateValueAndValidity();
                  betsControl?.updateValueAndValidity();
                }
              }
            }
          });
        } else {
          this.bankroll = 0;
        }
        this.submitForm.patchValue({ unit: '' });
      });

    this.submitForm.get('unit')?.valueChanges.subscribe((value) => {
      this.onUnitChange(value);
    });
  }

  onUnitChange(value: any) {
    let betValue = '';
    if (value) {
      const floatValue = parseFloat(value);
      if (!isNaN(floatValue)) {
        const betFloatValue = this.bankroll * floatValue * 0.01;
        betValue = '' + betFloatValue;
      }
    }
    this.submitForm.patchValue({ bet: betValue });
  }

  get bets(): FormArray {
    return this.submitForm.get('bets') as FormArray;
  }

  insertNewBet() {
    const betGroup = new FormGroup({
      unit: new FormControl('', [
        Validators.required,
        Validators.pattern(/^\d+(\.\d{1,2})?$/),
      ]),
      bet: new FormControl(''),
    });

    betGroup.get('unit')?.valueChanges.subscribe((value) => {
      let betValue = '';
      if (value) {
        const floatValue = parseFloat(value);
        if (!isNaN(floatValue)) {
          const betFloatValue = this.bankroll * floatValue * 0.01;
          betValue = '' + betFloatValue;
        }
      }
      betGroup.patchValue({ bet: betValue });
    });

    this.bets.push(betGroup);
  }

  removeBet(index: number) {
    this.bets.removeAt(index);
  }

  onSubmit() {
    if(this.isLive) {
      for(const g of this.bets.controls) {
        setTimeout(() => {
          const result: Bet = {
            date: this.submitForm.value.date!,
            bet: parseFloat(g.value.bet!),
            bookmaker: this.submitForm.value.bookmaker!,
            result: this.submitForm.value.result!,
            unit: parseFloat(g.value.unit!),
            strategy_id: parseInt(this.submitForm.value.strategy_id!),
            event: this.submitForm.value.event!,
          };
          
          this.store.dispatch(ProfileActions.addBet({bet: result}));
        }, 1500)
      }
    } else {
      const result: Bet = {
        date: this.submitForm.value.date!,
        bet: parseFloat(this.submitForm.value.bet!),
        bookmaker: this.submitForm.value.bookmaker!,
        odds: parseFloat(this.submitForm.value.odds!),
        result: this.submitForm.value.result!,
        unit: parseFloat(this.submitForm.value.unit!),
        strategy_id: parseInt(this.submitForm.value.strategy_id!),
        event: this.submitForm.value.event!,
      };

      this.store.dispatch(ProfileActions.addBet({bet: result}));
    }

    this.router.navigate(['/dashboard'], {queryParams: {strategy: this.submitForm.value.strategy_id!}});
  }
}
