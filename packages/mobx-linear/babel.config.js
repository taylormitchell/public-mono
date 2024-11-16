module.exports = {
  plugins: [
    // Enable legacy decorator syntax
    ["@babel/plugin-proposal-decorators", { legacy: true }],
    // Enable class properties with loose mode for compatibility
    ["@babel/plugin-proposal-class-properties", { loose: true }],
  ],
};
