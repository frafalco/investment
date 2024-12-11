import { CommonModule, DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../services/supabase.service';
import { Strategy } from '../models/strategy.model';
import { Bet } from '../models/bet.model';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { ApexAxisChartSeries, ApexChart, ApexDataLabels, ApexFill, ApexMarkers, ApexTitleSubtitle, ApexTooltip, ApexXAxis, ApexYAxis, NgApexchartsModule } from 'ng-apexcharts';

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
  templateUrl: './backtest.component.html',
  styleUrl: './backtest.component.css'
})
export class BacktestComponent {
  progressionLength: number = 0;
  multiplier: number = 0;
  underPercentage: number = 0;
  sameMatchNumber: number = 0;
  unitValue: number = 0;

  cumulatedProfit: number = 0;
  totalBets: number = 0;
  betWon: number = 0;
  lostProgressions = 0;
  bets: any[] = [];
  prorgessionResults = new Map<string, number>();

  public series!: ApexAxisChartSeries;
  public chart!: ApexChart;
  public dataLabels!: ApexDataLabels;
  public markers!: ApexMarkers;
  public title?: ApexTitleSubtitle;
  public fill?: ApexFill;
  public yaxis!: ApexYAxis;
  public xaxis!: ApexXAxis;
  public tooltip!: ApexTooltip;

  constructor(private httpClient: HttpClient, private supabase: SupabaseService) {}

  // async manipulate() {
  //   try {
  //     const matches = await this.supabase.selectDataMiningMatchesWithoutGoal();
  //     const matchesId = matches.map(m => m.fixture_id);
  //     for(const id of matchesId) {
  //       const fixturesResponse = await lastValueFrom(
  //         this.httpClient.get<FixturesResponse>(
  //           `https://v3.football.api-sports.io/fixtures?id=${id}`,
  //           {
  //             headers: {
  //               'x-rapidapi-key': 'd694a908807e57340a12f89cba9d6eee',
  //               'x-rapidapi-host': 'v3.football.api-sports.io',
  //             },
  //           }
  //         )
  //       );
  //       const fixture = fixturesResponse.response[0];
  //       if(fixture.fixture.status.short === 'FT') {
  //         // const data = {
  //         //   goals_home: fixture.score.fulltime.home,
  //         //   goals_away: fixture.score.fulltime.away,
  //         //   score_ht_home: fixture.score.halftime.home,
  //         //   score_ht_away: fixture.score.halftime.away,
  //         // }
  //         // console.log(data);
  //         // await this.supabase.updateDataMining(id, data);
  //       } else if (fixture.fixture.status.short !== 'NS') {
  //         // const data = {
  //         //   canceled: true,
  //         // }
  //         // await this.supabase.updateDataMining(id, data);
  //       } else {
  //         console.log(fixture.fixture.date);
  //       }
  //     }
  //   }catch (err) {
  //     console.error(err);
  //   }
  // }

  async runBacktest() {
    try {
      const matches = await this.supabase.selectDataMiningMatches(this.underPercentage, this.sameMatchNumber);
      if(matches.length > 0) {
        this.prorgessionResults = new Map<string, number>();
        const strategy: Strategy = {
          id: 999,
          name: 'Backtest',
          type: 'bt',
          starting_bankroll: 0,
          profit: 0,
          user_id: '',
          bets: [],
          total_wagered: 0,
          archived: false
        }
        let index = 0;
        let currentProgressionStep = 1;
        let currentUnit;
        let cumulatedProfitUnit = 0;
        let betWon = 0;
        let lostProgressions = 0;
        this.bets = matches.filter(m => m.goals_home !== null && m.goals_away !== null).map(m => {
          currentUnit = Math.pow(this.multiplier, currentProgressionStep - 1);
          const isDraw = m.goals_home === m.goals_away;
          const profit = isDraw ? currentUnit * 3.25 * this.unitValue: -(currentUnit * this.unitValue);
          const profitUnit = isDraw ? currentUnit * 3.25 : -currentUnit;
          this.cumulatedProfit += profit;
          cumulatedProfitUnit += profitUnit;
          const progressionChar = String.fromCharCode(64 + currentProgressionStep);
          const bet: any = {
            id: index++,
            date: m.event_date,
            bookmaker: 'pippo',
            unit: currentUnit,
            bet: currentUnit * this.unitValue,
            result: isDraw ? 'won' : 'lost',
            strategy_id: 999,
            event: `${m.homeTeam}-${m.awayTeam} [${progressionChar}]`,
            matchResult: `${m.goals_home}-${m.goals_away}`,
            profitUnit: isDraw ? currentUnit * 3.25 : -currentUnit,
            profit: profit,
            cumulatedProfit: this.cumulatedProfit,
            cumulatedProfitUnit: cumulatedProfitUnit
          }
          if(isDraw) {
            const winAt = this.prorgessionResults.get(progressionChar);
            if(winAt) {
              this.prorgessionResults.set(progressionChar, winAt + 1);
            } else {
              this.prorgessionResults.set(progressionChar, 1);
            }
            betWon++;
            currentProgressionStep = 1;
          } else if (currentProgressionStep === this.progressionLength) {
            lostProgressions++;
            currentProgressionStep = 1;
          } else {
            currentProgressionStep++;
          }
          return bet;
        });
        this.totalBets = this.bets.length;
        this.betWon = betWon;
        this.lostProgressions = lostProgressions;
        this.prorgessionResults = new Map([...this.prorgessionResults.entries()].sort());
        this.initChartData();
      }
    } catch (error: any) {
      console.error(error.message);
    }
  }

  initChartData(): void {
    let dates = [];
    const filteredBets: Bet[] = this.bets.sort((a, b) => {
      if(a.date > b.date) {
        return 1;
      }
      if(a.date < b.date) {
        return -1;
      }
      return 0;
    });
    const datePipe: DatePipe = new DatePipe('en-US');
    let cumulated_profit: number = 0;
    const mappedBet = filteredBets.reduce((map: Map<number, number>, elem: Bet) => {
      // let formattedDate = datePipe.transform(elem.date!, 'YYYY-MM-dd')
      // const map = acc as Map<number, number>;
      const time = new Date(elem.date!).getTime();
      
      cumulated_profit += elem.profit!;
      map.set(time, cumulated_profit);

      return map;
    }, new Map<number, number>())
    let isFirst: boolean = true;
    for (let key of mappedBet.keys()) {
      if(isFirst) {
        isFirst = false;
        dates.push([key - 86400000, 0]);
      }
      dates.push([key, mappedBet.get(key)!]);
    }

    this.series = [
      {
        name: 'Profit',
        data: dates,
      },
    ];
    this.chart = {
      type: 'line',
      stacked: false,
      height: 600,
      toolbar: {
        show: false,
      },
      zoom: {
        enabled: false
      }
    };
    this.dataLabels = {
      enabled: false,
      textAnchor: 'end',
      formatter: function (val: number) {
        return `$${val.toFixed(2)}`;
      },
    };
    this.markers = {
      size: 6, // dimensione del punto
        // colors: ["#FFA41B"], // colore del punto
        strokeWidth: 2,
        hover: {
          size: 8
        }
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
      type: "datetime"
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
