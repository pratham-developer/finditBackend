// nsfwDetection/nsfwProcess.js
import { fork } from 'child_process';
import path from 'path';

const nsfwServicePath = path.resolve('nsfwDetection/nsfwService.cjs');
const nsfwProcess = fork(nsfwServicePath, [], { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] });

let ready = false;
const pending = new Map();

nsfwProcess.on('message', (msg) => {
  if (msg.type === 'ready') ready = true;
  if (msg.type === 'result' && pending.has(msg.id)) {
    // Log predictions from the child process
    if (msg.predictions) {
      console.log('NSFW Predictions:', msg.predictions);
    }
    pending.get(msg.id)(msg.safe);
    pending.delete(msg.id);
  }
  if (msg.type === 'error' && pending.has(msg.id)) {
    pending.get(msg.id)(false, msg.error);
    pending.delete(msg.id);
  }
});

export function isNsfwReady() {
  return ready;
}

export function checkNsfw(imagePath) {
  return new Promise((resolve, reject) => {
    if (!ready) return reject(new Error('NSFW service not ready'));
    const id = Date.now() + Math.random();
    nsfwProcess.send({ type: 'check', imagePath, id });
    pending.set(id, (safe, error) => {
      if (error) return reject(new Error(error));
      resolve(safe);
    });
  });
}