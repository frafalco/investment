import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BacktestDalembertComponent } from './backtest-dalembert.component';

describe('BacktestDalembertComponent', () => {
  let component: BacktestDalembertComponent;
  let fixture: ComponentFixture<BacktestDalembertComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BacktestDalembertComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BacktestDalembertComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
