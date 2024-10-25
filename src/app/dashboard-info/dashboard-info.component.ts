import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardTableComponent } from '../dashboard-table/dashboard-table.component';
import { DashboardGraphComponent } from '../dashboard-graph/dashboard-graph.component';
import { Strategy } from '../models/strategy.model';
import { Bet } from '../models/bet.model';
import { map, Observable } from 'rxjs';
import { Profile } from '../models/profile.model';

@Component({
  selector: 'app-dashboard-info',
  standalone: true,
  imports: [CommonModule, DashboardTableComponent, DashboardGraphComponent],
  templateUrl: './dashboard-info.component.html',
  styleUrl: './dashboard-info.component.css',
})
export class DashboardInfoComponent {
  @Input({ required: true }) profile$!: Observable<Profile | undefined>;
  @Input({ required: true }) strategy_id!: number;

  filteredBets: Bet[] = [];
  mediaQuota: number = 0;
  winRate: number = 0;
  tableSelected: boolean = true;
  graphSelected: boolean = false;
  strategy?: Strategy;

  constructor() {}

  ngOnInit() {
    this.profile$.subscribe((p) => {
      if (p) {
        this.strategy = p?.strategies.find((s) => s.id === this.strategy_id);
        this.doLogic();
      }
    });
  }

  doLogic() {
    if (this.strategy) {
      let totalOdds = 0;
      let wonNumber = 0;
      let totalBets = 0;
      let totalBetsWL = 0;
      this.filteredBets = this.strategy.bets;
      this.filteredBets.forEach((b) => {
        totalOdds += b.odds;
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
    }
  }

  toogleButtonGroup(type: string) {
    if (type === 'table' && !this.tableSelected) {
      this.tableSelected = true;
      this.graphSelected = false;
    } else if (type === 'graph' && !this.graphSelected) {
      this.tableSelected = false;
      this.graphSelected = true;
    }
  }
}
