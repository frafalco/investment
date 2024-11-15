import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, TemplateRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NgbModal, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { Observable } from 'rxjs';
import { DashboardTableService } from '../services/dashboard-table.service';
import { DashboardTableComponent } from "../dashboard-table/dashboard-table.component";
import { DashboardInfoComponent } from '../dashboard-info/dashboard-info.component';
import { Profile } from '../models/profile.model';
import { Strategy } from '../models/strategy.model';
import { Store } from '@ngrx/store';
import { AppState } from '../store/app.state';
import { selectProfile } from '../store/profile.selector';
import { Bet } from '../models/bet.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    NgbNavModule,
    DashboardTableComponent,
    ReactiveFormsModule,
    DashboardInfoComponent,
    RouterLink
],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  providers: [DashboardTableService, DecimalPipe]
})
export class DashboardComponent {
  // userInfo: UserInfo | undefined;
  profile$: Observable<Profile | undefined>;
  username: string = '';
  strategies: Strategy[] = [];
  addStrategyForm = new FormGroup({
    name: new FormControl<string>('', Validators.required),
    starting_bankroll: new FormControl<number>(0, Validators.required),
    str_type: new FormControl<string>('', Validators.required),
  });
  active_id: string | null;
  totalWagered: number = 0;
  totalProfit: number = 0;
  totalBankroll: number = 0;
  totalBets: number = 0;
  totalPendingBets: number = 0;

  constructor(private store: Store<AppState>, private modalService: NgbModal, route: ActivatedRoute) {
    this.profile$ = store.select(selectProfile);
    this.active_id = route.snapshot.queryParamMap.get('strategy');
    this.profile$.subscribe((p) => {
      if(p) {
        p.strategies.forEach((s) => {
          this.totalWagered += s.total_wagered;
          this.totalProfit += s.profit;
          this.totalBankroll += s.starting_bankroll;
          this.totalBets += s.bets.length;
          this.totalPendingBets += s.bets.filter(b => b.result === 'pending').length;
        })
      }
    })
  }

  open(content: TemplateRef<any>) {
		this.modalService.open(content, { ariaLabelledBy: 'modal-basic-title' });
	}

  retrievePendingBets(bet: Bet, index: number, bets: Bet[]): boolean {
    return bet.result === 'pending';
  }
}
