import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-input-color',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './input-color.component.html',
  styleUrl: './input-color.component.scss'
})
export class InputColorComponent implements OnInit {
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

  public backgoundColor = 'red'
  

  ngOnInit() {
    //
  }

  onValueChange(value: string | number | null) {
    console.log(value)
    this.valueChange.emit(value);
  }
}