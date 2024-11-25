import { Component, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Profile } from '../models/profile.model';
import { Store } from '@ngrx/store';
import { AppState } from '../store/app.state';
import { selectProfile } from '../store/profile.selector';
import { Observable } from 'rxjs';
import * as ProfileActions from '../store/profile.actions';
import { HttpClient } from '@angular/common/http';
import { SupabaseService } from '../services/supabase.service';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { DashboardGraphComponent } from '../dashboard-graph/dashboard-graph.component';
import { Strategy } from '../models/strategy.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule,],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfileComponent {
  profile$: Observable<Profile | undefined>;
  profileForm: FormGroup = new FormGroup({
    username: new FormControl(),
  });

  constructor(private store: Store<AppState>) {
    this.profile$ = store.select(selectProfile);
    this.profile$.subscribe((profile) => {
      this.profileForm.setValue({ username: profile?.username });
    });
  }

  async onSubmitUpdateProfile(): Promise<void> {
    const username: string = this.profileForm.value.username as string;
    this.store.dispatch(ProfileActions.updateProfile({ username }));
  }

}
