import { BehaviorSubject, Observable } from 'rxjs';

import { BaseData } from './base-data';
import { PrimaryType } from './primary-type';

export class LeafData implements BaseData {
  private subject$: BehaviorSubject<PrimaryType>;

  constructor(data: PrimaryType) {
    this.subject$ = new BehaviorSubject(data);
  }

  update(data: PrimaryType) {
    this.subject$.next(data);
  }

  toJSON(): string {
    return JSON.stringify(this.subject$.getValue());
  }

  toPrimary({onlySelf: _onlySelf} = {onlySelf: true}): PrimaryType {
    return this.subject$.getValue();
  }

  valueChange(): Observable<PrimaryType> {
    return this.subject$;
  }

  dispose(): void {
    this.subject$.complete();
  }
}