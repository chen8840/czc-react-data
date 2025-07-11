export class Path {
  private readonly SEPARATOR = '/';

  constructor(
    private paths: string[],
  ) {}

  join(path: string[]) {
    return new Path([...this.paths,...path]);
  }

  toString(): string {
    return this.paths.join(this.SEPARATOR);
  }

  getParentPath(): Path | null {
    if (this.paths.length === 0) {
      return null;
    }
    return new Path(this.paths.slice(0, -1));
  }

  getSubPathString(): string | null {
    if (this.paths.length === 0) {
      return null;
    }
    return this.paths[this.paths.length - 1];
  }

  getAllPaths(): string[] {
    return this.paths;
  }
}