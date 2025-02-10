import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BacktestOverFtComponent } from './backtest-under.component';

describe('BacktestComponent', () => {
  let component: BacktestOverFtComponent;
  let fixture: ComponentFixture<BacktestOverFtComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BacktestOverFtComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BacktestOverFtComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
