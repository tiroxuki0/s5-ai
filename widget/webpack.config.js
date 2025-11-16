const path = require("path")
const MiniCssExtractPlugin = require("mini-css-extract-plugin")
const webpack = require("webpack")

module.exports = {
  mode: "production",
  entry: "./index.tsx",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "widget.js"
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js", ".jsx"]
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: "ts-loader",
            options: {
              transpileOnly: true, // Skip type checking for faster builds
              configFile: path.resolve(__dirname, "tsconfig.json")
            }
          }
        ],
        exclude: /node_modules/
      },
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, "css-loader"]
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: "asset/inline"
      }
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: "widget.css"
    })
  ],
  externals: {
    react: "React",
    "react-dom": "ReactDOM"
  },
  optimization: {
    minimize: true
  }
}
