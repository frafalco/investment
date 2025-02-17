import { CommonModule, DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../services/supabase.service';
import { Strategy } from '../models/strategy.model';
import { Bet } from '../models/bet.model';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom, min } from 'rxjs';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexMarkers,
  ApexTitleSubtitle,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
  NgApexchartsModule,
} from 'ng-apexcharts';
import { DataMiningMatch } from '../models/datamining_match';

interface FixturesResponse {
  results: number;
  response: Fixture[];
}
interface Fixture {
  fixture: FixtureElem;
  league: League;
  teams: Teams;
  score: Scores;
}
interface FixtureElem {
  id: number;
  date: string;
  status: Status;
}
interface Status {
  short: string;
}
interface League {
  id: number;
  name: string;
  country: string;
  round: string;
}
interface Teams {
  home: Team;
  away: Team;
}
interface Team {
  id: number;
  name: string;
}
interface Scores {
  halftime: Score;
  fulltime: Score;
}
interface Score {
  home: number | null;
  away: number | null;
}

@Component({
  selector: 'app-backtest',
  standalone: true,
  imports: [CommonModule, FormsModule, NgApexchartsModule],
  templateUrl: './backtest-under.component.html',
  styleUrl: './backtest-under.component.css',
})
export class BacktestUnderComponent {
  table: string = "old";
  under2matches: number = 0;
  oddsUnder25: number = 0;
  oddsUnder25Mixed: number = 0;
  oddsUnder2: number = 0;
  unitValue: number = 0;
  underPercentage: number = 0;
  sameMatch: number = 0;

  cumulatedProfit: number = 0;
  maxDrawDown: number = 0;
  relativeDrawDown: number = 0;
  totalBets: number = 0;
  betWon: number = 0;
  betPushed: number = 0;
  lostProgressions = 0;
  bets: any[] = [];
  betsArray: any[][] = [];
  betsStatistics: any[] = [];
  prorgessionResults = new Map<string, number>();
  progressions: Bet[][] = [];
  totalProgressions: any[] = [];
  matches: DataMiningMatch[] = [];
  mappedBet: Map<number, DataMiningMatch[]> = new Map<
    number,
    DataMiningMatch[]
  >();
  shuffleIndex: number = 0;

  public series!: ApexAxisChartSeries;
  public chart!: ApexChart;
  public dataLabels!: ApexDataLabels;
  public markers!: ApexMarkers;
  public title?: ApexTitleSubtitle;
  public fill?: ApexFill;
  public yaxis!: ApexYAxis;
  public xaxis!: ApexXAxis;
  public tooltip!: ApexTooltip;

  constructor(
    private httpClient: HttpClient,
    private supabase: SupabaseService
  ) {}

  shuffleArray(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
    return array;
  }

  async runBacktest() {
    try {
      this.shuffleIndex = 0;
      this.bets = [];
      this.progressions = [];
      this.totalProgressions = [];
      this.betsArray = [];
      if(this.table === 'old') {
        this.matches = await this.supabase.selectDataMiningMatchesUnder25(
          this.underPercentage,
          this.sameMatch
        );
      } else {
        const newMatches = await this.supabase.selectNewDataMiningMatchesUnder25(
          this.underPercentage / 100,
          this.sameMatch
        );
        this.matches = newMatches.map(m => {
          return {
            id: m.id,
            fixture_id: 0,
            event_date: `${m.date}T${m.hour}`,
            real_date: `${m.date}T${m.hour}`,
            homeTeam: '',
            awayTeam: '',
            tot_number: m.same_match,
            uno: 0,
            pareggio: 0,
            due: 0,
            gol: 0,
            over15: 0,
            over25: m.ov25_perc,
            under35: 0,
            over05pt: 0,
            golospite: 0,
            risultati: null,
            goals_home: m.home_goals,
            goals_away: m.away_goals,
            score_ht_home: null,
            score_ht_away: null,
            canceled: false,
          };
        })
      }
      if (this.matches.length > 0) {
        this.betsStatistics = [];     
        this.doBTLogic(this.matches, 'Under 2.5', 1);
        this.doBTLogic(this.matches, 'Under 2', 2);
        this.doBTLogic(this.matches, 'Mixed', 3);
        this.initChartData();
      }
    } catch (error: any) {
      console.error(error.message);
    }
  }

  shuffleAndAdd() {
    for (let i = 0; i < 10; i++) {
      const shuffledMatches = this.shuffleArray(this.matches);
      this.shuffleIndex++;
      this.doBTLogic(shuffledMatches, 'Mixed ' + this.shuffleIndex, 3);
    }
    this.initChartData();
  }

