import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Profile } from '../models/profile.model';
import { Store } from '@ngrx/store';
import { AppState } from '../store/app.state';
import { selectProfile } from '../store/profile.selector';
import { Observable } from 'rxjs';
import * as ProfileActions from '../store/profile.actions';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
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
  betsArray: {unit: number; totalUnit: number; odds: number; won: number; profit: number}[] = [];

  
  constructor(private store: Store<AppState>) {
    this.profile$ = store.select(selectProfile);
    this.profile$.subscribe((profile) => {
      this.profileForm.setValue({username: profile?.username});
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
    for(let i = 0; i < this.progressionLength; i++) {
      total += currentUnit;
      const won = currentUnit * this.averageOdds;
      const bet = {
        unit: currentUnit, 
        totalUnit: total, 
        odds: this.averageOdds, 
        won,
        profit: won - total
      };
      this.betsArray.push(bet);
      currentUnit = currentUnit * this.multiplier;
    }
  }
}
