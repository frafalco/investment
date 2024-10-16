import { AsyncPipe, CommonModule, DecimalPipe } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Bet, SupabaseService } from '../services/supabase.service';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { User } from '@supabase/supabase-js';
import { NgbDatepickerModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { Observable } from 'rxjs';
import { DashboardTableService } from '../services/dashboard-table.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

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
    NgbPaginationModule,
    AsyncPipe,
    MatProgressSpinnerModule,
    NgbDatepickerModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  providers: [DashboardTableService, DecimalPipe]
})
export class DashboardComponent {
  loading = false;
  isInitialized = false;
  setupForm: FormGroup = new FormGroup({
    username: new FormControl(),
    bankroll: new FormControl(),
  });
  errorMessage: string | null = null; // Variabile per gestire gli errori
  user: User | null = null;
	bets$!: Observable<Bet[]>;
	total$!: Observable<number>;
  resultOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'lost', label: 'Lost' },
    { value: 'won', label: 'Won' },
    { value: 'void', label: 'Void' },
  ];
  editRow: any = {};
  newResultValue: string = '';

  constructor(
    private readonly supabase: SupabaseService,
    public dashboardTableService: DashboardTableService
  ) {
    supabase.userSubject.pipe().subscribe((user: User | null) => {
      this.user = user;
      if (this.user) {
        if (this.getBankroll()) {
          this.isInitialized = true;
          this.bets$ = this.dashboardTableService.bets$;
          this.total$ = this.dashboardTableService.total$;
        }
      }
    });
  }

  // ngOnInit() {
  //   try {
  //     console.log('On init');
  //     this.user = this.supabase.getUser();
  //     if (this.user) {
  //       if (this.getBankroll()) {
  //         this.isInitialized = true;
  //         this.results$ = this.dashboardTableService.results$;
  //         this.total$ = this.dashboardTableService.total$;
  //       }
  //     }
  //   } catch (error) {
  //     console.error('Pippo:', error);
  //   }
  // }

  async onSubmitUpdateProfile(): Promise<void> {
    this.loading = true;
    const bankroll: number = this.setupForm.value.bankroll as number;
    const username: string = this.setupForm.value.username as string;
    const { error } = await this.supabase.updateProfile(this.user!, username, bankroll);
    if (error) {
      this.errorMessage = "Errore durante l'update del profilo";
      console.error('Errore:', error);
    } else {
      this.errorMessage = null;
    }
    this.loading = false;
  }

  getUsername() {
    return this.user?.user_metadata['username'];
  }

  getBankroll() {
    return this.user?.user_metadata['starting_bankroll'];
  }

  getCurrentBankroll() {
    return parseFloat(this.user?.user_metadata['starting_bankroll']) + parseFloat(this.supabase.getUser()?.user_metadata['profit']);
  }

  getROI() {
    return this.user?.user_metadata['roi'];
  }

  resetFilters(): void {
    this.dashboardTableService.bookmaker = '';
    this.dashboardTableService.date = null;
    this.dashboardTableService.result = '';
  }

  async toogleEditRow(item: Bet) {
    const id = item.id!;
    const currentState = this.editRow[id];
    this.editRow[id] = !currentState;
    if(currentState) {
      //TODO update table
      let profit = 0;
      switch(this.newResultValue) {
        case 'won':
          profit = (item.bet * item.odds) - item.bet;
          break;
        case 'lost':
          profit = -item.bet;
          break;
        case 'void':
          break;
        default:
          return;
      }
      item.result = this.newResultValue;
      item.profit = profit;
      this.dashboardTableService.addLoader();
      await this.supabase.updateBetAndUser(this.user!, item);
      this.dashboardTableService.refreshData();
    }
  }

  async deleteItem(item: Bet) {
    this.dashboardTableService.addLoader();
    await this.supabase.deleteBet(item);
    this.dashboardTableService.refreshData();
  }

}
