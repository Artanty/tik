import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss'
})
export class InputComponent implements OnInit {
  @Input() type: string = 'text';
  @Input() label: string = '';
  @Input() name: string = 'input';
 
  @Input() set id(externalValue: string | number | undefined) {
    this.inputId = externalValue || String(Math.random())
  };
  
  @Input() set value(externalValue: string | number | null) {
    if (this.selectedValue !== externalValue) {
      this.selectedValue = externalValue || null
    }
  };
  
  @Input() set disabled(val: boolean) {
    this.isDisabled = val;
  }
  
  @Output() valueChange = new EventEmitter<string | number | null>();

  selectedValue: string | number | null = null;
  inputId: string | number = String(Math.random())
  
  loading: boolean = false;
  error: boolean = false;

  public isDisabled: boolean = false
  

  ngOnInit() {
    //
  }

  onValueChange(value: string | number | null) {
    this.valueChange.emit(value);
  }
} 