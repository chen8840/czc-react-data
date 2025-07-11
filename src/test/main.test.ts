import { finalize, take, timeout } from 'rxjs';

import { LeafData } from '../lib/leaf-data';
import { BranchData } from '../lib/branch-data';
import { PrimaryType } from '../lib/primary-type';
import { Path } from '../lib/path';
import { ReactData } from '../lib/react-data';

describe('test leaf data', () => {
  test('test init', () => {
    const leaf1 = new LeafData(1);
    expect(leaf1.toPrimary()).toBe(1);
    expect(leaf1.toJSON()).toBe('1');

    const leaf2 = new LeafData({one: 1});
    expect(leaf2.toPrimary()).toEqual({one: 1});
    expect(leaf2.toJSON()).toBe(JSON.stringify({one: 1}));
  });

  test('test update', () => {
    const leaf = new LeafData(1);
    leaf.update(2);
    expect(leaf.toPrimary()).toBe(2);
    leaf.update({a: 'a'});
    expect(leaf.toPrimary()).toEqual({a: 'a'});
  });

  test('test valueChange', async () => {
    const leaf = new LeafData(1);
    const result1 = await new Promise(resolve => leaf.valueChange().pipe(
      take(1)
    ).subscribe(resolve));
    expect(result1).toBe(1);

    setTimeout(() => leaf.update(2));
    let value2: PrimaryType;
    const result2 = await new Promise(resolve => leaf.valueChange().pipe(
      take(2),
      finalize(() => resolve(value2)),
    ).subscribe(v => {
      value2 = v;
    }));

    expect(result2).toBe(2);
  });

  test('test dispose', async () => {
    const leaf = new LeafData({});
    leaf.dispose();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((leaf as any).subject$.isStopped).toBe(true);

    const leaf1 = new LeafData(1);
    setTimeout(() => leaf1.dispose());
    const result = await new Promise(resolve => leaf.valueChange().subscribe({
      complete: () => resolve('done'),
    }));
    expect(result).toBe('done');
  });
});

