import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardTableComponent } from '../dashboard-table/dashboard-table.component';
import { DashboardGraphComponent } from '../dashboard-graph/dashboard-graph.component';
import { Strategy } from '../models/strategy.model';
import { Bet } from '../models/bet.model';
import { map, Observable } from 'rxjs';
import { Profile } from '../models/profile.model';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { AppState } from '../store/app.state';
import { selectStrategyFromId } from '../store/profile.selector';
import { Bonus } from '../models/bonus.model';

@Component({
  selector: 'app-dashboard-info',
  standalone: true,
  imports: [CommonModule, DashboardTableComponent, DashboardGraphComponent, RouterLink],
  templateUrl: './dashboard-info.component.html',
  styleUrl: './dashboard-info.component.css',
})
export class DashboardInfoComponent {
  strategyId: string | null = null;
  strategy$!: Observable<Strategy | undefined>;
  filteredBets: Bet[] = [];
  bonus: Bonus[] = [];
  mediaQuota: number = 0;
  winRate: number = 0;
  tableSelected: boolean = true;
  graphSelected: boolean = false;
  strategy?: Strategy;

  constructor(private route: ActivatedRoute, private store: Store<AppState>) {
    this.strategyId = this.route.snapshot.paramMap.get('id');
    this.strategy$ = this.store.select(selectStrategyFromId(+this.strategyId!));
      this.strategy$.subscribe((s) => {
        this.strategy = s;
        this.doLogic();
      });
  }

  ngOnInit() {
    // this.profile$.subscribe((p) => {
    //   if (p) {
    //     this.strategy = p?.strategies.find((s) => s.id === this.strategy_id);
    //     this.doLogic();
    //   }
    // });
  }

  doLogic() {
    if (this.strategy ) {
      if(this.strategy.type !== 'bonus') {
        let totalOdds = 0;
        let wonNumber = 0;
        let totalBets = 0;
        let totalBetsWL = 0;
        this.filteredBets = this.strategy.bets;
        this.filteredBets.forEach((b) => {
          totalOdds += b.odds ?? 0;
          if (b.result === 'won') {
            wonNumber++;
            totalBetsWL++;
          } else if(b.result === 'lost'){
            totalBetsWL++;
          }
          totalBets++;
        });
        if (totalBets > 0) {
          this.mediaQuota = totalOdds / totalBets;
          this.winRate = wonNumber / totalBetsWL;
        }
      } else {
        this.bonus = [...this.strategy.bonus].sort((a, b) => a.date! < b.date! ? -1 : a.date! > b.date! ? 1 : 0)
      }
    }
  }
}
