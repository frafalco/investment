import { Component } from '@angular/core';
import { Profile } from '../models/profile.model';
import { Store } from '@ngrx/store';
import { AppState } from '../store/app.state';
import { selectProfile } from '../store/profile.selector';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { DashboardGraphComponent } from '../dashboard-graph/dashboard-graph.component';
import { Bet } from '../models/bet.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, DashboardGraphComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  profile$: Observable<Profile | undefined>;
  initialBet: Bet = {bookmaker: '', unit: 0, bet: 0, result: '', strategy_id: 0, event: ''};
  
  constructor(private store: Store<AppState>) {
    this.profile$ = store.select(selectProfile);
  }

  retrieveLastSignalDate(latest: Bet, bet: Bet, index: number, bets: Bet[]): Bet {
    if(latest?.date) {
      return new Date(bet.date!) > new Date(latest.date!) ? bet : latest;
    }
    return bet;
  }
}
