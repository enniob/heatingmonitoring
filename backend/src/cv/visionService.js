// Make sure to set the GOOGLE_APPLICATION_CREDENTIALS environment variable.
const { ImageAnnotatorClient } = require("@google-cloud/vision");

const visionClient = new ImageAnnotatorClient();

const detectWithGoogleVision = async (imageData) => {
  console.log("Entering detectWithGoogleVision. Image data received:", imageData ? "Yes" : "No");
  console.log("Attempting detection with Google Vision");
  console.log(`Image data size: ${imageData.length} bytes`);

  const content = imageData.includes(",")
    ? imageData.split(",").pop()
    : imageData;

  const image = {
    content: content,
  };

  console.log("Making Google Cloud Vision API call for object localization...");
  const [result] = await visionClient.objectLocalization({ image });
  console.log("Google Cloud Vision API call successful. Raw result:", JSON.stringify(result, null, 2));
  const objects = result.localizedObjectAnnotations;
  console.log(
    "Objects detected by Google Vision:",
    objects.map((o) => o.name)
  );

  if (!objects || objects.length === 0) {
    throw new Error("No objects detected by Google Vision");
  }

  // A more robust implementation would be to look for specific features of a gauge.
  // For now, we are just looking for a "Gauge" and assuming it is the most prominent object.
  const GAUGE_KEYWORDS = ["gauge", "meter", "indicator", "level", "dial"];
  const matchingObjects = objects.filter((object) =>
    GAUGE_KEYWORDS.some(keyword => object.name.toLowerCase().includes(keyword))
  );

  let gaugeObject = null;
  if (matchingObjects.length > 0) {
    gaugeObject = matchingObjects.sort((a, b) => b.score - a.score)[0];
  } else if (objects.length > 0) {
    console.log("No gauge-related keywords found. Considering the highest-scored object as a fallback.");
    const highestScoredObject = objects.sort((a, b) => b.score - a.score)[0];
    if (highestScoredObject.score > 0.5) {
      gaugeObject = highestScoredObject;
    }
  }

  if (!gaugeObject) {
    const detectedObjectNames = objects.map((object) => object.name).join(", ");
    throw new Error(
      `No gauge detected by Google Vision. Detected objects: ${
        detectedObjectNames || "None"
      }`
    );
  }
  console.log("Gauge object detected:", gaugeObject);

  // This is a very naive implementation. We are assuming the gauge is centered
  // and the needle is pointing up for full and down for empty.
  // A better implementation would be to analyze the vertices of the detected object.
  const vertices = gaugeObject.boundingPoly.normalizedVertices;
  const yCenter = (vertices[0].y + vertices[2].y) / 2;

  // Assuming the gauge is vertical, we can calculate the ratio from the y-center.
  // This is a placeholder logic and needs to be improved.
  const ratio = 1 - yCenter;

  console.log(`Calculated ratio: ${ratio}, Confidence: ${gaugeObject.score}`);

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
    console.error("Google Vision API error:", error);
    throw error;
  }
};

const testWithPlaceholder = async () => {
  const placeholderImage = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAREDwAAAAFzPGAWAAAAEElEQVR42mP8z8AICwgwAAAAAAAAAAAAwB9B62nLAAAAAElFTkSuQmCC";
  try {
    const result = await detectWithGoogleVision(placeholderImage);
    console.log("Test with placeholder successful:", result);
  } catch (error) {
    console.error("Test with placeholder failed:", error.message);
  }
};

if (require.main === module) {
  testWithPlaceholder();
}

module.exports = {
  detectWithFallback,
  detectWithGoogleVision,
  detectWithTensorFlow,
  testWithPlaceholder,
};
