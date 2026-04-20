import { Component, forwardRef, Input } from '@angular/core';
import { FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-filter',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './filter.component.html',
  styleUrl: './filter.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FilterComponent),
      multi: true
    }
  ]
})
export class FilterComponent {

  @Input() label: string = '';

  value: {type: string, value: number | null} = {
    type: 'gte',
    value: null
  };

  onChange = (value: any) => {};
  onTouched = () => {};

  writeValue(obj: any): void {
    if (obj) {
      this.value = obj;
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setType(event: any) {
    this.value.type = event.target.value;
    this.onChange(this.value);
  }

  // setValue(event: any) {
  //   this.value.value = event.target.value;
  //   console.log(this.value.value);
  //   this.onChange(this.value);
  // }
}
