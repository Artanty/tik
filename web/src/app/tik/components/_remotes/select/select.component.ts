import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

import { catchError, map, merge, Observable, of, Subject, switchMap, tap, withLatestFrom } from 'rxjs';

import { FormsModule } from '@angular/forms';

export interface SelectOption {
  id: string | number;
  name: string;
  disabled?: boolean;
  [key: string]: any;
}

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './select.component.html',
  styleUrl: './select.component.scss'
})
export class SelectComponent implements OnInit {

  @Input() label: string = '';
  @Input() name: string = 'select';
  @Input() inputId: string = 'select';
  private _options: SelectOption[] = [];
  @Input() set options(data: SelectOption[]) {
    this._options = data
    this.resolvedOptions = data
  };
  @Input() options$?: Observable<SelectOption[]>;
  @Input() set value(externalValue: string | number | null) {
    // console.log('vselect value changed: ' + externalValue)
    // console.log(externalValue)
    this.selectedValue = externalValue || null
  };
  @Input() disabled: boolean = false;
  @Input() showEmptyOption: boolean = false;
  @Input() emptyOptionText: string = '-- Select --';
  @Input() emptyOptionDisabled: boolean = false;
  @Input() compareWith: (a: any, b: any) => boolean = (a, b) => a === b;

  @Output() valueChange = new EventEmitter<string | number | null>();

  selectedValue: string | number | null = null;
  resolvedOptions: SelectOption[] = [];
  loading: boolean = false;
  error: boolean = false;

  ngOnInit() {
    this.loadOptions();
  }

  private loadOptions() {
    if (this.options$) {
      this.loading = true;
      this.error = false;

      this.options$.pipe(
        catchError(() => {
          this.error = true;
          this.loading = false;
          return of([]);
        })
      ).subscribe(options => {
        this.resolvedOptions = options;
        this.loading = false;
      });
    } else {
      this.resolvedOptions = this._options;
    }
  }

  onValueChange(value: string | number | null) {
    this.valueChange.emit(value);
  }
}
