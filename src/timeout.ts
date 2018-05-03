export default function timeout<T = any>(promise: Promise<T>, duration: number) {
  const timeout = () =>
    new Promise((resolve, reject) => {
      setTimeout(resolve, duration);
    });
  return new Promise((resolve, reject) => {
    let resolved = false;
    if (duration === 0) {
      resolve(promise);
    } else {
      promise.then(results => {
        resolved = true;
        resolve(results);
      });
      timeout().then(() => {
        if (!resolved) {
          const e = new Error(`Timed out after ${duration}ms`);
          e.name = "TimeoutError";
          reject(e);
        }
      });
    }
  });
}
