import { Component } from '@angular/core';
import { NgbCollapseModule } from '@ng-bootstrap/ng-bootstrap';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [NgbCollapseModule, RouterLink, CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  isMenuCollapsed = true;

  constructor(private supabase: SupabaseService){}

  isAuthenticated(): boolean {
    return this.supabase.isAuthenticated();
  }

  signOut() {
    this.isMenuCollapsed = true;
    this.supabase.signOut();
  }
}
