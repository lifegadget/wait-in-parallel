export class TimeoutError<T = any> extends Error {
  constructor(attemptedPromise: Promise<T>, duration: number) {
    super();
    this.name = "TimeoutError";
    this.message = `Timed out after ${duration}ms`;
  }
}
