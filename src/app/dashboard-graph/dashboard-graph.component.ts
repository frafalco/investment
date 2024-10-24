import { Component, Input } from '@angular/core';
import { ApexAxisChartSeries, ApexChart, ApexDataLabels, ApexFill, ApexMarkers, ApexTitleSubtitle, ApexTooltip, ApexXAxis, ApexYAxis, NgApexchartsModule } from "ng-apexcharts";
import { Bet } from '../models/bet.model';

@Component({
  selector: 'app-dashboard-graph',
  standalone: true,
  imports: [NgApexchartsModule],
  templateUrl: './dashboard-graph.component.html',
  styleUrl: './dashboard-graph.component.css'
})
export class DashboardGraphComponent {
  @Input({ required: true }) bets!: Bet[];

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
    this.initChartData();
  }

  initChartData(): void {
    let dates = [];
    const filteredBets: Bet[] = this.bets.filter(b => b.result !== 'pending');
    for (let i = 0; i < filteredBets.length; i++) {
      dates.push([i + 1, filteredBets[i].cumulated_profit!]);
    }

    this.series = [
      {
        name: "Profit",
        data: dates
      }
    ];
    this.chart = {
      type: "line",
      stacked: false,
      height: 400,
      toolbar: {
        show: false
      }
    };
    this.dataLabels = {
      enabled: false
    };
    this.markers = {
      size: 0
    };
    // this.title = {
    // };
    // this.fill = {
      
    // };
    this.yaxis = {
      labels: {
        formatter: function(val) {
          return `$${val.toFixed(2)}`;
        }
      },
      title: {
        text: "Profit"
      }
    };
    this.xaxis = {
      labels: {
        show: false
      }
    };
    this.tooltip = {
      shared: false,
      y: {
        formatter: function(val) {
          return `$${val.toFixed(2)}`;
        }
      }
    };
  }
}
