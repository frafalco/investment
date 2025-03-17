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
  imports: [CommonModule, FormsModule, NgApexchartsModule, NgbNavModule],
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
  betsTableArray: any[] = [];
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
  ) {
    supabase.selectNewDataMiningAllMatches().subscribe(data => {
      console.log(data);
      const newData = data.map(({home_goals, away_goals, home_goalsht, away_goalsht, result, halftime_result, ...keepAttrs}) => keepAttrs)
      console.log(JSON.stringify(newData));
    });
  }

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
      this.betsArray = [];
      this.betsTableArray = [];
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
          this.ov05htperc,
          this.ov05htodds,
          this.ov25odds,
          this.un35perc,
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

  doKellyLogic(matches: DataMiningMatch[], pIndex: string) {
    const bets: any[] = [];
    let currentBankroll = 100;
    let cumulatedProfit = 0;
    let shortfall = 0;
    let relativeDrawDown = 0;
    let currentDrawDown = 0;
    let cumulatedProfitUnit = 0;
    let packNumber = 0;
    let previousBetTime = 0;
    const odds = 2;
    let indexID = 0;
    let betWon = 0;
    
    const filteredMatches = matches.filter(
      (m: any) => m['score_ht_home'] !== null && m['score_ht_away'] !== null
    );

    const matchesMap = new Map<string, DataMiningMatch[]>();
    filteredMatches.forEach((m) => {
      if(new Date(m.event_date).getTime() - previousBetTime >= 3600000) {
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
      let packProfit = 0;
      matchArray!
        .sort((a, b) => {
          if (a.pareggio < b.pareggio) {
            return 1;
          }
          return -1;
        })
        .forEach((m: any, index, array) => {
          const currentUnit = currentBankroll * this.kelly * 0.01;
          const currentBet = currentUnit * this.unitValue;
          const isDraw = m['score_ht_home'] === m['score_ht_away'];
          const profit = isDraw ? currentBet * odds - currentBet : -currentBet;
          const profitUnit = isDraw
            ? currentUnit * odds - currentUnit
            : -currentUnit;
          cumulatedProfit += profit;
          if (cumulatedProfit < shortfall) {
            shortfall = cumulatedProfit;
          }
          cumulatedProfitUnit += profitUnit;
          packProfit += profitUnit;
          const bet: any = {
            id: indexID++,
            pack: key,
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
            cumulatedProfit: cumulatedProfit,
            cumulatedProfitUnit: cumulatedProfitUnit,
          };
          if (profit < 0) {
            currentDrawDown += profit;
            if (currentDrawDown < relativeDrawDown) {
              relativeDrawDown = currentDrawDown;
            }
          }
          if (isDraw) {
            currentDrawDown = 0;
            betWon++;
          }
          bets.push(bet);
        });
        currentBankroll += packProfit;
    });
    this.totalBets = bets.length;
    this.betWon = betWon;
    this.betsArray.push(bets);
    this.betsTableArray.push({
      name: pIndex,
      bets: bets
    });
    this.betsStatistics.push({
      index: pIndex,
      name: `Progression ${pIndex}`,
      totalBets: this.totalBets,
      betsWon: betWon,
      lostProgressions: '',
      cumulatedProfit: cumulatedProfit,
      maxDrawDown: shortfall,
      relativeDrawDown: relativeDrawDown,
    });
  }

  doDalambertLogic(matches: DataMiningMatch[], pIndex: string) {
    const bets: any[] = [];
    let cumulatedProfit = 0;
    let shortfall = 0;
    let relativeDrawDown = 0;
    let currentDrawDown = 0;
    let cumulatedProfitUnit = 0;
    let packNumber = 0;
    let previousBetTime = 0;
    const odds = 2;
    let indexID = 0;
    let betWon = 0;
    let currentProgressionStep = 1;
    let currentProgressionProfit = 0;
    let currentPackProfit = 0;
    let packMaxBet = 0;
    
    const filteredMatches = matches.filter(
      (m: any) => m['score_ht_home'] !== null && m['score_ht_away'] !== null
    );

    const matchesMap = new Map<string, DataMiningMatch[]>();
    filteredMatches.forEach((m) => {
      if(new Date(m.event_date).getTime() - previousBetTime >= 3600000) {
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
        .sort((a, b) => {
          if (a.pareggio < b.pareggio) {
            return 1;
          }
          return -1;
        })
        .forEach((m: any, index, array) => {
          const currentUnit = Math.pow(this.dalambert, currentProgressionStep - 1);
          const currentBet = currentUnit * this.unitValue;
          packBet += currentBet;
          const isDraw = m['score_ht_home'] === m['score_ht_away'];
          const profit = isDraw ? currentBet * odds - currentBet : -currentBet;
          const profitUnit = isDraw
            ? currentUnit * odds - currentUnit
            : -currentUnit;
          currentPackProfit += profitUnit;
          cumulatedProfit += profit;
          if (cumulatedProfit < shortfall) {
            shortfall = cumulatedProfit;
          }
          cumulatedProfitUnit += profitUnit;
          const bet: any = {
            id: indexID++,
            pack: `${key}-Level ${currentProgressionStep}`,
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
            cumulatedProfit: cumulatedProfit,
            cumulatedProfitUnit: cumulatedProfitUnit,
          };
          if (profit < 0) {
            currentDrawDown += profit;
            if (currentDrawDown < relativeDrawDown) {
              relativeDrawDown = currentDrawDown;
            }
          }
          if (isDraw) {
            currentDrawDown = 0;
            betWon++;
          }
          bets.push(bet);
        });
        currentProgressionProfit += currentPackProfit;
        if (currentPackProfit > 0) {
          if(currentProgressionProfit >= 5) {
            currentProgressionProfit = 0;
            currentProgressionStep = 1;
          } else {
            if(currentProgressionStep - 1 === 0) {
              currentProgressionProfit = 0;
            }
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
    this.totalBets = bets.length;
    this.betWon = betWon;
    this.betsArray.push(bets);
    this.betsTableArray.push({
      name: pIndex,
      bets: bets
    });
    this.betsStatistics.push({
      index: pIndex,
      name: `Progression ${pIndex}`,
      totalBets: this.totalBets,
      betsWon: betWon,
      lostProgressions: '',
      cumulatedProfit: cumulatedProfit,
      maxDrawDown: shortfall,
      relativeDrawDown: relativeDrawDown,
    });
  }

  doBTLogic(matches: DataMiningMatch[], pIndex: string) {
    // const bets: any[] = [];
    // let cumulatedProfit = 0;
    // let maxDrawDown = 0;
    // let relativeDrawDown = 0;
    // const BreakException = {};
    // let indexID = 0;
    // let currentUnit;
    // let cumulatedProfitUnit = 0;
    // let betWon = 0;
    // let lostProgressions = 0;
    // let currentDrawDown = 0;
    // let odds = 2;
    // const filteredMatches = matches.filter(
    //   (m: any) => m['score_ht_home'] !== null && m['score_ht_away'] !== null
    // );
    // const matchesMap = new Map<string, DataMiningMatch[]>();
    // filteredMatches.forEach((m) => {
    //   let array = matchesMap.get(m.event_date);
    //   if (array) {
    //     array.push(m);
    //     matchesMap.set(m.event_date, array);
    //   } else {
    //     matchesMap.set(m.event_date, [m]);
    //   }
    // });
    // const keys = Array.from(matchesMap.keys());
    // keys.forEach((key) => {
    //   const matchArray = matchesMap.get(key);
    //   matchArray!
    //     .sort((a, b) => {
    //       if (a.pareggio < b.pareggio) {
    //         return 1;
    //       }
    //       return -1;
    //     })
    //     .forEach((m: any, index, array) => {
    //       currentUnit = 1;
    //       const currentBet = currentUnit * this.unitValue;
    //       const isDraw = m['score_ht_home'] === m['score_ht_away'];
    //       const profit = isDraw ? currentBet * odds - currentBet : -currentBet;
    //       const profitUnit = isDraw
    //         ? currentUnit * odds - currentUnit
    //         : -currentUnit;
    //       cumulatedProfit += profit;
    //       if (cumulatedProfit < maxDrawDown) {
    //         maxDrawDown = cumulatedProfit;
    //       }
    //       cumulatedProfitUnit += profitUnit;
    //       const bet: any = {
    //         id: indexID++,
    //         date: m.event_date,
    //         real_date: m.real_date,
    //         bookmaker: 'pippo',
    //         odds: odds,
    //         unit: currentUnit,
    //         bet: currentBet,
    //         result: isDraw ? 'won' : 'lost',
    //         strategy_id: 999,
    //         event: `${m.homeTeam}-${m.awayTeam}`,
    //         matchResult: `${m['score_ht_home']}-${m['score_ht_away']}`,
    //         profitUnit: profitUnit,
    //         profit: profit,
    //         cumulatedProfit: cumulatedProfit,
    //         cumulatedProfitUnit: cumulatedProfitUnit,
    //       };
    //       if (profit < 0) {
    //         currentDrawDown += profit;
    //         if (currentDrawDown < relativeDrawDown) {
    //           relativeDrawDown = currentDrawDown;
    //         }
    //       }
    //       if (isDraw) {
    //         currentDrawDown = 0;
    //         betWon++;
    //       }
    //       bets.push(bet);
    //     });
    // });
    // this.totalBets = bets.length;
    // this.betWon = betWon;
    // this.betsArray.push(bets);
    // this.betsStatistics.push({
    //   index: pIndex,
    //   name: `Progression ${pIndex}`,
    //   totalBets: this.totalBets,
    //   betsWon: betWon,
    //   lostProgressions: lostProgressions,
    //   cumulatedProfit: cumulatedProfit,
    //   maxDrawDown: maxDrawDown,
    //   relativeDrawDown: relativeDrawDown,
    // });
    this.doKellyLogic(matches, `Kelly ${pIndex}`);
    // this.doDalambertLogic(matches, `Dalambert ${pIndex}`);
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
