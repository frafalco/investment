import { Component } from '@angular/core';
import { NgbCollapseModule, NgbDropdownModule, NgbNavModule, NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
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
  imports: [NgbDropdownModule, RouterLink, CommonModule, NgbNavModule, NgbCollapseModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  activeItem: string = '';
  username$: Observable<string | undefined>;
  isMenuCollapsed: boolean = true;

  constructor(private store: Store<AppState>, private router: Router, private offcanvasService: NgbOffcanvas) {
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

  openSidebar(content: any) {
    this.offcanvasService.open(content, { position: 'start', panelClass: 'bg-dark text-white' });
  }
}
