import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

export class ObservableVariable<T> {
  private subject: BehaviorSubject<T>;
  private validator?: (value: T) => boolean;
  
  constructor(
    initialValue: T, 
    options?: {
      validator?: (value: T) => boolean;
      distinct?: boolean;
    }
  ) {
    this.subject = new BehaviorSubject<T>(initialValue);
    this.validator = options?.validator;
  }
  
  get value(): T {
    return this.subject.getValue();
  }

  get req(): NonNullable<T> {
    const value = this.subject.getValue();
    
    if (value === null || value === undefined) {
      throw new Error(`Expected non-null value but got ${value}`);
    }
    
    return value as NonNullable<T>;
  }
  
  setValue(newValue: T) {
    if (this.validator && !this.validator(newValue)) {
      throw new Error(`Invalid value: ${newValue}`);
    }
    this.subject.next(newValue);
  }
  
  // Safe set that returns success status
  next(newValue: T): boolean {
    try {
      this.setValue(newValue);
      return true;
    } catch {
      return false;
    }
  }
  
  update(updater: (currentValue: T) => T): boolean {
    try {
      this.setValue(updater(this.value));
      return true;
    } catch {
      return false;
    }
  }
  
  get $(): BehaviorSubject<T> {
    return this.subject;
  }
  
  get listen(): Observable<T> {
    return this.subject.asObservable();
  }
  
  get distinct$(): Observable<T> {
    return this.subject.pipe(distinctUntilChanged());
  }
  //todo add filter . make listen(maps[], filters[])
  map<R>(mapper: (value: T) => R): Observable<R> {
    return this.subject.pipe(map(mapper));
  }
  
  subscribe(callback: (value: T) => void) {
    return this.subject.subscribe(callback);
  }
  
  complete(): void {
    this.subject.complete();
  }
  
  get isCompleted(): boolean {
    return this.subject.isStopped;
  }
  
  // Reset to initial value (if needed, you might want to store initial)
  reset(initialValue?: T): void {
    this.subject.next(initialValue !== undefined ? initialValue : this.value);
  }
}

export function obs$<T>(initialValue: T): ObservableVariable<T> {
  return new ObservableVariable<T>(initialValue);
}