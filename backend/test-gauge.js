
const fs = require('fs');
const path = require('path');
const { detectGaugeRatio } = require('./src/cv/gaugeDetector.js');

const imageFileName = 'gauge-image.jpg';
const imagePath = path.join(__dirname, imageFileName);

if (!fs.existsSync(imagePath)) {
  console.error(`Image file not found: ${imagePath}`);
  console.error(`Please place an image of an oil tank gauge named '${imageFileName}' in the 'backend' directory.`);
  process.exit(1);
}

const imageData = fs.readFileSync(imagePath, { encoding: 'base64' });

detectGaugeRatio(imageData)
  .then(result => {
    console.log('Gauge detection result:');
    console.log(result);
  })
  .catch(error => {
    console.error('Error during gauge detection:', error);
  });
