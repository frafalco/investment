import { Component, Input } from '@angular/core';
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
import { Bet } from '../models/bet.model';
import { Observable } from 'rxjs';
import { Profile } from '../models/profile.model';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-dashboard-graph',
  standalone: true,
  imports: [NgApexchartsModule],
  templateUrl: './dashboard-graph.component.html',
  styleUrl: './dashboard-graph.component.css',
})
export class DashboardGraphComponent {
  @Input({ required: true }) profile$!: Observable<Profile | undefined>;
  @Input({ required: true }) strategy_id!: number;

  bets: Bet[] = [];

  public series!: ApexAxisChartSeries;
  public chart!: ApexChart;
  public dataLabels!: ApexDataLabels;
  public markers!: ApexMarkers;
  public title?: ApexTitleSubtitle;
  public fill?: ApexFill;
  public yaxis!: ApexYAxis;
  public xaxis!: ApexXAxis;
  public tooltip!: ApexTooltip;

  ngOnInit() {
    this.profile$.subscribe((p) => {
      if (p) {
        const strategy = p.strategies.find((s) => s.id === this.strategy_id);
        if (strategy) {
          this.bets = [...strategy.bets].sort((a, b) => {
            if ((a.updated_at === null || a.updated_at === undefined) && (b.updated_at === null || b.updated_at === undefined)) {
              return 0;
            }
            if (a.updated_at === null || a.updated_at === undefined) {
              return 1;
            }
            if (b.updated_at === null || b.updated_at === undefined) {
              return -1;
            }
            return a.updated_at < b.updated_at ? -1 : a.updated_at > b.updated_at ? 1 : 0;
          });;
          this.initChartData();
        }
      }
    });
  }

  initChartData(): void {
    let dates = [];
    const filteredBets: Bet[] = this.bets.filter((b) => b.result !== 'pending');
    const datePipe: DatePipe = new DatePipe('en-US');
    let cumulated_profit: number = 0;
    const mappedBet = filteredBets.reduce((map: Map<number, number>, elem: Bet) => {
      let formattedDate = datePipe.transform(elem.date!, 'YYYY-MM-dd')
      // const map = acc as Map<number, number>;
      const time = new Date(formattedDate!).getTime();
      
      cumulated_profit += elem.profit!;
      map.set(time, cumulated_profit);

      return map;
    }, new Map<number, number>())
    for (let key of mappedBet.keys()) {
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
      height: 400,
      toolbar: {
        show: true,
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
      size: 6, // dimensione del punto
        // colors: ["#FFA41B"], // colore del punto
        strokeWidth: 2,
        hover: {
          size: 8
        }
    };
    // this.title = {
    // };
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
