import { AfterViewInit, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import { Observable } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-toggle',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './toggle.component.html',
  styleUrl: './toggle.component.scss'
})
export class ToggleComponent implements OnInit, AfterViewInit {
  @Input() label: string = '';
  @Input() name: string = 'toggle';
  @Input() inputId: string = 'toggle';
  @Input() options: string[] = [];
  
  @Input() set value(externalValue: string | number | null) {
    // console.log(Boolean(externalValue))
    this.selectedValue = Boolean(externalValue)
    this.onValueChange(Boolean(externalValue))
  };

  @Input() disabled: boolean = false;

  @Output() valueChange = new EventEmitter<boolean>();

  selectedValue: boolean = false;

  ngOnInit() {
    //
  }

  ngAfterViewInit(): void {
    this.onValueChange(this.selectedValue)
  }

  onValueChange(value: boolean) {
    this.valueChange.emit(value);
  }


}
