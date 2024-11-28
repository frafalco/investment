import { CommonModule } from '@angular/common';
import { Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { SelectedStrategy } from '../models/selected-strategy.model';

@Component({
  selector: 'app-multi-select',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MultiSelectComponent),
      multi: true
    }
  ],
  templateUrl: './multi-select.component.html',
  styleUrl: './multi-select.component.css'
})
export class MultiSelectComponent implements ControlValueAccessor {
  @Input() options: SelectedStrategy[] = []; // Lista di opzioni da visualizzare
  selectedValues: Set<number> = new Set(); // Valori selezionati

  // Funzioni di callback
  onChange = (value: any) => {};
  onTouched = () => {};

  writeValue(value: SelectedStrategy[]): void {
    this.selectedValues = new Set(value.map(s => s.id) || []);
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  onBadgeClick(option: SelectedStrategy): void {
    if (!this.isSelected(option)) {
      this.selectedValues.add(option.id);
    } else {
      this.selectedValues.delete(option.id);
    }
    const selectedItems = this.options.filter(opt => this.selectedValues.has(opt.id));
    this.onChange(selectedItems);
    this.onTouched();
  }

  isSelected(option: SelectedStrategy): boolean {
    return this.selectedValues.has(option.id);
  }
}
