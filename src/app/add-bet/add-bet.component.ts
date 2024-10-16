import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  Form,
  FormBuilder,
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
import { Bet, SupabaseService } from '../services/supabase.service';
import { NgModule } from '@angular/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { User } from '@supabase/supabase-js';
import {
  NgbDateParserFormatter,
  NgbDatepickerModule,
  NgbDateStruct,
} from '@ng-bootstrap/ng-bootstrap';

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
    NgbDatepickerModule,
  ],
  templateUrl: './add-bet.component.html',
  styleUrl: './add-bet.component.css',
})
export class AddBetComponent {
  console = console;
  pageLoading = true;
  loading = false;
  isInitialized = false;
  errorMessage: string | null = null;
  options = ['Won', 'Lost', 'Pending'];
  selectedOption: string | undefined;
  user: User | null = null;
  bankroll: number = 0;

  results: any[] = [
    { value: 'pending', label: 'Pending', disabled: false },
    { value: 'lost', label: 'Lost', disabled: true },
    { value: 'won', label: 'Won', disabled: true },
    { value: 'void', label: 'Void', disabled: true },
  ];

  submitForm = new FormGroup({
    date: new FormControl<NgbDateStruct | null>(null, Validators.required),
    bookmaker: new FormControl('', Validators.required),
    odds: new FormControl('', [
      Validators.required,
      Validators.pattern(/^\d+(\.\d{1,2})?$/),
    ]),
    stake: new FormControl('', [
      Validators.required,
      Validators.pattern(/^\d+(\.\d{1,2})?$/),
    ]),
    bet: new FormControl(''),
    result: new FormControl('pending', Validators.required),
  });

  constructor(
    private supabaseService: SupabaseService,
    private router: Router,
    private ngbDateParserFormatter: NgbDateParserFormatter
  ) {}

  ngOnInit() {
    this.user = this.supabaseService.getUser();
    if (!this.user) {
      this.router.navigate(['/login']);
    }
    this.bankroll = this.user?.user_metadata['starting_bankroll'];
  }

  stakeOnChange(event: Event) {
    const target: HTMLInputElement = event.target as HTMLInputElement;
    const valueString = target.value;
    const floatValue = parseFloat(valueString);
    let betValue = '';
    if (!isNaN(floatValue)) {
      const betFloatValue = this.bankroll * floatValue * 0.01; //TODO fix with real bankroll value
      betValue = '' + betFloatValue;
    }
    this.submitForm.patchValue({ bet: betValue });
  }

  onSubmit() {
    this.console.log(this.submitForm.value);

    const result: Bet = {
      date: this.ngbDateParserFormatter.format(this.submitForm.value.date!),
      bet: parseFloat(this.submitForm.value.bet!),
      bookmaker: this.submitForm.value.bookmaker!,
      odds: parseFloat(this.submitForm.value.odds!),
      result: this.submitForm.value.result!,
      stake: parseFloat(this.submitForm.value.stake!),
      user_id: this.user!.id,
    };

    this.console.log(result);

    this.supabaseService
      .insertBet(result)
      .then((response) => {
        this.console.log(response);
      })
      .catch((error) => {
        this.console.log(error);
      });

    this.submitForm.reset();
  }
}
