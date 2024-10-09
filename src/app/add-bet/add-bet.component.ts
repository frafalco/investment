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
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { NgModule } from '@angular/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { User } from '@supabase/supabase-js';


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
    MatDatepickerModule,
    MatInputModule,
    MatNativeDateModule
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
  
    submitForm = new FormGroup({
    date: new FormControl(new Date(), Validators.required),  
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

  constructor(private supabaseService: SupabaseService, private router: Router) {}

  ngOnInit() {
    this.user = this.supabaseService.getUser();
    if(!this.user) {
      this.router.navigate(['/login']);
    }
    this.bankroll = this.user?.user_metadata['starting_bankroll'];
  }

  stakeOnChange(event: Event) {
    const target: HTMLInputElement = event.target as HTMLInputElement;
    const valueString = target.value;
    const floatValue = parseFloat(valueString);
    let betValue = '';
    if(!isNaN(floatValue)) {
      const betFloatValue = this.bankroll * floatValue *0.01; //TODO fix with real bankroll value
      betValue = '' + betFloatValue;
    }
    this.submitForm.patchValue({bet: betValue});
  }

  onSubmit() {
    this.console.log(this.submitForm.value);
    
    const updateValue = {
      ...this.submitForm.value,
      user_id: this.user!.id
    }

    this.console.log(updateValue)

    this.supabaseService
      .submitForm(updateValue)
      .then((response) => {
        this.console.log(response);
      })
      .catch((error) => {
        this.console.log(error);
      });
    }

  results: any[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'Lost', label: 'Lost' },
    { value: 'won', label: 'Won' },
    { value: 'void', label: 'Void' },
  ];
}
