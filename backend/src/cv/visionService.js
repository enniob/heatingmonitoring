// Make sure to set the GOOGLE_APPLICATION_CREDENTIALS environment variable.
const { ImageAnnotatorClient } = require("@google-cloud/vision");

const visionClient = new ImageAnnotatorClient();

const detectWithGoogleVision = async (imageData) => {
  console.log("Attempting detection with Google Vision");

  const image = {
    content: imageData.includes(",")
      ? imageData.split(",").pop()
      : imageData,
  };

  const [result] = await visionClient.objectLocalization({ image });
  const objects = result.localizedObjectAnnotations;

  if (!objects.length) {
    throw new Error("No objects detected by Google Vision");
  }

  // A more robust implementation would be to look for specific features of a gauge.
  // For now, we are just looking for a "Gauge" and assuming it is the most prominent object.
  const gaugeObject = objects.find((object) => object.name === "Gauge");

  if (!gaugeObject) {
    throw new Error("No gauge detected by Google Vision");
  }

  // This is a very naive implementation. We are assuming the gauge is centered
  // and the needle is pointing up for full and down for empty.
  // A better implementation would be to analyze the vertices of the detected object.
  const vertices = gaugeObject.boundingPoly.normalizedVertices;
  const yCenter = (vertices[0].y + vertices[2].y) / 2;

  // Assuming the gauge is vertical, we can calculate the ratio from the y-center.
  // This is a placeholder logic and needs to be improved.
  const ratio = 1 - yCenter;

  return {
    ratio,
    confidence: gaugeObject.score,
    source: "google-vision",
  };
};

const detectWithTensorFlow = async (imageData) => {
  console.log("Attempting detection with TensorFlow.js");

  // A pre-trained model is required for this to work.
  // You can train a model to detect the gauge and the needle, and then load it here.
  // For example:
  // const model = await tf.loadLayersModel('file://path/to/your/model/model.json');
  //
  // Since we don't have a model, this function will throw an error.
  throw new Error(
    "TensorFlow.js model not found. Please train a model and update this function."
  );

  // Example of how to use the model:
  // const content = imageData.includes(",")
  //   ? imageData.split(",").pop()
  //   : imageData;
  // const buffer = Buffer.from(content, "base64");
  // const tensor = tf.node.decodeImage(buffer, 3);
  // const predictions = model.predict(tensor.expandDims(0));
  //
  // const ratio = ... // process predictions to get the ratio
  // const confidence = ... // get the confidence from the predictions
  //
  // return {
  //   ratio,
  //   confidence,
  //   source: 'tensorflow',
  // };
};

const detectWithFallback = async (imageData) => {
  try {
    return await detectWithGoogleVision(imageData);
  } catch (error) {
    console.error("Google Vision detection failed:", error.message);
    try {
      return await detectWithTensorFlow(imageData);
    } catch (error2) {
      console.error("TensorFlow.js detection failed:", error2.message);
      return null;
    }
  }
};

module.exports = {
  detectWithFallback,
  detectWithGoogleVision,
  detectWithTensorFlow,
};
