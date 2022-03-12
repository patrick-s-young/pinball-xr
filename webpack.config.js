const path = require('path');

module.exports = {
  entry: './src/app.js',
  devServer: {
    static: './dist',
  },
  devtool: 'inline-source-map',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  resolve: {
    alias: {
      cannon: path.resolve(__dirname, 'src/cannon')
    }
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
};