import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { User } from '@supabase/supabase-js';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    FormsModule,
    ReactiveFormsModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  pageLoading = true;
  loading = false;
  isInitialized = false;
  setupForm: FormGroup = new FormGroup({
    username: new FormControl(),
    bankroll: new FormControl(),
  });
  errorMessage: string | null = null; // Variabile per gestire gli errori
  user: User | null = null;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly formBuilder: FormBuilder
  ) {
  }

  ngOnInit() {
    try {
      console.log('On init');
      this.user = this.supabase.getUser();
      if (this.user) {
        const bankroll = this.user.user_metadata['starting_bankroll'];
        if (bankroll) {
          console.log(bankroll);
          this.isInitialized = true;
        }
      }
    } catch (error) {
      console.error('Pippo:', error);
    } finally {
      this.pageLoading = false;
    }
  }

  async pippoPappo(): Promise<boolean> {
    console.log('Ciao');
    return Promise.resolve(false);
  }

  async checkSetup(): Promise<void> {
    console.log('Check Setup');
    try {
      // const timeout = new Promise((_, reject) => {
      //   setTimeout(() => {console.log('Timeout nel check setup');reject(new Error('Request timed out'))}, 5000); // 5 secondi
      // });

      const { data, error } = await this.supabase.getSetup();
      console.log('Supabase richiamato', data, error);
      if (error) {
        this.errorMessage = 'Errore durante il caricamento del setup';
        console.error('Errore:', error);
        return;
      }

      if (data) {
        console.log('Il setup è inizializzato');
        this.isInitialized = true;
        this.errorMessage = null; // Reset error message if data is valid
      } else {
        console.log('Setup da inizializzare');
        this.isInitialized = false;
      }
    } catch (error) {
      this.errorMessage = 'Timeout o errore di rete';
      console.error('Errore:', error);
    }
  }

  async onSubmitUpdateProfile(): Promise<void> {
    this.loading = true;
    const bankroll: number = this.setupForm.value.bankroll as number;
    const username: string = this.setupForm.value.username as string;
    const { data, error } = await this.supabase.updateProfile(this.user!, username, bankroll);
    if (error) {
      this.errorMessage = "Errore durante l'update del profilo";
      console.error('Errore:', error);
    } else {
      this.errorMessage = null; // Reset error message after successful submission
    }
    this.loading = false;
  }

  async updateUser() {
    this.supabase.updateProfile(this.supabase.getUser()!, 'kevin mask jr', 0);
  }

  printUser() {
    return JSON.stringify(this.supabase.getUser());
  }

  getUsername() {
    return this.user?.user_metadata['username'];
  }

  getBankroll() {
    return this.user?.user_metadata['starting_bankroll'];
  }

}
