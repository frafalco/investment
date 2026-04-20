import { CommonModule, DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../services/supabase.service';
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
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { DataMiningNewMatch } from '../models/datamining_new_match';
import { FilterComponent } from '../filter/filter.component';
import { BTResponse, BtUtils, Parlay, ParlayMatch } from '../utils/bt-utils';


@Component({
  selector: 'app-backtest',
  standalone: true,
  imports: [CommonModule, FormsModule, NgApexchartsModule, NgbNavModule, FilterComponent],
  templateUrl: './backtest-ht.component.html',
  styleUrl: './backtest-ht.component.css',
})
export class BacktestHtComponent {
  unitValue: number = 1;
  btType: string = 'xft';

  btResponse: BTResponse = {
    parlays: [],
    totalBets: 0,
    betWon: 0,
    cumulatedProfit: 0,
    maxDrawDown: 0,
    relativeDrawDown: 0,
    maxLostSequence: 0
  };

  filters: {label: string, key: string}[] = [
    {label: 'Same Match Number', key: 'same_match'},
    {label: 'X percentage', key: 'draw_perc'},
    {label: 'Diff', key: 'diff'},
    {label: 'MGE', key: 'mge'},
    {label: 'Indice Chris', key: 'ic'},
    {label: 'Over0.5 HT %', key: 'ov05ht_perc'},
    {label: 'Over0.5 HT odds', key: 'ov05ht_odds'},
    {label: 'Over2.5 Percentage', key: 'ov25_perc'},
    {label: 'Over2.5 odds', key: 'ov25_odds'},
    {label: 'Under3.5 %', key: 'un35_perc'},
    {label: 'Under3.5 odds', key: 'un35_odds'},
    {label: 'IGBC', key: 'igbc'},
    {label: 'IGBO', key: 'igbo'},
  ];
  filterModel: any = {
    same_match: {type: 'gte', value: null},
    draw_perc: {type: 'gte', value: null},
    diff: {type: 'gte', value: null},
    mge: {type: 'gte', value: null},
    ic: {type: 'gte', value: null},
    ov05ht_perc: {type: 'gte', value: null},
    ov05ht_odds: {type: 'gte', value: null},
    ov25Percentage: {type: 'gte', value: null},
    ov25_perc: {type: 'gte', value: null},
    ov25_odds: {type: 'gte', value: null},
    un35_perc: {type: 'gte', value: null},
    un35_odds: {type: 'gte', value: null},
    igbc: {type: 'gte', value: null},
    igbo: {type: 'gte', value: null},
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
        this.filterModel
      );
      if (matches.length > 0) {
        this.doBTLogic(matches);
      }
    } catch (error: any) {
      console.error(error.message);
    }
  }

  doBTLogic(matches: DataMiningNewMatch[]) {
    if(this.btType === 'xft') {
      this.btResponse = BtUtils.xftLogic(matches, this.unitValue);
    } else if(this.btType === 'xht') {
      this.btResponse = BtUtils.xhtLogic(matches, this.unitValue);
    } else if(this.btType === 'ov05') {
      this.btResponse = BtUtils.ov05htLogic(matches, this.unitValue);
    }
    this.initChartData();
  }

  initChartData(): void {
    let series: ApexAxisChartSeries | { name: string; data: any[][] }[] = [];
    const dates = [];
    let cumulated_profit: number = 0;
    const mappedBet = this.btResponse.parlays.reduce((map: Map<number, number>, elem: Parlay) => {
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
