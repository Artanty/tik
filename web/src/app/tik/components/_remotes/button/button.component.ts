import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss'
})
export class ButtonComponent implements OnInit {
  @Input() set label(externalValue: string | number | null) {
    this.name = String(externalValue) || ''
  };
  
  @Input() type: string = 'button'

  @Input() icon: string = '';
  
  @Input() routerLink: string = ''

  public isDisabled: boolean = false
  
  @Input() set disabled(val: boolean) {
    this.isDisabled = val;
  }

  @Output() valueChange = new EventEmitter<string | number | null>();

  name: string = '';

  ngOnInit(): void {
    //
  }

  onClick(event: Event) {
    event.preventDefault()
    this.valueChange.emit(null)
  }
}
