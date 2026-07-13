// Mock for react-native-css-interop
// Minimal no-op: just return the element type
module.exports = {
  createInteropElement: function(type) { return type; },
};
