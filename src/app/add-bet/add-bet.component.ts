import { CommonModule } from '@angular/common';
import { Component, TemplateRef } from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { User } from '@supabase/supabase-js';
import { Strategy } from '../models/strategy.model';
import { Bet } from '../models/bet.model';
import { Store } from '@ngrx/store';
import { AppState } from '../store/app.state';
import { Observable } from 'rxjs';
import { selectStrategiesAddBet } from '../store/profile.selector';
import { DatetimepickerComponent } from '../datetimepicker/datetimepicker.component';
import * as ProfileActions from '../store/profile.actions';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-add-bet',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
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

  potentialWin: number | undefined;
  bettedUnits: number | undefined;
  oddsCalc: number | undefined;
  unitToBet: string | undefined;

  results: any[] = [
    { value: 'pending', label: 'Pending', disabled: false },
    { value: 'lost', label: 'Lost', disabled: true },
    { value: 'won', label: 'Won', disabled: true },
    { value: 'void', label: 'Void', disabled: true },
  ];

  submitForm!: FormGroup;

  constructor(
    private store: Store<AppState>,
    private router: Router,
    private modalService: NgbModal
  ) {
    this.strategies$ = store.select(selectStrategiesAddBet);
  }

  ngOnInit() {
    this.submitForm = new FormGroup(
      {
        strategy_id: new FormControl('', Validators.required),
        date: new FormControl('', Validators.required),
        event: new FormControl('', Validators.required),
        // bookmaker: new FormControl('', Validators.required),
        odds: new FormControl('', [
          Validators.required,
          Validators.pattern(/^\d+(\.\d{1,2})?$/),
        ]),
        unit: new FormControl('', [
          Validators.required,
          Validators.pattern(/^\d+(\.\d{1,5})?$/),
        ]),
        bet: new FormControl(''),
        result: new FormControl('pending', Validators.required),
        bets: new FormArray([]),
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
    this.submitForm.get('odds')?.valueChanges.subscribe((value) => {
      this.oddsCalc = value;
    });
  }

  onUnitChange(value: any) {
    let betValue = '';
    if (value) {
      const floatValue = parseFloat(value);
      if (!isNaN(floatValue)) {
        const betFloatValue = this.bankroll * floatValue * 0.01;
        betValue = betFloatValue.toFixed(2);
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
    const result: Bet = {
      date: this.submitForm.value.date!,
      bet: parseFloat(this.submitForm.value.bet!),
      odds: parseFloat(this.submitForm.value.odds!),
      result: this.submitForm.value.result!,
      unit: parseFloat(this.submitForm.value.unit!),
      strategy_id: parseInt(this.submitForm.value.strategy_id!),
      event: this.submitForm.value.event!,
    };

    this.store.dispatch(ProfileActions.addBet({ bet: result }));

    this.router.navigateByUrl(`/strategy/${this.submitForm.value.strategy_id}`);
  }

  open(content: TemplateRef<any>) {
    this.modalService.open(content, {
      ariaLabelledBy: 'modal-edit-bet',
      backdrop: 'static',
    });
  }

  calculateBet() {
    if(this.potentialWin && this.bettedUnits && this.oddsCalc) {
      this.unitToBet = ((this.potentialWin + this.bettedUnits) / this.oddsCalc).toFixed(5);
      this.submitForm.patchValue({ unit: this.unitToBet });
    }
  }
}