  //type: 1 under25, 2 under2, 3 mixed
  doBTLogic(matches: DataMiningMatch[], pIndex: string, type: number) {
    this.prorgessionResults = new Map<string, number>();
    this.bets = [];
    this.cumulatedProfit = 0;
    this.maxDrawDown = 0;
    this.relativeDrawDown = 0;
    let under2wons = 0;
    let currentUnit;
    let cumulatedProfitUnit = 0;
    let betWon = 0;
    let lostProgressions = 0;
    let pushBet = 0;
    let currentDrawDown = 0;
    let propertyGoalHome = 'goals_home';
    let propertyGoalAway = 'goals_away';
    const filteredMatches = matches.filter(
      (m: any) => m[propertyGoalHome] !== null && m[propertyGoalAway] !== null
    );

    

    filteredMatches
        .forEach((m: any, index, array) => {
          currentUnit = 1;
          const currentBet = currentUnit * this.unitValue;

          let odds = this.oddsUnder25;
          if(type === 2) {
            odds = this.oddsUnder2;
          } else if(type === 3) {
            if(index % this.under2matches) {
              odds = this.oddsUnder25Mixed;
            } else {
              odds = this.oddsUnder2;
            }
          }
          let maximumGoal = 3;
          if(type === 2 || (type === 3 && !(index % this.under2matches))) {
            maximumGoal = 2;
          }
          const isUnder = parseInt(m[propertyGoalHome]) + parseInt(m[propertyGoalAway]) < maximumGoal;
          let isPush = false;
          if(type === 2 || (type === 3 && !(index % this.under2matches))) {
            isPush = parseInt(m[propertyGoalHome]) + parseInt(m[propertyGoalAway]) === 2;
          }
          const profit = isUnder ? currentBet * odds - currentBet : isPush ? 0 : -currentBet;
          const profitUnit = isUnder
            ? currentUnit * odds - currentUnit
            : isPush ? 0 : -currentUnit;
          this.cumulatedProfit += profit;
          if (this.cumulatedProfit < this.maxDrawDown) {
            this.maxDrawDown = this.cumulatedProfit;
          }
          cumulatedProfitUnit += profitUnit;
          const bet: any = {
            id: index,
            date: index,
            bookmaker: 'pippo',
            odds: odds,
            unit: currentUnit,
            bet: currentBet,
            result: isUnder ? 'won' : isPush ? 'push' : 'lost',
            strategy_id: 999,
            event: `${m.homeTeam}-${m.awayTeam}`,
            matchResult: `${m[propertyGoalHome]}-${m[propertyGoalAway]}`,
            profitUnit: profitUnit,
            profit: profit,
            cumulatedProfit: this.cumulatedProfit,
            cumulatedProfitUnit: cumulatedProfitUnit,
          };
          if (profit < 0) {
            currentDrawDown += profit;
            if (currentDrawDown < this.relativeDrawDown) {
              this.relativeDrawDown = currentDrawDown;
            }
          }
          if (isUnder) {
            currentDrawDown = 0;
            betWon++;
            if(type === 3 && !(index % this.under2matches)) {
              under2wons++;
            }
          } else if(isPush) {
            pushBet++;
          } else  {
            lostProgressions++;
          }
          this.bets.push(bet);
    });
    this.totalBets = this.bets.length;
    this.betWon = betWon;
    this.betPushed = pushBet;
    this.lostProgressions = lostProgressions;
    this.prorgessionResults = new Map(
      [...this.prorgessionResults.entries()].sort()
    );
    this.betsArray.push(this.bets);
    this.betsStatistics.push({
      index: pIndex,
      name: `${pIndex}`,
      totalBets: this.totalBets,
      betsWon: betWon,
      betPushed: pushBet,
      cumulatedProfit: this.cumulatedProfit,
      maxDrawDown: this.maxDrawDown,
      relativeDrawDown: this.relativeDrawDown,
      under2wons: under2wons,
      type: type
    });
  }

  initChartData(): void {
    let series: ApexAxisChartSeries | { name: string; data: any[][] }[] = [];
    // const filteredBets: Bet[] = this.bets.sort((a, b) => {
    //   if(a.date > b.date) {
    //     return 1;
    //   }
    //   if(a.date < b.date) {
    //     return -1;
    //   }
    //   return 0;
    // });
    const datePipe: DatePipe = new DatePipe('en-US');
    this.betsArray.forEach((bets, index) => {
      const dates = [];
      let cumulated_profit: number = 0;
      const mappedBet = bets.reduce((map: Map<number, number>, elem: Bet) => {
        // let formattedDate = datePipe.transform(elem.date!, 'YYYY-MM-dd')
        // const map = acc as Map<number, number>;
        const time = new Date().getTime() + (60 * 60 * 1000 * elem.id!);

        cumulated_profit += elem.profit!;
        map.set(time, cumulated_profit);

        return map;
      }, new Map<number, number>());
      let isFirst: boolean = true;
      for (let key of mappedBet.keys()) {
        if (isFirst) {
          isFirst = false;
          dates.push([key - 86400000, 0]);
        }
        dates.push([key, mappedBet.get(key)!]);
      }
      series.push({
        name: `BT ${index}`,
        data: dates,
      });
    });

    this.series = series;
    this.chart = {
      type: 'line',
      stacked: false,
      height: 600,
      toolbar: {
        show: false,
      },
      zoom: {
        enabled: false,
      },
    };
    this.dataLabels = {
      enabled: false,
      textAnchor: 'end',
      formatter: function (val: number) {
        return `$${val.toFixed(2)}`;
      },
    };
    this.markers = {
      size: 0, // dimensione del punto
      // colors: ["#FFA41B"], // colore del punto
      strokeWidth: 2,
      hover: {
        size: 8,
      },
    };
    // this.fill = {

    // };
    this.yaxis = {
      labels: {
        formatter: function (val) {
          return `$${val.toFixed(2)}`;
        },
      },
      title: {
        text: 'Profit',
      },
    };
    this.xaxis = {
      type: 'datetime',
      // labels: {
      //   show: false,
      // },
    };
    this.tooltip = {
      shared: false,
      y: {
        formatter: function (val) {
          return `$${val.toFixed(2)}`;
        },
      },
    };
  }
}
