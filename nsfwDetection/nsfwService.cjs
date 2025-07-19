// nsfwDetection/nsfwService.cjs
const nsfw = require('nsfwjs');
const tf = require('@tensorflow/tfjs-node');
const fs = require('fs');

let model;

async function loadModel() {
  model = await nsfw.load();
  process.send && process.send({ type: 'ready' });
}

loadModel();

process.on('message', async (msg) => {
  if (msg.type === 'check' && model) {
    try {
      const image = fs.readFileSync(msg.imagePath);
      const imageTensor = tf.node.decodeImage(image, 3);
      const predictions = await model.classify(imageTensor);
      imageTensor.dispose();

      // Consider "Neutral" and "Drawing" as safe, others as unsafe
      const unsafe = predictions.some(
        p => (p.className !== 'Neutral' && p.className !== 'Drawing') && p.probability > 0.7
      );
      process.send({ type: 'result', safe: !unsafe, id: msg.id, predictions });
    } catch (err) {
      process.send({ type: 'error', error: err.message, id: msg.id });
    }
  }
});