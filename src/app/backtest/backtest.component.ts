import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, TemplateRef } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbModal, NgbActiveModal, NgbAccordionModule } from '@ng-bootstrap/ng-bootstrap';
import { SupabaseService } from '../services/supabase.service';
import { BehaviorSubject } from 'rxjs';
import { Strategy } from '../models/strategy.model';
import { DashboardGraphComponent } from "../dashboard-graph/dashboard-graph.component";
import { DashboardTableComponent } from "../dashboard-table/dashboard-table.component";
import { Store } from '@ngrx/store';
import { AppState } from '../store/app.state';
import * as ProfileActions from '../store/profile.actions';

@Component({
  selector: 'app-backtest',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DashboardGraphComponent, DashboardTableComponent, NgbAccordionModule],
  templateUrl: './backtest.component.html',
  styleUrl: './backtest.component.css'
})
export class BacktestComponent {

  progressionLength: number = 0;
  multiplier: number = 0;
  averageOdds: number = 0;
  teamID: string = '';
  leagueID: string = '';
  season: string = '';
  totalProfit: number = 0;
  matchWithoutX: number = 0;
  progressions: { name: string; bets: any[] }[] = [];
  obStrategyBT= new BehaviorSubject<Strategy | undefined>(undefined);
  strategyOptions: {name: string, id: number}[] = [];
  selectedStrategy: string = '';
  addStrategyBTForm = new FormGroup({
    name: new FormControl('', Validators.required)
  });

  strategyName: string = '';
  editStrategyNameDisabled: boolean = true;

  constructor(private store: Store<AppState>, private http: HttpClient, private supabase: SupabaseService, private modalService: NgbModal) {
    supabase.strategiesBT.subscribe(data => {
      this.strategyOptions = data.map(e => ({name: e.name, id: e.id}));
    })
  }

  addStrategyBT(modal: NgbActiveModal) {
    this.supabase.insertStrategyBT(this.addStrategyBTForm.value.name!);
    modal.close();
  }

  open(content: TemplateRef<any>) {
    this.modalService.open(content, {
      ariaLabelledBy: 'modal-add-strategyBT',
      backdrop: 'static',
    });
  }

  strategySelectChangeHandler() {
    if(this.selectedStrategy) {
      this.supabase.selectStrategyBTByID(parseInt(this.selectedStrategy)).subscribe(data => {
        this.strategyName = data.name;
        this.obStrategyBT.next(data);
      });
    } else {
      this.obStrategyBT.next(undefined);
    }
  }

  runBacktest(): void {
    const headers = {
      'x-rapidapi-host': 'v3.football.api-sports.io',
      'x-rapidapi-key': 'd694a908807e57340a12f89cba9d6eee',
    };
    this.progressions = [];
    this.totalProfit = 0;
    const urlMatches = `https://v3.football.api-sports.io/fixtures?season=${this.season}&team=${this.teamID}&league=${this.leagueID}`;
    this.http.get(urlMatches, { headers }).subscribe({
      next: (data: any) => {
        let selectedTeamName = '';
        const mappedArray = data.response.map((elem: any) => {
          if(!selectedTeamName) {
            selectedTeamName = elem.teams.home.id == this.teamID ? elem.teams.home.name : elem.teams.away.name;
          }
          const match = `${elem.teams.home.name}-${elem.teams.away.name}`;
          const halfTimeScore =
            elem.score.halftime.home > elem.score.halftime.away
              ? '1'
              : elem.score.halftime.home < elem.score.halftime.away
              ? '2'
              : 'X';
          const fullTimeScore =
            elem.score.fulltime.home > elem.score.fulltime.away
              ? '1'
              : elem.score.fulltime.home < elem.score.fulltime.away
              ? '2'
              : 'X';
          const date = elem.fixture.date;
          return {
            match,
            halfTimeScore,
            fullTimeScore,
            date,
          };
        });
        let counterFullTimeX = 0;
        let progressionSequence = 1;
        let currentUnit = 1;
        let total = 0;
        let prorgessionCounter = 1;
        let currentProgression: { name: string; bets: any[] } | null = null;
        mappedArray.forEach((element: any) => {
          if (counterFullTimeX >= this.matchWithoutX) {
            if (!currentProgression) {
              currentProgression = {
                name: `Progression ${prorgessionCounter}`,
                bets: [],
              };
              prorgessionCounter++;
            }
            if(progressionSequence > this.progressionLength) {
              console.log(`Sequence lost`);
              this.totalProfit -= total;
              counterFullTimeX = 0;
              progressionSequence = 1;
              currentUnit = 1;
              total = 0;
              this.progressions.push(currentProgression);
              currentProgression = null;
            } else {
              total += currentUnit;
              console.log(
                `Bet n° ${progressionSequence}, unit betted ${currentUnit}`
              );
              const bet = {
                date: element.date,
                match: element.match,
                event: `${selectedTeamName} [${String.fromCharCode(64 + progressionSequence)}]`,
                odds: this.averageOdds,
                bet: currentUnit,
                result: '',
                profit: 0,
              };
              if (element.fullTimeScore === 'X') {
                const won = currentUnit * this.averageOdds;
                const profit = won - total;
                this.totalProfit += profit;
                console.log(`Sequence won, profit ${profit}`);
                counterFullTimeX = 0;
                progressionSequence = 1;
                currentUnit = 1;
                total = 0;
                bet.result = 'won';
                bet.profit = won;
                currentProgression.bets = [...currentProgression.bets, bet];
                this.progressions.push(currentProgression);
                currentProgression = null;
              } else {
                bet.result = 'lost';
                bet.profit = -currentUnit;
                currentProgression.bets = [...currentProgression.bets, bet];
                progressionSequence++;
                currentUnit = currentUnit * this.multiplier;
              }
            }
          }
          if (counterFullTimeX < this.matchWithoutX) {
            if (element.fullTimeScore === 'X') {
              console.log(`X at match ${counterFullTimeX}, reset`);
              counterFullTimeX = 0;
            } else {
              counterFullTimeX++;
              console.log(
                `Not betted, consecutive matches without X ${counterFullTimeX}`
              );
            }
          }
        });
        console.log(`Total Profit for a season ${this.totalProfit}`);
      },
      error: (error) => {
        console.error('HTTP Error:', error);
      },
      complete: () => {
        console.log('Request complete.');
      },
    });
  }

  async addBets() {
    this.store.dispatch(ProfileActions.addLoader());
    let bets: any[] = [];
    const strategyId = this.selectedStrategy;
    this.progressions.forEach(elem => {
      const array = elem.bets.map(b => ({...b, strategy_id: parseInt(strategyId)}));
      bets = [...bets, ...array];
    });
    await this.supabase.insertBetsBT(bets);
    this.supabase.selectStrategyBTByID(parseInt(this.selectedStrategy)).subscribe(data => {
      this.progressions = [];
      this.totalProfit = 0;
      this.obStrategyBT.next(data);
      this.store.dispatch(ProfileActions.removeLoader());
    });
  }

  updateStrategyBTName() {
    this.supabase.updateStrategyBTName(this.strategyName, parseInt(this.selectedStrategy));
  }

}
