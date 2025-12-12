import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-product-card',
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss',
  standalone: true,
  imports: [CommonModule]
})
export class ProductCardComponent1 {
  @Output() buttonClick = new EventEmitter<string>();
  
  public onButtonClick() { 
    this.buttonClick.emit('')
  }
}
