import { Component, Input } from '@angular/core';
import { NgbCollapseModule, NgbDropdownModule, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { CommonModule } from '@angular/common';
import { UserInfo } from '../bean/beans';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [NgbDropdownModule, RouterLink, CommonModule, NgbNavModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  username: string = '';

  constructor(private supabase: SupabaseService, private router: Router) {
    supabase.userInfo$.subscribe((userInfo: UserInfo) => this.username = userInfo.profile?.username ?? 'Anonymus')
  }

  signOut() {
    this.supabase.signOut();
  }
}
