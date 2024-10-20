import { Component, Input } from '@angular/core';
import { NgbCollapseModule, NgbDropdownModule, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { CommonModule } from '@angular/common';
import { Profile, UserInfo } from '../bean/beans';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [NgbDropdownModule, RouterLink, CommonModule, NgbNavModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  activeItem: string;
  username: string = '';
  profile: Profile | null = null;

  constructor(private supabase: SupabaseService, private router: Router) {
    supabase.userInfo$.subscribe((userInfo: UserInfo) => {
      this.profile = userInfo.profile;
      this.username = userInfo.profile ? userInfo.profile.username ?? userInfo.profile.email : 'Anonymus'
    })
    this.activeItem = window.location.pathname;
  }

  async signOut() {
    await this.supabase.signOut();
    this.router.navigate(['/']);
  }
}
