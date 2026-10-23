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

// A loader resolving is not a frame from the requested room. The entry shell
// observes the host's existing render receipt; it never moves the camera itself.
export function waitForRoomFrame(read, {room, identity, timeout=30000,
  requestFrame=cb=>requestAnimationFrame(cb), cancelFrame=id=>cancelAnimationFrame(id),
  setTimer=setTimeout, clearTimer=clearTimeout}={}) {
  return new Promise((resolve, reject) => {
    let frame, timer, settled=false;
    const finish=(error, value)=>{
      if(settled)return;settled=true;clearTimer(timer);
      if(frame!==undefined)cancelFrame(frame);
      error?reject(error):resolve(value);
    };
    const check=()=>{
      try {
        const receipt=read();
        if(receipt?.roomId===room && (!identity || receipt.identity===identity)){
          if(receipt.assets==='unavailable')return finish(new Error('Required room assets unavailable'));
          if(receipt.assets==='ready' && receipt.serial>0)return finish(null,{...receipt});
        }
        frame=requestFrame(check);
      } catch(error) { finish(error); }
    };
    timer=setTimer(()=>finish(new Error('Room is still loading')),timeout);
    check();
  });
}
