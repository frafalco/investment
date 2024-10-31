import { Component } from '@angular/core';
import { Profile } from '../models/profile.model';
import { Store } from '@ngrx/store';
import { AppState } from '../store/app.state';
import { selectProfile } from '../store/profile.selector';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { DashboardGraphComponent } from '../dashboard-graph/dashboard-graph.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, DashboardGraphComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  profile$: Observable<Profile | undefined>;
  
  constructor(private store: Store<AppState>) {
    this.profile$ = store.select(selectProfile);
  }
}
