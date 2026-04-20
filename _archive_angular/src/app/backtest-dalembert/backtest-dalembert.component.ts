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
  selector: 'app-backtest-dalembert',
  standalone: true,
  imports: [CommonModule, FormsModule, NgApexchartsModule],
  templateUrl: './backtest-dalembert.component.html',
  styleUrl: './backtest-dalembert.component.css'
})
export class BacktestDalembertComponent {
  unitsForProgression: number = 0;
  multiplier: number = 0;
  underPercentage: number = 0;
  sameMatchNumber: number = 0;
  unitValue: number = 0;
  xPercentage: number = 0;

  cumulatedProfit: number = 0;
  maxDrawDown: number = 0;
  relativeDrawDown: number = 0;
  totalBets: number = 0;
  betWon: number = 0;
  lostProgressions = 0;
  bets: any[] = [];
  betsArray: any[][] = [];
  betsStatistics: any[] = [];
  prorgessionResults = new Map<string, number>();
  progressions: Bet[][] = [];
  totalProgressions: any[] = [];
  matches: DataMiningMatch[] = [];
  mappedBet: Map<String, DataMiningMatch[]> = new Map<
  String,
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
      this.shuffleIndex = 0;
      this.bets = [];
      this.progressions = [];
      this.totalProgressions = [];
      this.betsArray = [];
      this.matches = await this.supabase.selectDataMiningMatches(
        this.underPercentage,
        this.sameMatchNumber,
        this.xPercentage
      );
      if (this.matches.length > 0) {
        this.betsStatistics = [];
        this.mappedBet = this.matches.reduce(
          (map: Map<String, DataMiningMatch[]>, elem: DataMiningMatch) => {
            const datePipe1: DatePipe = new DatePipe('en-US');
            let formattedDate = datePipe1.transform(elem.event_date!, 'YYYY-MM-dd');
            if(formattedDate != null) {
              const array = map.get(formattedDate) ?? [];
              array.push(elem);
              map.set(formattedDate, array);
            }

            return map;
          },
          new Map<String, DataMiningMatch[]>()
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
                  "yyyy-MM-dd'T'HH:mm:ss"
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
              real_date: m.event_date,
              event_date: datePipe.transform(
                firstDay,
                "yyyy-MM-dd'T'HH:mm:ss"
              )!,
            };
          })
        );
      });
      //"2023-05-02T17:00:00"
      this.shuffleIndex++;
      this.doBTLogic(shuffledMatches, '' + this.shuffleIndex);
    }
  }

  doBTLogic(matches: DataMiningMatch[], pIndex: string) {
    this.prorgessionResults = new Map<string, number>();
    this.bets = [];
    this.cumulatedProfit = 0;
    this.maxDrawDown = 0;
    this.relativeDrawDown = 0;
    const BreakException = {};
    let indexID = 0;
    let currentProgressionStep = 1;
    let currentUnit;
    let cumulatedProfitUnit = 0;
    let betWon = 0;
    let lostProgressions = 0;
    let currentDrawDown = 0;
    let propertyGoalHome = 'goals_home';
    let propertyGoalAway = 'goals_away';
    let odds = 3.2;
    let packNumber = 0;
    let previousBetTime = 0;
    let currentProgressionProfit = 0;
    let currentPackProfit = 0;
    let packMaxBet = 0;
    const filteredMatches = matches.filter(
      (m: any) => m[propertyGoalHome] !== null && m[propertyGoalAway] !== null
    );
    const matchesMap = new Map<string, DataMiningMatch[]>();
    filteredMatches.forEach((m) => {
      if(new Date(m.event_date).getTime() - previousBetTime >= 7200000) {
        packNumber++;
      }
      previousBetTime = new Date(m.event_date).getTime();

      let array = matchesMap.get(`Pacchetto ${packNumber}`);
      if (array) {
        array.push(m);
        matchesMap.set(`Pacchetto ${packNumber}`, array);
      } else {
        matchesMap.set(`Pacchetto ${packNumber}`, [m]);
      }
    });
    const keys = Array.from(matchesMap.keys());
    keys.forEach((key) => {
      const matchArray = matchesMap.get(key);
      let packBet = 0;
      matchArray!
        .forEach((m: any, index, array) => {
          currentUnit = Math.pow(this.multiplier, currentProgressionStep - 1);
          const currentBet = currentUnit * this.unitValue;
          packBet += currentBet;
          const isDraw = m[propertyGoalHome] === m[propertyGoalAway];
          const profit = isDraw ? currentBet * odds - currentBet : -currentBet;
          const profitUnit = isDraw
            ? currentUnit * odds - currentUnit
            : -currentUnit;
          currentPackProfit += profitUnit;
          this.cumulatedProfit += profit;
          if (this.cumulatedProfit < this.maxDrawDown) {
            this.maxDrawDown = this.cumulatedProfit;
          }
          cumulatedProfitUnit += profitUnit;
          const bet: any = {
            id: indexID++,
            date: m.event_date,
            pack: key,
            bookmaker: 'pippo',
            odds: odds,
            unit: currentUnit,
            bet: currentBet,
            result: isDraw ? 'won' : 'lost',
            strategy_id: 999,
            event: `${m.homeTeam}-${m.awayTeam} [${currentProgressionStep}]`,
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
          if (isDraw) {
            currentDrawDown = 0;
            betWon++;
          }
          this.bets.push(bet);
        });
        //todo
        currentProgressionProfit += currentPackProfit;
        if (currentPackProfit > 0) {
          if(currentProgressionProfit >= this.unitsForProgression) {
            currentProgressionProfit = 0;
            currentProgressionStep = 1;
          } else {
            currentProgressionStep = (currentProgressionStep - 1) || 1;
          }
        } else {
          currentProgressionStep++;
        }
        currentPackProfit = 0;
        if(packBet > packMaxBet) {
          packMaxBet = packBet;
        }
        packBet = 0;
    });
    this.totalBets = this.bets.length;
    this.betWon = betWon;
    this.lostProgressions = lostProgressions;
    this.prorgessionResults = new Map(
      [...this.prorgessionResults.entries()].sort()
    );
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
      packMaxBet: packMaxBet,
    });
    this.initChartData();
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
