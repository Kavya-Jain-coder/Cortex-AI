const { createTLStore, defaultShapeUtils, getSnapshot } = require("tldraw");

const store = createTLStore({ shapeUtils: defaultShapeUtils });
const snapshot = getSnapshot(store);
const json = JSON.stringify(snapshot);
console.log("Size in bytes:", json.length);
