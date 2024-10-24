import { Component } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Profile } from '../models/profile.model';
import { Store } from '@ngrx/store';
import { AppState } from '../store/app.state';
import { selectProfile } from '../store/profile.selector';
import { Observable } from 'rxjs';

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
  updatingProfile = false;
  errorMessage: string | null = null;


  // constructor(private supabase: SupabaseService) {
  //   supabase.userInfo$.subscribe((userInfo: UserInfo) => {
  //     this.profile = userInfo.profile;
  //     this.username = userInfo.profile ? userInfo.profile.username ?? userInfo.profile.email : 'Anonymus';
  //     this.profileForm.setValue({username: userInfo.profile?.username})
  //   })

  
  constructor(private store: Store<AppState>) {
    this.profile$ = store.select(selectProfile);
    this.profile$.subscribe((profile) => {
      this.profileForm.setValue({username: profile?.username});
    });
  }

  async onSubmitUpdateProfile(): Promise<void> {
    this.updatingProfile = true;
    const username: string = this.profileForm.value.username as string;
    // const { error } = await this.supabase.updateProfile(this.profile!.id, username);
    // if (error) {
    //   this.errorMessage = "Update profile error";
    //   console.error('Errore:', error);
    // } else {
    //   this.errorMessage = null;
    // }
    this.updatingProfile = false;
  }
}
