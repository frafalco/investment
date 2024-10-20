import { AsyncPipe, CommonModule, DecimalPipe } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { User } from '@supabase/supabase-js';
import { NgbDatepickerModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { Observable } from 'rxjs';
import { DashboardTableService } from '../services/dashboard-table.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Bet, Profile, UserInfo } from '../bean/beans';
import { DashboardTableComponent } from "../dashboard-table/dashboard-table.component";

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    DashboardTableComponent
],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  providers: [DashboardTableService, DecimalPipe]
})
export class DashboardComponent {
  profile: Profile | null = null;
  username: string = '';

  constructor(private supabase: SupabaseService) {
    supabase.userInfo$.subscribe((userInfo: UserInfo) => {
      this.profile = userInfo.profile;
      this.username = userInfo.profile ? userInfo.profile.username ?? userInfo.profile.email : 'Anonymus';
    })
  }
}
