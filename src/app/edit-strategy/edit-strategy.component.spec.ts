import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditStrategyComponent } from './edit-strategy.component';

describe('EditBankrollComponent', () => {
  let component: EditStrategyComponent;
  let fixture: ComponentFixture<EditStrategyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditStrategyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditStrategyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
