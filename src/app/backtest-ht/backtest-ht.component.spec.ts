import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BacktestHtComponent } from './backtest-ht.component';

describe('BacktestHtComponent', () => {
  let component: BacktestHtComponent;
  let fixture: ComponentFixture<BacktestHtComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BacktestHtComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BacktestHtComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
