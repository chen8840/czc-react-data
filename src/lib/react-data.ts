import { BranchData } from './branch-data';
import { LeafData } from './leaf-data';
import { Path } from './path';
import { PrimaryObject, PrimaryType } from './primary-type';

export class ReactData {
  private rootData = new BranchData({});

  addLeaf(path: Path, data: PrimaryType) {
    const parentPath = path.getParentPath();
    if (parentPath === null) {
      throw new Error(`Path ${path} has no parent, addLeaf failed`);
    }
    const parentBranch = this.createBranchIfNotExist(parentPath);
    parentBranch.addLeaf(path.getSubPathString()!, data);
  }

  addBranch(path: Path, {leafData = {}, branchKeys = []}: {leafData?: PrimaryObject, branchKeys?: string[]}) {
    const parentPath = path.getParentPath();
    if (parentPath === null) {
      throw new Error(`Path ${path} has no parent, addBranch failed`);
    }
    const parentBranch = this.createBranchIfNotExist(parentPath);
    const subPath = path.getSubPathString()!;
    const data: {[key: string]: PrimaryType | BranchData} = leafData;
    for (const branchKey of branchKeys) {
      data[branchKey] = new BranchData({});
    }
    parentBranch.addBranch(subPath, data);
  }

  update(path: Path, data: PrimaryType) {
    const parentPath = path.getParentPath();
    if (parentPath === null) {
      throw new Error(`Path ${path} has no parent, update failed`);
    }
    const parentBranch = this.createBranchIfNotExist(parentPath);
    const subPath = path.getSubPathString()!;
    parentBranch.update(subPath, data);
  }

  valueChange(path: Path) {
    const leafOrBranch = this.getLeafOrBranch(path);
    return leafOrBranch.valueChange();
  }

  toPrimary({path = new Path([]), onlySelf = true}: {path?: Path, onlySelf?: boolean} = {path: new Path([]), onlySelf: true}) {
    const leafOrBranch = this.getLeafOrBranch(path);
    return leafOrBranch.toPrimary({onlySelf});
  }

  toJSON() {
    return this.rootData.toJSON();
  }

  dispose() {
    this.rootData.dispose();
  }

  private createBranchIfNotExist(path: Path) {
    const paths = path.getAllPaths();
    let branch: BranchData = this.rootData;
    for (let i = 0; i < paths.length; ++i) {
      const key = paths[i];
      const data = branch.getLeafOrBranch(key);
      if (data === undefined) {
        branch = branch.addBranch(key, {});
      } else if (data instanceof BranchData) {
        branch = data;
      } else {
        throw new Error(`Path ${path} contains Leaf, createBranchIfNotExist failed`);
      }
    }
    return branch;
  }

  private getLeafOrBranch(path: Path) {
    const paths = path.getAllPaths();
    let branch: BranchData = this.rootData;
    let leaf: LeafData | undefined = undefined;
    for (let i = 0; i < paths.length; ++i) {
      const key = paths[i];
      const data = branch.getLeafOrBranch(key);
      if (data instanceof BranchData) {
        branch = data;
      } else if (data instanceof LeafData) {
        if (i !== paths.length - 1) {
          throw new Error(`Path ${path} is not a valid path, getLeafOrBranch failed.`);
        }
        leaf = data;
      } else {
        throw new Error(`Path ${path} is not a valid path, getLeafOrBranch failed.`);
      }
    }
    return leaf || branch;
  }
}