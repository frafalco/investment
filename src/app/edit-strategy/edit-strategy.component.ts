import { Component, TemplateRef } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { Strategy } from '../models/strategy.model';
import { Store } from '@ngrx/store';
import { AppState } from '../store/app.state';
import * as ProfileActions from '../store/profile.actions';
import { selectStrategyFromId } from '../store/profile.selector';
import { CommonModule } from '@angular/common';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-edit-strategy',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './edit-strategy.component.html',
  styleUrl: './edit-strategy.component.css'
})
export class EditStrategyComponent {
  showForm: boolean = true;
  strategyId: string | null = null;
  strategy$?: Observable<Strategy | undefined>;
  addStrategyForm = new FormGroup({
    id: new FormControl<number | null>(null),
    name: new FormControl<string>('', Validators.required),
    starting_bankroll: new FormControl<number>(0, Validators.required),
    str_type: new FormControl<string>('', Validators.required),
  });

  constructor(private route: ActivatedRoute, private store: Store<AppState>, private router: Router, private modalService: NgbModal) {
    this.strategyId = this.route.snapshot.paramMap.get('id');
    if(this.strategyId && this.strategyId !== 'new') {
      this.strategy$ = this.store.select(selectStrategyFromId(+this.strategyId));
      this.strategy$.subscribe((strategy) => {
        if(strategy) {
          this.addStrategyForm.patchValue({
            id: strategy.id,
            name: strategy.name,
            starting_bankroll: strategy.starting_bankroll,
            str_type: strategy.type
          });
          this.showForm = true;
        } else {
          this.showForm = false;
        }
      });
    }
  }

  upsertStrategy() {
    if(this.addStrategyForm.valid) {
      const value = this.addStrategyForm.getRawValue()
      this.store.dispatch(ProfileActions.upsertStrategy(value));
      this.router.navigate(['dashboard']);
    }
  }

  deleteStrategy(modal: NgbModalRef) {
    this.store.dispatch(ProfileActions.deleteStrategy({strategy_id: +this.strategyId!}));
    modal.close();
    this.router.navigate(['dashboard']);
  }

  open(content: TemplateRef<any>) {
		this.modalService.open(content);
	}
}
