// Runtime-only load state. Reuses the host loaders; no storage or renderer authority.
export function createAssetReadiness() {
  const tasks = new Map();
  return {
    run(key, load) {
      if (tasks.has(key)) return tasks.get(key).promise;
      const task = {state: 'loading'};
      tasks.set(key, task);
      task.promise = Promise.resolve().then(load).then(value => {task.state = 'ready'; return value;}, error => {task.state = 'unavailable'; throw error;});
      // Interaction handlers may start work without awaiting it. The task still
      // rejects for callers that await it; failure remains visible in state().
      task.promise.catch(() => {});
      return task.promise;
    },
    state(key) { return tasks.get(key)?.state || 'loading'; },
  };
}
