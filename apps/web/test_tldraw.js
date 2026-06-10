const { createTLStore, defaultShapeUtils, loadSnapshot } = require("tldraw");

const store = createTLStore({ shapeUtils: defaultShapeUtils });
try {
  loadSnapshot(store, {});
  console.log("Empty object works");
} catch (e) {
  console.log("Empty object error:", e.message);
}
