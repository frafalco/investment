import { AsyncPipe, CommonModule, DecimalPipe } from '@angular/common';
import { Component, TemplateRef } from '@angular/core';
import { ActivatedRoute, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
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
import { DashboardTableComponent } from "../dashboard-table/dashboard-table.component";
import { DashboardInfoComponent } from '../dashboard-info/dashboard-info.component';
import { Profile } from '../models/profile.model';
import { Strategy } from '../models/strategy.model';
import { Store } from '@ngrx/store';
import { AppState } from '../store/app.state';
import { selectProfile } from '../store/profile.selector';
import * as ProfileActions from '../store/profile.actions';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    NgbNavModule,
    DashboardTableComponent,
    ReactiveFormsModule,
    DashboardInfoComponent
],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  providers: [DashboardTableService, DecimalPipe]
})
export class DashboardComponent {
  // userInfo: UserInfo | undefined;
  profile$: Observable<Profile | undefined>;
  username: string = '';
  strategies: Strategy[] = [];
  addStrategyForm = new FormGroup({
    name: new FormControl<string>('', Validators.required),
    starting_bankroll: new FormControl<number>(0, Validators.required),
    str_type: new FormControl<string>('', Validators.required),
  });
  active_id: string | null;

  constructor(private store: Store<AppState>, private modalService: NgbModal, route: ActivatedRoute) {
    this.profile$ = store.select(selectProfile);
    this.active_id = route.snapshot.queryParamMap.get('strategy');
  }

  open(content: TemplateRef<any>) {
		this.modalService.open(content, { ariaLabelledBy: 'modal-basic-title' });
	}

  addStrategy(modal: any) {
    if(this.addStrategyForm.valid) {
      const value = this.addStrategyForm.getRawValue()
      this.store.dispatch(ProfileActions.addStrategy(value));
      this.addStrategyForm.reset();
      modal.close();
    }
  }
}
