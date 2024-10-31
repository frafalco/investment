import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
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
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent {
  profile$: Observable<Profile | undefined>;
  profileForm: FormGroup = new FormGroup({
    username: new FormControl(),
  });

  
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
}