describe('test branch data', () => {
  test('test init', () => {
    const branch1 = new BranchData({leaf1: {a: 'a'}});
    const leaf1 = branch1.getLeafOrBranch('leaf1');
    expect(leaf1 instanceof LeafData).toBe(true);
    expect(leaf1?.toPrimary()).toEqual({a: 'a'});
    expect(branch1.toPrimary()).toEqual({leaf1: {a: 'a'}});

    const undefinedLeaf = branch1.getLeafOrBranch('leaf2');
    expect(undefinedLeaf).toBe(undefined);

    const branch2 = new BranchData({leaf2: {b: 'b'}, branch1: branch1});
    expect(branch2.getLeafOrBranch('branch1') === branch1).toBe(true);
    expect(branch2.toPrimary({onlySelf: false})).toEqual({leaf2: {b: 'b'}, branch1: {leaf1: {a: 'a'}}});
  });

  test('test add', () => {
    const branch1 = new BranchData({leaf1: {a: 'a'}});
    const leaf2 = branch1.addLeaf('leaf2', {b: 'b'});
    expect(leaf2.toPrimary()).toEqual({b: 'b'});
    expect(branch1.toPrimary()).toEqual({leaf1: {a: 'a'}, leaf2: {b: 'b'}});
    expect(() => branch1.addLeaf('leaf1', {a: 'a'})).toThrow('Key leaf1 already exist, addLeaf failed.');

    const branch2 = new BranchData({});
    const addedBranch = branch2.addBranch('branch1', {leaf1: {a: 'a'}, branch1: branch1});
    expect(addedBranch.toPrimary({onlySelf: false})).toEqual({leaf1: {a: 'a'}, branch1: {leaf1: {a: 'a'}, leaf2: {b: 'b'}}});
    expect(branch2.toPrimary({onlySelf: false})).toEqual({branch1: {leaf1: {a: 'a'}, branch1: {leaf1: {a: 'a'}, leaf2: {b: 'b'}}}});
    expect(() => branch2.addBranch('branch1', {})).toThrow('Key branch1 already exist, addBranch failed.');
  });

  test('test update', () => {
    const branch = new BranchData({
      leaf: {a: 'a'},
      branch: new BranchData({leaf: {b: 'b'}}),
    });

    branch.update('leaf', {b: 'b'});
    expect(branch.toPrimary({onlySelf: false})).toEqual({leaf: {b: 'b'}, branch: {leaf: {b: 'b'}}});
    expect(() => branch.update('leaf1', {b: 'b'})).toThrow('Key leaf1 is not exist, update failed.');
    expect(() => branch.update('branch', {})).toThrow('Key branch is a branch, can\'t update a branch, update failed.');

    const childBranch = branch.getLeafOrBranch('branch');
    childBranch?.update('leaf', {a: 'a'});
    expect(branch.toPrimary({onlySelf: false})).toEqual({leaf: {b: 'b'}, branch: {leaf: {a: 'a'}}});
  });

  test('test valueChange', async () => {
    const leaf = new LeafData({a: 'a'});
    const childBranch = new BranchData({leaf: {b: 'b'}});
    const branch = new BranchData({leaf, branch: childBranch});
    expect(branch.toPrimary({onlySelf: false})).toEqual({leaf: {a: 'a'}, branch: {leaf: {b: 'b'}}});

    /**
     * test leaf update, valueChange don't trigger
     */
    setTimeout(() => branch.update('leaf', {b: 'b'}));
    let value1: PrimaryType;
    let triggerCount = 0;
    const result1 = await new Promise(resolve => branch.valueChange().pipe(
      timeout(100),
    ).subscribe({
      next: v => {
        value1 = v;
        triggerCount++;
      },
      error: () => resolve(value1),
    }));
    expect(result1).toEqual({leaf: {a: 'a'}, branch: {}});
    expect(triggerCount).toBe(1);

    /**
     * test branch update, valueChange don't trigger
     */
    setTimeout(() => childBranch.update('leaf', {a: 'a'}));
    let value2: PrimaryType;
    triggerCount = 0;
    const result2 = await new Promise(resolve => branch.valueChange().pipe(
      timeout(100),
    ).subscribe({
      next: v => {
        value2 = v;
        triggerCount++;
      },
      error: () => resolve(value2),
    }));
    expect(result2).toEqual({leaf: {b: 'b'}, branch: {}});
    expect(triggerCount).toBe(1);

    /**
     * test addLeaf
     */
    setTimeout(() => branch.addLeaf('leaf1', {a: 'a'}));
    let value3: PrimaryType;
    const result3 = await new Promise(resolve => branch.valueChange().pipe(
      take(2),
      finalize(() => resolve(value3)),
    ).subscribe(v => {
      value3 = v;
    }));
    expect(result3).toEqual({leaf: {b: 'b'}, leaf1: {a: 'a'}, branch: {}});


    /**
     * test child addBranch, valueChange don't trigger
     */
    setTimeout(() => childBranch.addBranch('branch', {leaf: 'leaf'}));
    let value4: PrimaryType;
    triggerCount = 0;
    const result4 = await new Promise(resolve => branch.valueChange().pipe(
      timeout(100),
    ).subscribe({
      next: v => {
        value4 = v;
        triggerCount++;
      },
      error: () => resolve(value4),
    }));
    expect(result4).toEqual({leaf: {b: 'b'}, leaf1: {a: 'a'}, branch: {}});
    expect(triggerCount).toBe(1);
  });

  test('test dispose', async () => {
    const leaf = new LeafData({a: 'a'});
    const childBranch = new BranchData({leaf: {b: 'b'}});
    const branch = new BranchData({leaf, branch: childBranch});
    branch.dispose();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((leaf as any).subject$.isStopped).toBe(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((childBranch as any).subject$.isStopped).toBe(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((branch as any).subject$.isStopped).toBe(true);

    const leaf1 = new LeafData({a: 'a'});
    const childBranch1 = new BranchData({leaf: {b: 'b'}});
    const branch1 = new BranchData({leaf1, branch: childBranch1});

    setTimeout(() => branch1.dispose());
    const result1 = await new Promise(resolve => branch1.valueChange().subscribe({
      complete: () => resolve('done'),
    }));
    expect(result1).toBe('done');
    const result2 = await new Promise(resolve => childBranch1.valueChange().subscribe({
      complete: () => resolve('done'),
    }));
    expect(result2).toBe('done');
    const result3 = await new Promise(resolve => leaf1.valueChange().subscribe({
      complete: () => resolve('done'),
    }));
    expect(result3).toBe('done');
  });
});

describe('test path', () => {
  test('test all', async () => {
    const rootPath = new Path([]);
    expect(rootPath.toString()).toBe('');
    expect(rootPath.getParentPath()).toBe(null);
    expect(rootPath.getSubPathString()).toBe(null);
    expect(rootPath.getAllPaths()).toEqual([]);

    const path1 = new Path(['leaf']);
    expect(path1.toString()).toBe('leaf');
    expect(path1.getParentPath()?.toString()).toBe('');
    expect(path1.getSubPathString()).toBe('leaf');
    expect(path1.getAllPaths()).toEqual(['leaf']);

    const path2 = new Path(['branch', 'leaf']);
    expect(path2.toString()).toBe('branch/leaf');
    expect(path2.getParentPath()?.toString()).toBe('branch');
    expect(path2.getSubPathString()).toBe('leaf');
    expect(path2.getAllPaths()).toEqual(['branch', 'leaf']);

    const branchPath = new Path(['branch']);
    const joinPath = branchPath.join(['leaf']);
    expect(joinPath.toString()).toBe('branch/leaf');
    expect(joinPath.getParentPath()?.toString()).toBe('branch');
    expect(joinPath.getSubPathString()).toBe('leaf');
  });
});

describe('test react data', () => {
  test('test add', async () => {
    const data = new ReactData();
    data.addLeaf(new Path(['leaf']), 'leaf');
    expect(data.toPrimary({onlySelf: false})).toEqual({leaf: 'leaf'});
    data.addBranch(new Path(['branch1']), {leafData: {leaf1: 'leaf1'}});
    expect(data.toPrimary({onlySelf: false})).toEqual({leaf: 'leaf', branch1: {leaf1: 'leaf1'}});
    expect(() => data.addLeaf(new Path(['branch1', 'leaf1']), 'leaf')).toThrow('Key leaf1 already exist, addLeaf failed.');

    data.addLeaf(new Path(['branch1', 'leaf2']), 'leaf2');
    expect(data.toPrimary({onlySelf: false})).toEqual({leaf: 'leaf', branch1: {leaf1: 'leaf1', leaf2: 'leaf2'}});

    data.addBranch(new Path(['branch1', 'branch2']), {branchKeys: ['branch3']});
    expect(data.toPrimary({onlySelf: false})).toEqual({leaf: 'leaf', branch1: {leaf1: 'leaf1', leaf2: 'leaf2', branch2: {branch3: {}}}});

    data.addBranch(new Path(['branch4', 'branch5']), {branchKeys: ['branch6'], leafData: {leaf3: 'leaf3'}});
    expect(data.toPrimary({onlySelf: false})).toEqual({
      leaf: 'leaf',
      branch1: {leaf1: 'leaf1', leaf2: 'leaf2', branch2: {branch3: {}}},
      branch4: {branch5: {branch6: {}, leaf3: 'leaf3'}},
    });

    expect(() => data.addLeaf(new Path(['branch1', 'leaf1', 'branch7', 'leaf4']), 'leaf4')).toThrow('Path branch1/leaf1/branch7 contains Leaf, createBranchIfNotExist failed');
  });

  test('test update', async () => {
    const data = new ReactData();
    data.addLeaf(new Path(['leaf']), 'leaf');
    data.addBranch(new Path(['branch']), {leafData: {leaf1: 'leaf1'}, branchKeys: ['branch1']});

    data.update(new Path(['leaf']), 'leaf2');
    expect(data.toPrimary({onlySelf: false})).toEqual({leaf: 'leaf2', branch: {leaf1: 'leaf1', branch1: {}}});
    data.update(new Path(['branch', 'leaf1']), 'leaf11');
    expect(data.toPrimary({onlySelf: false})).toEqual({leaf: 'leaf2', branch: {leaf1: 'leaf11', branch1: {}}});

    expect(() => data.update(new Path(['branch', 'branch1']), '')).toThrow('Key branch1 is a branch, can\'t update a branch, update failed.');

    expect(() => data.update(new Path(['branch', 'branch1', 'branch2', 'leaf2']), 'leaf2')).toThrow('Key leaf2 is not exist, update failed.');

    expect(data.toPrimary({onlySelf: false})).toEqual({leaf: 'leaf2', branch: {leaf1: 'leaf11', branch1: {branch2: {}}}});
  });

  test('test valueChange', async () => {
    const data = new ReactData();
    data.addLeaf(new Path(['leaf']), 'leaf');
    data.addBranch(new Path(['branch']), {leafData: {leaf1: 'leaf1'}, branchKeys: ['branch1']});
    expect(data.toPrimary({onlySelf: false})).toEqual({leaf: 'leaf', branch: {leaf1: 'leaf1', branch1: {}}});

    const leafPath = new Path(['leaf']);
    setTimeout(() => data.update(leafPath, 'leaf0'));
    let value1: PrimaryType;
    const result1 = await new Promise(resolve => data.valueChange(leafPath).pipe(
      take(2),
      finalize(() => resolve(value1)),
    ).subscribe(v => value1 = v));
    expect(result1).toBe('leaf0');

    /**
     * test update
     */
    const leaf1Path = new Path(['branch', 'leaf1']);
    setTimeout(() => data.update(leaf1Path, 'leaf10'));
    let value2: PrimaryType;
    const result2 = await new Promise(resolve => data.valueChange(leaf1Path).pipe(
      take(2),
      finalize(() => resolve(value2)),
    ).subscribe(v => value2 = v));
    expect(result2).toBe('leaf10');

    /**
     * test addLeaf
     */
    const leaf2Path = new Path(['branch', 'leaf2']);
    setTimeout(() => data.addLeaf(leaf2Path, 'leaf2'));
    let value3: PrimaryType;
    const result3 = await new Promise(resolve => data.valueChange(new Path(['branch'])).pipe(
      take(2),
      finalize(() => resolve(value3)),
    ).subscribe(v => value3 = v));
    expect(result3).toEqual({leaf1: 'leaf10', leaf2: 'leaf2', branch1: {}});

    /**
     * test addBranch
     */
    const branch2Path = new Path(['branch', 'branch2']);
    setTimeout(() => data.addBranch(branch2Path, {leafData: {leaf3: 'leaf3'}, branchKeys: ['branch3']}));
    let value4: PrimaryType;
    const result4 = await new Promise(resolve => data.valueChange(new Path(['branch'])).pipe(
      take(2),
      finalize(() => resolve(value4)),
    ).subscribe(v => value4 = v));
    expect(result4).toEqual({leaf1: 'leaf10', leaf2: 'leaf2', branch1: {}, branch2: {}});
  });

  test('test dispose', async () => {
    const data = new ReactData();
    data.addLeaf(new Path(['leaf']), 'leaf');
    data.addBranch(new Path(['branch']), {leafData: {leaf1: 'leaf1'}, branchKeys: ['branch1']});
    expect(data.toPrimary({onlySelf: false})).toEqual({leaf: 'leaf', branch: {leaf1: 'leaf1', branch1: {}}});

    data.dispose();

    let result = await new Promise(resolve => data.valueChange(new Path([])).subscribe({
      complete: () => resolve('done'),
    }));
    expect(result).toBe('done');
    result = await new Promise(resolve => data.valueChange(new Path(['leaf'])).subscribe({
      complete: () => resolve('done1'),
    }));
    expect(result).toBe('done1');
    result = await new Promise(resolve => data.valueChange(new Path(['branch'])).subscribe({
      complete: () => resolve('done2'),
    }));
    expect(result).toBe('done2');
    result = await new Promise(resolve => data.valueChange(new Path(['branch', 'leaf1'])).subscribe({
      complete: () => resolve('done3'),
    }));
    expect(result).toBe('done3');
     result = await new Promise(resolve => data.valueChange(new Path(['branch', 'branch1'])).subscribe({
      complete: () => resolve('done4'),
    }));
    expect(result).toBe('done4');
  });
});
