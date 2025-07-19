import { fork } from 'child_process';
import path from 'path';
import os from 'os';

const nsfwServicePath = path.resolve('nsfwDetection/nsfwService.cjs');
const WORKER_COUNT = os.cpus().length; // Use number of CPU cores
const WORKER_TIMEOUT = 5000; // 5 seconds per request

let workers = [];
let readyWorkers = new Set();
let pending = new Map(); // Map: id -> { resolve, reject, timeout, workerIdx }
let rrIndex = 0; // Round-robin index

function spawnWorker(idx) {
  const worker = fork(nsfwServicePath, [], { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] });
  worker.on('message', (msg) => {
    if (msg.type === 'ready') {
      readyWorkers.add(idx);
    }
    if (msg.type === 'result' && pending.has(msg.id)) {
      const { resolve, timeout } = pending.get(msg.id);
      clearTimeout(timeout);
      resolve(msg.safe);
      pending.delete(msg.id);
    }
    if (msg.type === 'error' && pending.has(msg.id)) {
      const { reject, timeout } = pending.get(msg.id);
      clearTimeout(timeout);
      reject(new Error(msg.error));
      pending.delete(msg.id);
    }
  });
  worker.on('exit', () => {
    readyWorkers.delete(idx);
    // Clean up any pending tasks for this worker
    for (const [id, task] of pending.entries()) {
      if (task.workerIdx === idx) {
        clearTimeout(task.timeout);
        task.reject(new Error('NSFW worker crashed'));
        pending.delete(id);
      }
    }
    // Restart worker
    setTimeout(() => {
      workers[idx] = spawnWorker(idx);
    }, 2000);
  });
  worker.on('error', () => {
    readyWorkers.delete(idx);
  });
  return worker;
}

// Initialize worker pool
for (let i = 0; i < WORKER_COUNT; i++) {
  workers.push(spawnWorker(i));
}

export function isNsfwReady() {
  return readyWorkers.size > 0;
}

export function checkNsfw(imagePath) {
  return new Promise((resolve, reject) => {
    if (readyWorkers.size === 0) return reject(new Error('NSFW service not ready'));
    // Pick next ready worker in round-robin
    let tries = 0;
    let workerIdx = rrIndex;
    while (!readyWorkers.has(workerIdx) && tries < WORKER_COUNT) {
      workerIdx = (workerIdx + 1) % WORKER_COUNT;
      tries++;
    }
    if (!readyWorkers.has(workerIdx)) {
      return reject(new Error('No NSFW workers ready'));
    }
    rrIndex = (workerIdx + 1) % WORKER_COUNT;
    const id = Date.now() + Math.random();
    try {
      workers[workerIdx].send({ type: 'check', imagePath, id });
      const timeout = setTimeout(() => {
        pending.delete(id);
        reject(new Error('NSFW check timed out'));
      }, WORKER_TIMEOUT);
      pending.set(id, { resolve, reject, timeout, workerIdx });
    } catch (err) {
      pending.delete(id);
      reject(new Error('Failed to send image to NSFW service'));
    }
  });
}
