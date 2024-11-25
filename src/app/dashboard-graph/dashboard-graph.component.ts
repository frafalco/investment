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
import { Strategy } from '../models/strategy.model';

@Component({
  selector: 'app-dashboard-graph',
  standalone: true,
  imports: [NgApexchartsModule],
  templateUrl: './dashboard-graph.component.html',
  styleUrl: './dashboard-graph.component.css',
})
export class DashboardGraphComponent {
  @Input({ required: true }) strategy$!: Observable<Strategy | undefined>;
  @Input() height: number = 400;
  @Input() showToolbar: boolean = true;
  @Input() showTitle: boolean = false;

  bets: Bet[] = [];
  strategyName: string = '';

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
    this.strategy$.subscribe((strategy) => {
        if (strategy) {
          this.strategyName = strategy.name;
          this.bets = [...strategy.bets].sort((a, b) => {
            if ((a.date === null || a.date === undefined) && (b.date === null || b.date === undefined)) {
              return 0;
            }
            if (a.date === null || a.date === undefined) {
              return 1;
            }
            if (b.date === null || b.date === undefined) {
              return -1;
            }
            return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
          });
          this.initChartData();
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
      height: this.height,
      toolbar: {
        show: this.showToolbar,
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
    if(this.showTitle) {
      this.title = {
        text: this.strategyName,
        align: 'center',
        style: {
          fontSize: '24px'
        }
      };
    }
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
