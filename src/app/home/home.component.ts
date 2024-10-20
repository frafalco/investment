import { Component } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';
import { Profile, UserInfo } from '../bean/beans';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  profile: Profile | null = null;
  
  constructor(private supabase: SupabaseService) {
    supabase.userInfo$.subscribe((userInfo: UserInfo) => {
      this.profile = userInfo.profile;
    })
  }
}
