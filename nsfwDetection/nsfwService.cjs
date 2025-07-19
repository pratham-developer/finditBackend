const nsfw = require('nsfwjs');
const tf = require('@tensorflow/tfjs-node');
const fs = require('fs');

let model;

function isUnsafe(predictions) {
  const prob = { Porn: 0, Hentai: 0, Sexy: 0, Neutral: 0, Drawing: 0 };
  predictions.forEach(p => prob[p.className] = p.probability);

  const maxNsfw = Math.max(prob.Porn, prob.Hentai, prob.Sexy);
  const maxSafe = Math.max(prob.Neutral, prob.Drawing);
  const topPrediction = predictions.reduce((a, b) =>
    a.probability > b.probability ? a : b
  );

  if (prob.Porn > 0.35 || prob.Hentai > 0.35) return true;
  if ((0.5 * prob.Porn + 0.3 * prob.Sexy + 0.2 * prob.Hentai) > 0.4) return true;
  if (maxNsfw >= 0.2 && maxSafe > 0 && maxNsfw / maxSafe > 2.5) return true;
  if (['Porn', 'Hentai'].includes(topPrediction.className) && topPrediction.probability > 0.25) return true;
  if (prob.Sexy > 0.6 && prob.Sexy > (prob.Neutral + prob.Drawing)) return true;

  const entropy = -Object.values(prob).reduce((sum, p) => sum + (p * Math.log2(p || 1e-10)), 0);
  if (entropy > 0.8 && maxSafe < 0.4) return true;

  return false;
}

async function loadModel() {
  try {
    model = await nsfw.load();
    process.send && process.send({ type: 'ready' });
  } catch (err) {
    console.error('Model loading failed:', err);
    process.exit(1);
  }
}

loadModel();

process.on('message', async (msg) => {
  if (msg.type === 'check' && model) {
    try {
      const image = fs.readFileSync(msg.imagePath);
      const imageTensor = tf.node.decodeImage(image, 3);
      const predictions = await model.classify(imageTensor);
      imageTensor.dispose();

      const unsafe = isUnsafe(predictions);
      process.send({ type: 'result', safe: !unsafe, id: msg.id, predictions });
    } catch (err) {
      process.send({ type: 'error', error: err.message, id: msg.id });
    }
  }
});

// Handle unexpected crashes
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});
