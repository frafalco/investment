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
  templateUrl: './backtest-ht.component.html',
  styleUrl: './backtest-ht.component.css',
})
export class BacktestHtComponent {
  table: string = "new";
  unitValue: number = 1;
  underPercentage: number | null = null;
  sameMatchNumber: number | null = null;
  xPercentage: number | null = null;
  diff: number | null = null;
  mge: number | null = null;
  ov25odds: number | null = null;
  un35odds: number | null = null;
  ic: number | null = null;
  igbc: number | null = null;
  igbo: number | null = null;

  cumulatedProfit: number = 0;
  maxDrawDown: number = 0;
  relativeDrawDown: number = 0;
  totalBets: number = 0;
  betWon: number = 0;
  bets: any[] = [];
  betsArray: any[][] = [];
  betsStatistics: any[] = [];
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
      console.log(this.mge)
      this.shuffleIndex = 0;
      this.bets = [];
      this.betsArray = [];
      if(this.table === 'old') {
        // this.matches = await this.supabase.selectDataMiningMatches(
        //   this.underPercentage,
        //   this.sameMatchNumber,
        //   this.xPercentage
        // );
      } else if(this.table === 'old-updated') {
        // this.matches = await this.supabase.selectDataMiningUpdatedMatches(
        //   this.underPercentage,
        //   this.sameMatchNumber,
        //   this.xPercentage
        // );
      } else {
        const newMatches = await this.supabase.selectNewDataMiningMatches(
          this.underPercentage,
          this.sameMatchNumber,
          this.xPercentage,
          this.diff,
          this.mge,
          this.ov25odds,
          this.un35odds,
          this.ic,
          this.igbc,
          this.igbo
        );
        this.matches = newMatches.map(m => {
          return {
            id: m.id,
            fixture_id: 0,
            event_date: `${m.date}T${m.hour}`,
            real_date: `${m.date}T${m.hour}`,
            homeTeam: m.match.split(' - ')[0],
            awayTeam: m.match.split(' - ')[1],
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
            score_ht_home: m.home_goalsht,
            score_ht_away: m.away_goalsht,
            canceled: false,
          };
        })
      }
      if (this.matches.length > 0) {
        this.betsStatistics = [];
        this.mappedBet = this.matches.reduce(
          (map: Map<number, DataMiningMatch[]>, elem: DataMiningMatch) => {
            const time = new Date(elem.event_date).getTime();
            const array = map.get(time) ?? [];
            array.push(elem);
            map.set(time, array);

            return map;
          },
          new Map<number, DataMiningMatch[]>()
        );
        const keys = Array.from(this.mappedBet.keys());
        const mappedMatches: DataMiningMatch[] = [];
        let firstDay = new Date('2020-01-01');
        const datePipe: DatePipe = new DatePipe('en-US');
        keys.forEach((k) => {
          firstDay = new Date(firstDay.setDate(firstDay.getDate() + 1));
          mappedMatches.push(
            ...this.mappedBet.get(k)!.map((m) => {
              const currentDate = new Date(m.event_date);
              const hours = currentDate.getHours();
              const minutes = currentDate.getMinutes();
              firstDay.setHours(hours);
              firstDay.setMinutes(minutes);
              return {
                ...m,
                real_date: m.event_date,
                event_date: datePipe.transform(
                  firstDay,
                  "yyyy-MM-dd'T'hh:mm:ss"
                )!,
              };
            })
          );
        });
        this.doBTLogic(mappedMatches, 'Original');
      }
    } catch (error: any) {
      console.error(error.message);
    }
  }

  shuffleAndAdd() {
    for (let i = 0; i < 10; i++) {
      const shuffledKeys = this.shuffleArray(Array.from(this.mappedBet.keys()));
      const shuffledMatches: DataMiningMatch[] = [];
      let firstDay = new Date('2020-01-01');
      const datePipe: DatePipe = new DatePipe('en-US');
      shuffledKeys.forEach((k) => {
        firstDay = new Date(firstDay.setDate(firstDay.getDate() + 1));
        shuffledMatches.push(
          ...this.mappedBet.get(k)!.map((m) => {
            const currentDate = new Date(m.event_date);
            const hours = currentDate.getHours();
            const minutes = currentDate.getMinutes();
            firstDay.setHours(hours);
            firstDay.setMinutes(minutes);
            return {
              ...m,
              event_date: datePipe.transform(
                firstDay,
                "yyyy-MM-dd'T'hh:mm:ss"
              )!,
            };
          })
        );
      });
      this.shuffleIndex++;
      this.doBTLogic(shuffledMatches, '' + this.shuffleIndex);
    }
  }

  doBTLogic(matches: DataMiningMatch[], pIndex: string) {
    this.bets = [];
    this.cumulatedProfit = 0;
    this.maxDrawDown = 0;
    this.relativeDrawDown = 0;
    const BreakException = {};
    let indexID = 0;
    let currentUnit;
    let cumulatedProfitUnit = 0;
    let betWon = 0;
    let lostProgressions = 0;
    let currentDrawDown = 0;
    let odds = 2;
    const filteredMatches = matches.filter(
      (m: any) => m['score_ht_home'] !== null && m['score_ht_away'] !== null
    );
    const matchesMap = new Map<string, DataMiningMatch[]>();
    filteredMatches.forEach((m) => {
      let array = matchesMap.get(m.event_date);
      if (array) {
        array.push(m);
        matchesMap.set(m.event_date, array);
      } else {
        matchesMap.set(m.event_date, [m]);
      }
    });
    const keys = Array.from(matchesMap.keys());
    keys.forEach((key) => {
      const matchArray = matchesMap.get(key);
      matchArray!
        .sort((a, b) => {
          if (a.pareggio < b.pareggio) {
            return 1;
          }
          return -1;
        })
        .forEach((m: any, index, array) => {
          currentUnit = 1;
          const currentBet = currentUnit * this.unitValue;
          const isDraw = m['score_ht_home'] === m['score_ht_away'];
          const profit = isDraw ? currentBet * odds - currentBet : -currentBet;
          const profitUnit = isDraw
            ? currentUnit * odds - currentUnit
            : -currentUnit;
          this.cumulatedProfit += profit;
          if (this.cumulatedProfit < this.maxDrawDown) {
            this.maxDrawDown = this.cumulatedProfit;
          }
          cumulatedProfitUnit += profitUnit;
          const bet: any = {
            id: indexID++,
            date: m.event_date,
            real_date: m.real_date,
            bookmaker: 'pippo',
            odds: odds,
            unit: currentUnit,
            bet: currentBet,
            result: isDraw ? 'won' : 'lost',
            strategy_id: 999,
            event: `${m.homeTeam}-${m.awayTeam}`,
            matchResult: `${m['score_ht_home']}-${m['score_ht_away']}`,
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
          if (isDraw) {
            currentDrawDown = 0;
            betWon++;
          }
          this.bets.push(bet);
        });
    });
    this.totalBets = this.bets.length;
    this.betWon = betWon;
    this.betsArray.push(this.bets);
    this.betsStatistics.push({
      index: pIndex,
      name: `Progression ${pIndex}`,
      totalBets: this.totalBets,
      betsWon: betWon,
      lostProgressions: lostProgressions,
      cumulatedProfit: this.cumulatedProfit,
      maxDrawDown: this.maxDrawDown,
      relativeDrawDown: this.relativeDrawDown,
    });
    this.initChartData();
  }

  initChartData(): void {
    let series: ApexAxisChartSeries | { name: string; data: any[][] }[] = [];
    const datePipe: DatePipe = new DatePipe('en-US');
    this.betsArray.forEach((bets, index) => {
      const dates = [];
      let cumulated_profit: number = 0;
      const mappedBet = bets.reduce((map: Map<number, number>, elem: Bet) => {
        const time = new Date(elem.date!).getTime();

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
      size: 0,
      strokeWidth: 2,
      hover: {
        size: 8,
      },
    };
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
