import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { DatetimepickerComponent } from '../datetimepicker/datetimepicker.component';
import { Store } from '@ngrx/store';
import { AppState } from '../store/app.state';
import { selectStrategiesAddBonus } from '../store/profile.selector';
import { Observable } from 'rxjs';
import { Strategy } from '../models/strategy.model';
import { Bonus } from '../models/bonus.model';
import * as ProfileActions from '../store/profile.actions';
import { Router } from '@angular/router';

@Component({
  selector: 'app-add-bonus',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatetimepickerComponent],
  templateUrl: './add-bonus.component.html',
  styleUrl: './add-bonus.component.css',
})
export class AddBonusComponent {
  strategies$: Observable<Strategy[] | undefined>;
  submitForm: FormGroup = new FormGroup(
    {
      strategy_id: new FormControl('', Validators.required),
      date: new FormControl('', Validators.required),
      amount: new FormControl('', [
        Validators.required,
        Validators.pattern(/^\d+(\.\d{1,2})?$/),
      ]),
    },
    { updateOn: 'change' }
  );

  constructor(private store: Store<AppState>, private router: Router) {
    this.strategies$ = store.select(selectStrategiesAddBonus);
  }

  onSubmit() {
    const result: Bonus = {
      date: this.submitForm.value.date!,
      amount: parseFloat(this.submitForm.value.amount!),
      strategy_id: parseInt(this.submitForm.value.strategy_id!),
    };

    this.store.dispatch(ProfileActions.addBonus({ bonus: result }));

    this.router.navigateByUrl(`/strategy/${this.submitForm.value.strategy_id}`);
  }
}
