import { AfterViewInit, Component, forwardRef, Injector, Input, OnInit, ViewChild } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR, NgControl, ReactiveFormsModule } from '@angular/forms';
import { NgbDatepicker, NgbPopover, NgbPopoverConfig, NgbDateStruct, NgbTimeStruct, NgbTimepickerModule, NgbDatepickerModule } from '@ng-bootstrap/ng-bootstrap';
import { noop } from 'rxjs';
import { DateTimeModel } from './date-time.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-datetimepicker',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgbPopover, NgbDatepickerModule, NgbTimepickerModule],
  providers: [
    {
        provide: NG_VALUE_ACCESSOR,
        useExisting: forwardRef(() => DatetimepickerComponent),
        multi: true
    }
  ],
  templateUrl: './datetimepicker.component.html',
  styleUrl: './datetimepicker.component.css'
})
export class DatetimepickerComponent implements ControlValueAccessor, OnInit, AfterViewInit {
  @Input()
  dateString!: string | null;

  @Input()
  inputDatetimeFormat = 'dd/MM/yyyy';
  @Input()
  hourStep = 1;
  @Input()
  minuteStep = 1;
  @Input()
  secondStep = 1;
  @Input()
  seconds = false;

  @Input()
  disabled = false;

  showTimePickerToggle = false;

  datetime: DateTimeModel = new DateTimeModel();
  private firstTimeAssign = true;

  @ViewChild(NgbDatepicker)
  private dp!: NgbDatepicker;

  @ViewChild(NgbPopover)
  private popover!: NgbPopover;

  private onTouched: () => void = noop;
  private onChange: (_: any) => void = noop;

  ngControl!: NgControl;

  constructor(private config: NgbPopoverConfig, private inj: Injector ) {
      config.autoClose = 'outside';
      config.placement = 'auto';
  }

  ngOnInit(): void {
      this.ngControl = this.inj.get(NgControl);
  }

  ngAfterViewInit(): void {
      this.popover.hidden.subscribe($event => {
          this.showTimePickerToggle = false;
      });
  }

  writeValue(newModel: string) {
      if (newModel) {
          this.datetime = Object.assign(this.datetime, DateTimeModel.fromLocalString(newModel));
          this.dateString = newModel;
          this.setDateStringModel();
      } else {
          this.datetime = new DateTimeModel();
      }
  }

  registerOnChange(fn: any): void {
      this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
      this.onTouched = fn;
  }

  toggleDateTimeState($event: MouseEvent) {
      this.showTimePickerToggle = !this.showTimePickerToggle;
      $event.stopPropagation();
  }

  setDisabledState?(isDisabled: boolean): void {
      this.disabled = isDisabled;
  }

  onInputChange($event: any) {
      const value = $event.target.value;
      const dt = DateTimeModel.fromLocalString(value);

      if (dt) {
          this.datetime = dt;
          this.setDateStringModel();
      } else if (value.trim() === '') {
          this.datetime = new DateTimeModel();
          this.dateString = '';
          this.onChange(this.dateString);
      } else {
            this.onChange(value);
      }
  }

  onDateChange($event: NgbDateStruct) {     
      let eventString = '';   
      if ($event.year){
        eventString = `${$event.year}-${$event.month}-${$event.day}`
      }

      const date = DateTimeModel.fromLocalString(eventString);
 
      if (!date) {
          this.dateString = this.dateString;
          return;
      }

      if (!this.datetime) {
          this.datetime = date;
      }

      this.datetime.year = date.year;
      this.datetime.month = date.month;
      this.datetime.day = date.day;

      this.dp.navigateTo({ year: this.datetime.year, month: this.datetime.month });
      this.setDateStringModel();
  }

  onTimeChange(event: NgbTimeStruct) {
      this.datetime.hour = event.hour;
      this.datetime.minute = event.minute;
      this.datetime.second = event.second;

      this.setDateStringModel();
  }

  setDateStringModel() {
      this.dateString = this.datetime.toString();

      this.onChange(this.dateString);
  }

  inputBlur($event: FocusEvent) {
      this.onTouched();
  }
}
