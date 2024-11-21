import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { Profile } from '../models/profile.model';
import { Store } from '@ngrx/store';
import { AppState } from '../store/app.state';
import { selectProfile } from '../store/profile.selector';
import { Observable } from 'rxjs';
import * as ProfileActions from '../store/profile.actions';
import * as comoJson from '../../../public/assets/json/como-2022.json';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfileComponent {
  profile$: Observable<Profile | undefined>;
  profileForm: FormGroup = new FormGroup({
    username: new FormControl(),
  });

  progressionLength: number = 0;
  multiplier: number = 0;
  averageOdds: number = 0;
  loading: boolean = false;
  betsArray: {
    unit: number;
    totalUnit: number;
    odds: number;
    won: number;
    profit: number;
  }[] = [];

  country: string = '';
  teamName: string = '';
  leagueName: string = '';
  season: string = '';
  totalProfit: number = 0;
  progressions: { name: string; bets: any[]; }[] = [];

  constructor(private store: Store<AppState>, private http: HttpClient) {
    this.profile$ = store.select(selectProfile);
    this.profile$.subscribe((profile) => {
      this.profileForm.setValue({ username: profile?.username });
    });
  }

  async onSubmitUpdateProfile(): Promise<void> {
    const username: string = this.profileForm.value.username as string;
    this.store.dispatch(ProfileActions.updateProfile({ username }));
  }

  generateTable(): void {
    let currentUnit = 1;
    let total = 0;
    this.betsArray = [];
    for (let i = 0; i < this.progressionLength; i++) {
      total += currentUnit;
      const won = currentUnit * this.averageOdds;
      const bet = {
        unit: currentUnit,
        totalUnit: total,
        odds: this.averageOdds,
        won,
        profit: won - total,
      };
      this.betsArray.push(bet);
      currentUnit = currentUnit * this.multiplier;
    }
  }

  runBacktest(): void {
    const urlTeam = `https://v3.football.api-sports.io/teams?name=${this.teamName}&country=${this.country}`;
    const urlLeague = `https://v3.football.api-sports.io/leagues?name=${this.leagueName}&country=${this.country}`;
    const headers = {
      'x-rapidapi-host': 'v3.football.api-sports.io',
      'x-rapidapi-key': '7a0f1f711e37e08ade9337ec81dd0c10',
    };
    this.progressions = [];
    this.http.get(urlTeam, { headers }).subscribe({
      next: (data: any) => {
        if(data.response && data.response.length > 0) {
          const teamId = data.response[0].team.id;
          if (teamId) {
            this.http.get(urlLeague, { headers }).subscribe({
              next: (data: any) => {
                if(data.response && data.response.length > 0) {
                  const leagueId = data.response[0].league.id;
                  if (leagueId) {
                    const urlMatches = `https://v3.football.api-sports.io/fixtures?season=${this.season}&team=${teamId}&league=${leagueId}`;
                    this.http.get(urlMatches, { headers }).subscribe({
                      next: (data: any) => {
                        const mappedArray = data.response.map((elem: any) => {
                          const match = `${elem.teams.home.name}-${elem.teams.away.name}`;
                          const halfTimeScore =
                            elem.score.halftime.home > elem.score.halftime.away
                              ? '1'
                              : elem.score.halftime.home < elem.score.halftime.away
                              ? '2'
                              : 'X';
                          const fullTimeScore =
                            elem.score.fulltime.home > elem.score.fulltime.away
                              ? '1'
                              : elem.score.fulltime.home < elem.score.fulltime.away
                              ? '2'
                              : 'X';
                          const date = elem.fixture.date;
                          return {
                            match,
                            halfTimeScore,
                            fullTimeScore,
                            date,
                          };
                        });
                        let counterFullTimeX = 0;
                        let progressionSequence = 1;
                        let currentUnit = 1;
                        let total = 0;
                        let prorgessionCounter = 1;
                        let currentProgression: {name: string, bets: any[]} | null = null;
                        mappedArray.forEach((element: any) => {
                          if (counterFullTimeX >= 3) {
                            if(!currentProgression) {
                              currentProgression = {
                                name: `Progression ${prorgessionCounter}`,
                                bets: [],
                              };
                              prorgessionCounter++;
                            }
                            total += currentUnit;
                            console.log(
                              `Bet n° ${progressionSequence}, unit betted ${currentUnit}`
                            );
                            const bet = {
                              date: element.date,
                              event: element.match,
                              odds: this.averageOdds,
                              unit: currentUnit,
                              result: '',
                              profit: 0
                            }
                            if (element.fullTimeScore === 'X') {
                              const won = currentUnit * this.averageOdds;
                              const profit = won - total;
                              this.totalProfit += profit;
                              console.log(`Sequence won, profit ${profit}`);
                              counterFullTimeX = 0;
                              progressionSequence = 1;
                              currentUnit = 1;
                              total = 0;
                              bet.result = 'won';
                              bet.profit = won;
                              currentProgression.bets = [...currentProgression.bets, bet];
                              this.progressions.push(currentProgression);
                              currentProgression = null;
                            } else {
                              bet.result = 'lost';
                              bet.profit = -currentUnit;
                              currentProgression.bets = [...currentProgression.bets, bet];
                              progressionSequence++;
                              currentUnit = currentUnit * this.multiplier;
                            }
                          }
                          if (counterFullTimeX < 3) {
                            if (element.fullTimeScore === 'X') {
                              console.log(`X at match ${counterFullTimeX}, reset`);
                              counterFullTimeX = 0;
                            } else {
                              counterFullTimeX++;
                              console.log(
                                `Not betted, consecutive matches without X ${counterFullTimeX}`
                              );
                            }
                          }
                        });
                        console.log(`Total Profit for a season ${this.totalProfit}`);
                      },
                      error: (error) => {
                        console.error('HTTP Error:', error);
                      },
                      complete: () => {
                        console.log('Request complete.');
                      },
                    });
                  }
                }
              },
              error: (error) => {
                console.error('HTTP Error:', error);
              },
              complete: () => {
                console.log('Request complete.');
              },
            });
          }
        }
      },
      error: (error) => {
        console.error('HTTP Error:', error);
      },
      complete: () => {
        console.log('Request complete.');
      },
    });
  }
}
