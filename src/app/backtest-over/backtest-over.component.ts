import { CommonModule, DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../services/supabase.service';
import { Strategy } from '../models/strategy.model';
import { Bet } from '../models/bet.model';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
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

@Component({
  selector: 'app-backtest-over',
  standalone: true,
  imports: [CommonModule, FormsModule, NgApexchartsModule],
  templateUrl: './backtest-over.component.html',
  styleUrl: './backtest-over.component.css',
})
export class BacktestOverComponent {
  index: number = 0;
  delta: number = 0;
  diff: number = 0;
  mge: number = 0;
  homePercentage: number = 0;
  awayPercentage: number = 0;

  cumulatedProfit: number = 0;
  maxDrawDown: number = 0;
  relativeDrawDown: number = 0;
  totalBets: number = 0;
  betWon: number = 0;
  betsLost = 0;
  noBet = 0;
  bets: any[] = [];

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

  async runBacktest() {
    try {
      this.bets = [];
      const matches = await this.supabase.selectOver05Matches(
        this.index,
        this.delta,
        this.diff,
        this.mge,
        this.homePercentage,
        this.awayPercentage
      );
      if (matches.length > 0) {
        this.cumulatedProfit = 0;
        this.maxDrawDown = 0;
        this.relativeDrawDown = 0;
        this.betWon = 0;
        this.betsLost = 0;
        this.noBet = 0;
        this.totalBets = 0;

        let indexID = 0;
        let betWon = 0;
        let betLosts = 0;
        let noBets = 0;
        let firstOdds = 1.5;
        let secondOdds = 1.8;
        let thirdOdds = 2;
        let currentDrawDown = 0;
        matches.forEach((match) => {
          const rpt = match.rpt;
          let profit = 0;
          if (rpt === '0 - 0') {
            const bettedMatch: any = {
              id: indexID++,
              date: match.date,
              event: match.event,
              bet1: { played: true, unit: 1, odds: firstOdds },
              // bet2: {played: false, unit: 0.5, odds: secondOdds},
              // bet3: {played: false, unit: 0.5, odds: thirdOdds},
              result: 'lost',
              profit: -1,
              rpt: rpt,
              firstGoal: '-',
            };
            this.bets.push(bettedMatch);
            betLosts++;
            this.totalBets++;
            profit = -1;
            currentDrawDown += profit;
            if(currentDrawDown < this.relativeDrawDown) {
              this.relativeDrawDown = currentDrawDown;
            }
          } else {
            const goalsMinute = match.goals_minutes;
            const firstGoal = goalsMinute[0];
            const minute = parseInt(firstGoal.substring(0, 2));
            if (minute < 15) {
              const bettedMatch: any = {
                id: indexID++,
                date: match.date,
                event: match.event,
                bet1: { played: false, unit: 1, odds: firstOdds },
                // bet2: {played: false, unit: 0.5, odds: secondOdds},
                // bet3: {played: false, unit: 0.5, odds: thirdOdds},
                result: 'no-bet',
                profit: 0,
                rpt: rpt,
                firstGoal: '' + minute,
              };
              this.bets.push(bettedMatch);
              noBets++;
              // } else if(minute < 22) {
            } else {
              currentDrawDown = 0;
              const bettedMatch: any = {
                id: indexID++,
                date: match.date,
                event: match.event,
                bet1: { played: true, unit: 1, odds: firstOdds },
                // bet2: {played: false, unit: 0.5, odds: secondOdds},
                // bet3: {played: false, unit: 0.5, odds: thirdOdds},
                result: 'won',
                profit: 1 * firstOdds - 1,
                rpt: rpt,
                firstGoal: '' + minute,
              };
              this.bets.push(bettedMatch);
              betWon++;
              this.totalBets++;
              profit = 1 * firstOdds - 1;
            }
            // } else if(minute < 38) {
            //   const bettedMatch: any = {
            //     id: indexID++,
            //     date: match.date,
            //     event: match.event,
            //     bet1: {played: true, unit: 1, odds: firstOdds},
            //     bet2: {played: true, unit: 0.5, odds: secondOdds},
            //     bet3: {played: false, unit: 0.5, odds: thirdOdds},
            //     result: 'won',
            //     profit: (1*firstOdds - 1) + (0.5*secondOdds - 0.5)
            //   }
            //   this.bets.push(bettedMatch);
            //   betWon1++;
            //   betWon2++;
            //   this.totalBets += 2;
            // } else {
            //   const bettedMatch: any = {
            //     id: indexID++,
            //     date: match.date,
            //     event: match.event,
            //     bet1: {played: true, unit: 1, odds: firstOdds},
            //     bet2: {played: true, unit: 0.5, odds: secondOdds},
            //     bet3: {played: true, unit: 0.5, odds: thirdOdds},
            //     result: 'won',
            //     profit: (1*firstOdds - 1) + (0.5*secondOdds - 0.5) + (0.5*thirdOdds - 0.5)
            //   }
            //   this.bets.push(bettedMatch);
            //   betWon1++;
            //   betWon2++;
            //   betWon3++;
            //   this.totalBets += 3;
            // }
          }
          this.cumulatedProfit += profit;
          if (this.cumulatedProfit < this.maxDrawDown) {
            this.maxDrawDown = this.cumulatedProfit;
          }
        });

        this.betWon = betWon;
        // this.betWon2 = betWon2;
        // this.betWon3 = betWon3;
        this.betsLost = betLosts;
        this.noBet = noBets;
        this.initChartData();
      }
    } catch (error: any) {
      console.error(error.message);
    }
  }

  initChartData(): void {
    let dates = [];
    const filteredBets: Bet[] = this.bets.sort((a, b) => {
      if (a.date > b.date) {
        return 1;
      }
      if (a.date < b.date) {
        return -1;
      }
      return 0;
    });
    const datePipe: DatePipe = new DatePipe('en-US');
    let cumulated_profit: number = 0;
    const mappedBet = filteredBets.reduce(
      (map: Map<number, number>, elem: Bet) => {
        // let formattedDate = datePipe.transform(elem.date!, 'YYYY-MM-dd')
        // const map = acc as Map<number, number>;
        const time = new Date(elem.date!).getTime();

        cumulated_profit += elem.profit!;
        map.set(time, cumulated_profit);

        return map;
      },
      new Map<number, number>()
    );
    let isFirst: boolean = true;
    for (let key of mappedBet.keys()) {
      if (isFirst) {
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
