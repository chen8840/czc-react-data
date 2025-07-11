import { Observable } from 'rxjs';

import { PrimaryType } from './primary-type';

export interface BaseData {
  toJSON(): string;
  toPrimary(params?: {onlySelf: boolean}): PrimaryType;
  dispose(): void;
  valueChange(): Observable<PrimaryType>;
}
