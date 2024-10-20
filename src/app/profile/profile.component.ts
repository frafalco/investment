import { Component } from '@angular/core';
import { Profile, UserInfo } from '../bean/beans';
import { SupabaseService } from '../services/supabase.service';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

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
  username: string = '';
  profile: Profile | null = null;
  profileForm: FormGroup = new FormGroup({
    username: new FormControl(),
  });
  updatingProfile = false;
  errorMessage: string | null = null;

  constructor(private supabase: SupabaseService) {
    supabase.userInfo$.subscribe((userInfo: UserInfo) => {
      this.profile = userInfo.profile;
      this.username = userInfo.profile ? userInfo.profile.username ?? userInfo.profile.email : 'Anonymus';
      this.profileForm.setValue({username: userInfo.profile?.username})
    })
  }

  async onSubmitUpdateProfile(): Promise<void> {
    this.updatingProfile = true;
    const username: string = this.profileForm.value.username as string;
    const { error } = await this.supabase.updateProfile(this.profile!.id, username);
    if (error) {
      this.errorMessage = "Update profile error";
      console.error('Errore:', error);
    } else {
      this.errorMessage = null;
    }
    this.updatingProfile = false;
  }
}
