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
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { DataMiningNewMatch } from '../models/datamining_new_match';
import { FilterComponent } from '../filter/filter.component';


interface Parlay {
  id: number;
  date: string;
  odds: number;
  result: boolean;
  matches: ParlayMatch[];
  unit: number;
  bet: number;
  profitUnit: number;
  profit: number;
  cumulatedProfit: number;
  cumulatedProfitUnit: number;
}

interface ParlayMatch {
  odds: number;
  result: string;
  match: string;
  date: string;
}

@Component({
  selector: 'app-backtest',
  standalone: true,
  imports: [CommonModule, FormsModule, NgApexchartsModule, NgbNavModule, FilterComponent],
  templateUrl: './backtest-ht.component.html',
  styleUrl: './backtest-ht.component.css',
})
export class BacktestHtComponent {
  active = 0;

  table: string = "new";
  kelly: number = 1.5;
  dalambert: number = 2;
  unitValue: number = 1;
  underPercentage: number | null = null;
  sameMatchNumber: number | null = null;
  xPercentage: number | null = null;
  diff: number | null = null;
  mge: number | null = null;
  ov05htperc: number | null = null;
  ov05htodds: number | null = null;
  ov25odds: number | null = null;
  un35perc: number | null = null;
  un35odds: number | null = null;
  ic: number | null = null;
  igbc: number | null = null;
  igbo: number | null = null;

  totalBets: number = 0;
  betWon: number = 0;
  cumulatedProfit: number = 0;
  maxDrawDown: number = 0;
  relativeDrawDown: number = 0;
  maxLostSequence: number = 0;

  parlays: Parlay[] = [];

  filters: {label: string, key: string}[] = [
    {label: 'Same Match Number', key: 'sameMatchNumber'}
  ];
  filterModel: any = {
    sameMatchNumber: 0,
  };

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

  async runBacktest() {
    try {
      const matches = await this.supabase.selectDataMiningNewMatches(
        this.underPercentage,
        this.sameMatchNumber,
        this.xPercentage,
        this.diff,
        this.mge,
        this.ov05htperc,
        this.ov05htodds,
        this.ov25odds,
        this.un35perc,
        this.un35odds,
        this.ic,
        this.igbc,
        this.igbo
      );
      if (matches.length > 0) {
        this.parlays = [];
        this.doBTLogic(matches);
      }
    } catch (error: any) {
      console.error(error.message);
    }
  }

  chunkWithNoSingleLast(matches: DataMiningNewMatch[], size = 3) {
    const result = [];
    for (let i = 0; i < matches.length; i += size) {
      result.push(matches.slice(i, i + size));
    }
  
    if (result.length > 1 && result[result.length - 1].length === 1) {
      const last = result.pop();
      result[result.length - 1].push(...last!);
    }
  
    return result;
  }

  doBTLogic(matches: DataMiningNewMatch[]) {
    let cumulatedProfit = 0;
    let maxDrawDown = 0;
    let relativeDrawDown = 0;
    const unit = 1;
    const bet = unit * this.unitValue;
    let cumulatedProfitUnit = 0;
    let betWon = 0;
    let currentDrawDown = 0;
    let currentLostSequence = 0;
    const matchesMap = new Map<string, DataMiningNewMatch[]>();
    matches.forEach((m) => {
      let array = matchesMap.get(m.date);
      if (array) {
        array.push(m);
        matchesMap.set(m.date, array);
      } else {
        matchesMap.set(m.date, [m]);
      }
    });
    const keys = Array.from(matchesMap.keys());
    let id = 1;
    keys.forEach((key) => {
      const matchArray = matchesMap.get(key);
      const chunks = this.chunkWithNoSingleLast(matchArray!, 3);
      chunks.forEach((chunk) => {
        let result = true;
        let odds = 1;
        const parlayMatches: ParlayMatch[] = [];
        chunk.forEach((match) => {
          const m: ParlayMatch = {
            odds: match.ov05ht_odds,
            match: match.match,
            result: match.halftime_result,
            date: `${match.date}T${match.hour}`
          }
          odds = odds * match.ov05ht_odds;
          const matchResult = match.home_goalsht + match.away_goalsht > 0;
          result = result && matchResult;
          parlayMatches.push(m);
        });
        const parlay: Parlay = {
          id,
          date: key,
          odds,
          result,
          matches: parlayMatches,
          unit: 1,
          bet: this.unitValue,
          profitUnit: 0,
          profit: 0,
          cumulatedProfit: 0,
          cumulatedProfitUnit: 0
        }
        id++;
        this.parlays.push(parlay);
      });
    })
    this.parlays.forEach((parlay) => {
      const profit = parlay.result ? (bet * parlay.odds) - bet : -bet;
      const profitUnit = parlay.result ? (unit * parlay.odds) - unit : -unit;
      cumulatedProfit += profit;
      if (cumulatedProfit < maxDrawDown) {
        maxDrawDown = cumulatedProfit;
      }
      cumulatedProfitUnit += profitUnit;
      parlay.profit = profit;
      parlay.profitUnit = profitUnit;
      parlay.cumulatedProfit = cumulatedProfit;
      parlay.cumulatedProfitUnit = cumulatedProfitUnit;
      if(parlay.result) {
        betWon++;
        currentLostSequence = 0;
      } else {
        currentLostSequence++;
      }
      if(currentLostSequence > this.maxLostSequence) {
        this.maxLostSequence = currentLostSequence;
      }
      if (profit < 0) {
        currentDrawDown += profit;
        if (currentDrawDown < relativeDrawDown) {
          relativeDrawDown = currentDrawDown;
        }
      }
    })
    this.totalBets = this.parlays.length;
    this.betWon = betWon;
    this.cumulatedProfit = cumulatedProfit;
    this.maxDrawDown = maxDrawDown;
    this.relativeDrawDown = relativeDrawDown;
    this.initChartData();
  }

  initChartData(): void {
    let series: ApexAxisChartSeries | { name: string; data: any[][] }[] = [];
    const datePipe: DatePipe = new DatePipe('en-US');
    const dates = [];
    let cumulated_profit: number = 0;
    const mappedBet = this.parlays.reduce((map: Map<number, number>, elem: Parlay) => {
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
        name: `BT`,
        data: dates,
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
