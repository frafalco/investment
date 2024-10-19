import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar/sidebar.component';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from './services/supabase.service';
import { Session, User } from '@supabase/supabase-js';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, FormsModule, NgbDropdownModule, MatProgressSpinnerModule,],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})


export class AppComponent {
  title = 'app-investment-new';
  loading: boolean = true;

  constructor(private supabse: SupabaseService) {
    supabse.userInfo$.subscribe((userInfo) => this.loading = userInfo.loading);
  }
}
