import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar/sidebar.component';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from './services/supabase.service';
import { Session, User } from '@supabase/supabase-js';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, FormsModule, NgbDropdownModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})


export class AppComponent {
  title = 'app-investment-new';
  username: string = '';

  constructor(private supabse: SupabaseService) {
    supabse.user$.subscribe((user) => this.username = user?.user_metadata['username']);
  }
}
