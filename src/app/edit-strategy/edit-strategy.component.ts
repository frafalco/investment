import { Component, TemplateRef } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { Strategy } from '../models/strategy.model';
import { Store } from '@ngrx/store';
import { AppState } from '../store/app.state';
import * as ProfileActions from '../store/profile.actions';
import { selectStrategyAndNamesFromId } from '../store/profile.selector';
import { CommonModule } from '@angular/common';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { MultiSelectComponent } from '../multi-select/multi-select.component';
import { SelectedStrategy } from '../models/selected-strategy.model';

@Component({
  selector: 'app-edit-strategy',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MultiSelectComponent ],
  templateUrl: './edit-strategy.component.html',
  styleUrl: './edit-strategy.component.css'
})
export class EditStrategyComponent {
  showForm: boolean = true;
  strategyId: string | null = null;
  strategy?: Strategy | undefined;
  addStrategyForm = new FormGroup({
    id: new FormControl<number | null>(null),
    name: new FormControl<string>('', Validators.required),
    starting_bankroll: new FormControl<number>(0, Validators.required),
    str_type: new FormControl<string>('', Validators.required),
    archived: new FormControl<boolean>(false)
  });
  totalStrategyForm = new FormGroup({
    strategies_selected: new FormControl<SelectedStrategy[]>([]),
  });
  isTotalStrategy: boolean = false;
  optionsList: SelectedStrategy[] = [];

  constructor(private route: ActivatedRoute, private store: Store<AppState>, private router: Router, private modalService: NgbModal) {
    this.strategyId = this.route.snapshot.paramMap.get('id');
    if(this.strategyId && this.strategyId !== 'new') {
      const storeElement$ = this.store.select(selectStrategyAndNamesFromId(+this.strategyId));
      storeElement$.subscribe((elem) => {
        const { strategy, totalStrategies, selectedStrategies } = elem;
        this.strategy = strategy;
        if(strategy) {
          if(strategy.name === 'Total') {
            this.isTotalStrategy = true;
            const listArray: SelectedStrategy[] = [];
            for(const str of totalStrategies) {
              if(str.name !== 'Total') {
                listArray.push(str);
              }
            }
            this.optionsList = listArray;
            this.totalStrategyForm.patchValue({
              strategies_selected: selectedStrategies ?? []
            });
          } else {
            this.addStrategyForm.patchValue({
              id: strategy.id,
              name: strategy.name,
              starting_bankroll: strategy.starting_bankroll,
              str_type: strategy.type,
              archived: strategy.archived
            });
            this.isTotalStrategy = false;
          }
          this.showForm = true;
        } else {
          this.isTotalStrategy = false;
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

  updateSelectedStrategies() {
    if(this.totalStrategyForm.valid) {
      const value = this.totalStrategyForm.getRawValue();
      if(value) {
        this.store.dispatch(ProfileActions.updateSelectedStrategy(value));
        this.router.navigate(['dashboard']);
      }
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

  onItemSelect(item: any) {
    console.log(item);
  }

  onSelectAll(items: any) {
    console.log(items);
  }
}
