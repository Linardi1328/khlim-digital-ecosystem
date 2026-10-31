import path from "node:path";

export function getWorkerBundleDir(root, pid = process.pid) {
  return path.join(root, "node_modules/.cache/browser-test-mount", String(pid));
}

export function createRetryableAsyncOnce(build) {
  let promise;
  return () => {
    if (!promise) {
      promise = Promise.resolve()
        .then(build)
        .catch((error) => {
          promise = undefined;
          throw error;
        });
    }
    return promise;
  };
}
