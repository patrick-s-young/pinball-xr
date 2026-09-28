// Bundles the physics tests for Node, with the app's module aliases.
const path = require('path');
const app = require('../../webpack.config.js')({ development: 'true' });

module.exports = {
  mode: 'development',
  target: 'node',
  devtool: false,
  entry: path.resolve(__dirname, 'physics.test.js'),
  output: { path: path.resolve(__dirname, '.build'), filename: 'physics.test.js', clean: true },
  resolve: { alias: app.resolve.alias }
};
