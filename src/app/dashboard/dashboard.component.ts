import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';

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
  setupForm!: FormGroup;
  errorMessage: string | null = null; // Variabile per gestire gli errori

  constructor(
    private readonly supabase: SupabaseService,
    private readonly formBuilder: FormBuilder
  ) {
    this.createSetupForm();
  }

  ngOnInit() {
    try {
      console.log('On init');
      this.checkSetup().finally(() => {
        console.log('Finally');
        this.pageLoading = false; // Nascondi il loader al termine della chiamata
      });
    } catch (error) {
      console.error('Pippo:',error);
    }
  }

  async pippoPappo(): Promise<boolean> {
    console.log('Ciao');
    return Promise.resolve(false);
  }

  createSetupForm() {
    this.setupForm = this.formBuilder.group({
      bankroll: '',
    });
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

  async onSubmitSetup(): Promise<void> {
    this.loading = true;
    const bankroll: string = this.setupForm.value.bankroll as string;
    const { data, error } = await this.supabase.insertSetup(bankroll);
    if (error) {
      this.errorMessage = "Errore durante l'inserimento del bankroll";
      console.error('Errore:', error);
    } else {
      this.errorMessage = null; // Reset error message after successful submission
    }
    this.loading = false;
  }

  async printSetup() {
    const { data, error } = await this.supabase.getSetup();
    console.log('printSetup:', data);
  }
}
