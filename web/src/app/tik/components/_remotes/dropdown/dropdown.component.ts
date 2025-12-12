import { Component, Input, Output, EventEmitter, HostListener, Inject, ElementRef } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { ICON__OPTIONS } from '../../../services/constants';

export interface DropdownItem {
  id: string;
  name: string;
  icon?: string;
  link?: string;
}

@Component({
  selector: 'gui-dropdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dropdown.component.html',
  styleUrls: ['./dropdown.component.scss']
})
export class DropdownComponent {
  @Input() items: DropdownItem[] = [
    // { id: '1', name: "Profile", icon: "fa fa-user" },
    // { id: '2', name: "Settings", icon: "fa fa-cog" },
    // { id: '3', name: "Messages", icon: "fa fa-envelope" },
    // { id: '4', name: "Help", icon: "fa fa-question-circle" },
    // { id: '5', name: "Logout", icon: "fa fa-sign-out" }
  ];

  @Input() buttonText: string = ''; // ICON__OPTIONS
  @Input() buttonIcon: string = '';
  
  @Output() itemSelected = new EventEmitter<DropdownItem>();

  isOpen = false;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private elementRef: ElementRef
  ) {}

  toggleDropdown(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    
    // Close all other dropdowns using custom event
    this.closeAllOtherDropdowns();
    
    this.isOpen = !this.isOpen;
  }

  private closeAllOtherDropdowns() {
    // Dispatch a custom event that other dropdowns can listen to
    const closeEvent = new CustomEvent('close-other-dropdowns', {
      detail: { source: this.elementRef.nativeElement },
      bubbles: true
    });
    
    this.document.dispatchEvent(closeEvent);
  }

  @HostListener('document:close-other-dropdowns', ['$event'])
  onCloseOtherDropdowns(event: CustomEvent) {
    // If this dropdown is not the source of the event and is open, close it
    if (event.detail.source !== this.elementRef.nativeElement && this.isOpen) {
      this.isOpen = false;
    }
  }

  onItemClick(item: DropdownItem, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    
    this.itemSelected.emit(item);
    this.isOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('gui-dropdown')) {
      this.isOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    this.isOpen = false;
  }
}