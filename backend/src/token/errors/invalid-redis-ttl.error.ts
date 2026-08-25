export class InvalidRedisTtlError extends Error {
  constructor() {
    super();
    this.name = InvalidRedisTtlError.name;
  }
}
