import { Component, Input } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { AppState } from '../store/app.state';
import * as ProfileActions from '../store/profile.actions';
import { selectLogin } from '../store/profile.selector';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  loading = false;
  errorMessage?: string;

  signInForm = new FormGroup({
    email: new FormControl(),
    password: new FormControl(),
  });

  constructor(private store: Store<AppState>, private router: Router) {}

  onSubmit() {
    this.loading = true;
    const email = this.signInForm.value.email as string;
    const password = this.signInForm.value.password as string;
    this.store.dispatch(ProfileActions.login({ username: email, password }));
    this.store.select(selectLogin).subscribe((state) => {
      if (!state.loading) {
        if (state.error) {
          this.errorMessage = state.error;
          this.signInForm.reset();
          this.loading = false;
        } else {
          this.router.navigate(['/']);
        }
      }
    });
  }
}
