import { Component } from '@angular/core';
import { NgbDropdownModule, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Profile } from '../models/profile.model';
import { Store } from '@ngrx/store';
import { AppState } from '../store/app.state';
import { filter, Observable } from 'rxjs';
import { selectUsername } from '../store/profile.selector';
import * as ProfileActions from '../store/profile.actions';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [NgbDropdownModule, RouterLink, CommonModule, NgbNavModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  activeItem: string = '';
  username$: Observable<string | undefined>;

  constructor(private store: Store<AppState>, private router: Router) {
    this.username$ = store.select(selectUsername);
  }

  ngOnInit() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    )
    .subscribe((event: NavigationEnd) => {
      this.activeItem = event.url;
    });
  }

  async signOut() {
    // await this.supabase.signOut();
    this.store.dispatch(ProfileActions.logout());
    this.router.navigate(['/']);
  }
}
