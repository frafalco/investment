import { AsyncPipe, CommonModule, DecimalPipe } from '@angular/common';
import { Component, TemplateRef } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { User } from '@supabase/supabase-js';
import { NgbDatepickerModule, NgbModal, NgbNavModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { Observable } from 'rxjs';
import { DashboardTableService } from '../services/dashboard-table.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Bet, Profile, Strategy, UserInfo } from '../bean/beans';
import { DashboardTableComponent } from "../dashboard-table/dashboard-table.component";

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    NgbNavModule,
    DashboardTableComponent,
    ReactiveFormsModule
],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  providers: [DashboardTableService, DecimalPipe]
})
export class DashboardComponent {
  profile: Profile | null = null;
  username: string = '';
  strategies: Strategy[] = [];
  activeStrategy: string = 'new';
  addStrategyForm = new FormGroup({
    name: new FormControl<string>('', Validators.required),
    starting_bankroll: new FormControl<number>(0, Validators.required),
  });

  constructor(private supabase: SupabaseService, private modalService: NgbModal) {
    supabase.userInfo$.subscribe((userInfo: UserInfo) => {
      this.profile = userInfo.profile;
      this.username = userInfo.profile ? userInfo.profile.username ?? userInfo.profile.email : 'Anonymus';
      this.strategies = userInfo.strategies;
      if(userInfo.strategies.length > 0 && this.activeStrategy === 'new') {
        this.activeStrategy = '' + userInfo.strategies[0].id;
      }
    })
  }

  open(content: TemplateRef<any>) {
		this.modalService.open(content, { ariaLabelledBy: 'modal-basic-title' });
	}

  addStrategy(modal: any) {
    if(this.addStrategyForm.valid) {
      const name = this.addStrategyForm.value.name!;
      const starting_bankroll = this.addStrategyForm.value.starting_bankroll!;
      this.supabase.addStrategy({name, starting_bankroll})
      modal.close();
    }
  }
}
