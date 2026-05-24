(function () {
  function createSolverClient({ localRiverCandidates, localTurnRunouts, workerUrl }) {
    const pending = new Map();
    const worker = createWorker(workerUrl, pending);

    function solveRiverCandidates(payload, requestId) {
      if (!worker) return Promise.resolve(localRiverCandidates(payload));
      return post(worker, pending, "solve-river", payload, requestId);
    }

    function solveTurnRunouts(payload, requestId) {
      if (!worker) return Promise.resolve(localTurnRunouts(payload));
      return post(worker, pending, "solve-turn", payload, requestId);
    }

    return {
      solveRiverCandidates,
      solveTurnRunouts,
    };
  }

  function createWorker(workerUrl, pending) {
    if (!("Worker" in window)) return null;

    try {
      const worker = new Worker(workerUrl);
      worker.onmessage = (event) => {
        const { id, type, results, cacheHits, runoutCount, message } = event.data || {};
        const request = pending.get(id);
        if (!request) return;

        pending.delete(id);
        if (type === "river-error") {
          request.reject(new Error(message || "Worker solver failed"));
          return;
        }

        request.resolve({ results, cacheHits, runoutCount });
      };
      worker.onerror = (error) => {
        pending.forEach(({ reject }) => reject(error));
        pending.clear();
      };
      return worker;
    } catch (error) {
      console.warn("River solver worker unavailable; falling back to main thread.", error);
      return null;
    }
  }

  function post(worker, pending, type, payload, id) {
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      worker.postMessage({ id, payload, type });
    });
  }

  window.PokerGtoSolverClient = {
    createSolverClient,
  };
})();
