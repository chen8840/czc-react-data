import { BehaviorSubject, map, Observable } from 'rxjs';

import { BaseData } from './base-data';
import { LeafData } from './leaf-data';
import { PrimaryType } from './primary-type';

type BranchDataData = {[key: string]: LeafData | BranchData};

export class BranchData implements BaseData {
  private subject$: BehaviorSubject<BranchDataData>;

  constructor(data: {[key: string]: PrimaryType | BranchData | LeafData}) {
    const obj: {[key: string]: LeafData | BranchData} = {};
    for (const [key, value] of Object.entries(data)) {
      if (value instanceof BranchData) {
        obj[key] = value;
      } else if (value instanceof LeafData) {
        obj[key] = value;
      } else {
        obj[key] = new LeafData(value);
      }
    }

    this.subject$ = new BehaviorSubject(obj);
  }

  getLeafOrBranch(key: string): LeafData | BranchData | undefined {
    const obj = this.getObj();
    return obj[key];
  }

  addLeaf(key: string, data: PrimaryType) {
    const obj = this.getObj();
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      throw new Error(`Key ${key} already exist, addLeaf failed.`);
    }
    obj[key] = new LeafData(data);
    this.subject$.next(obj);
    return obj[key] as LeafData;
  }

  addBranch(key: string, data: {[key: string]: PrimaryType | BranchData | LeafData}) {
    const obj = this.getObj();
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      throw new Error(`Key ${key} already exist, addBranch failed.`);
    }
    obj[key] = new BranchData(data);
    this.subject$.next(obj);
    return obj[key] as BranchData;
  }

  update(key: string, data: PrimaryType) {
    const obj = this.getObj();
    if (Object.prototype.hasOwnProperty.call(obj, key) === false) {
      throw new Error(`Key ${key} is not exist, update failed.`);
    }
    const existValue = obj[key];
    if (existValue instanceof LeafData) {
      existValue.update(data);
    } else {
      throw new Error(`Key ${key} is a branch, can't update a branch, update failed.`);
    }
  }

  valueChange(): Observable<PrimaryType> {
    return this.subject$.pipe(
      map(() => this.toPrimary()),
    );
  }

  toJSON() {
    const obj = this.toPrimary({onlySelf: false});
    return JSON.stringify(obj);
  }

  toPrimary({onlySelf} = {onlySelf: true}): PrimaryType {
    const returnObj: PrimaryType = {};
    const selfObj = this.getObj();
    for (const [key, value] of Object.entries(selfObj)) {
      if (value instanceof LeafData) {
        returnObj[key] = value.toPrimary();
      } else if (value instanceof BranchData) {
        if (onlySelf) {
          returnObj[key] = {};
        } else {
          returnObj[key] = value.toPrimary({onlySelf: false});
        }
      }
    }
    return returnObj;
  }

  dispose() {
    const selfObj = this.getObj();
    for (const value of Object.values(selfObj)) {
      value.dispose();
    }
    this.subject$.complete();
  }

  private getObj() {
    return this.subject$.getValue();
  }
}