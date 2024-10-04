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
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { NgModule } from '@angular/core';

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
  json = JSON;

  submitForm = new FormGroup({
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
    result: new FormControl('', Validators.required),
  });

  constructor(private supabaseService: SupabaseService) {}

  stakeOnChange(event: Event) {
    const target: HTMLInputElement = event.target as HTMLInputElement;
    const valueString = target.value;
    const floatValue = parseFloat(valueString);
    let betValue = '';
    if(!isNaN(floatValue)) {
      const betFloatValue = 10000 * 0.1 * floatValue;//TODO fix with real bankroll value
      betValue = '' + betFloatValue;
    }
    this.submitForm.patchValue({bet: betValue});
  }

  onSubmit() {
    this.console.log(this.submitForm.value);

    this.supabaseService
      .submitForm(this.submitForm.value)
      .then((response) => {
        this.console.log(response);
      })
      .catch((error) => {
        this.console.log(error);
      });
  }

  results: any[] = [
    { id: 1, value: 'Pending' },
    { id: 2, value: 'Lost' },
    { id: 3, value: 'Won' },
  ];
}
