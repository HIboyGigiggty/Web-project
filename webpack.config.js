// Generated using webpack-cli https://github.com/webpack/webpack-cli

const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const WorkboxWebpackPlugin = require("workbox-webpack-plugin");
const { ProgressPlugin } = require("webpack");
const PnpWebpackPlugin = require("pnp-webpack-plugin")
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const isProduction = process.env.NODE_ENV == "production";

const stylesHandler = isProduction
  ? MiniCssExtractPlugin.loader
  : "style-loader";

const config = {
  entry: { index: "./src/index.tsx" },
  target: "browserslist:supports rtcpeerconnection",
  output: {
    filename: "[id].bundle.js",
    path: path.resolve(__dirname, "dist"),
    clean: true,
  },
  devServer: {
    open: true,
    host: "localhost",
    historyApiFallback: true,
  },
  plugins: [
    new ProgressPlugin(),
    new HtmlWebpackPlugin({
      template: "index.html",
    }),
    PnpWebpackPlugin,

    // Add your plugins here
    // Learn more about plugins from https://webpack.js.org/configuration/plugins/
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/i,
        use: ["babel-loader", "ts-loader"],
      },
      {
        test: /\.jsx?$/i,
        use: ["babel-loader"],
      },
      {
        test: /\.(styl|css)$/i,
        use: [
          stylesHandler,
          { loader: "css-loader", options: { sourceMap: !isProduction } },
          { loader: "stylus-loader", options: { sourceMap: !isProduction } }
        ],
      },
      {
        test: /\.(eot|svg|ttf|woff|woff2|png|jpg|gif)$/i,
        type: "asset",
      },

      // Add your rules for custom modules here
      // Learn more about loaders from https://webpack.js.org/loaders/
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js", ".jsx"],
    alias: {},
  },
  resolveLoader: {
    plugins: [
      PnpWebpackPlugin.moduleLoader(module),
    ]
  },
  optimization: {
    runtimeChunk: 'single',
  },
  ignoreWarnings: [
    {
      module: /@supabase\/*/,
      message: /module has no exports/,
    }
  ],
};

module.exports = () => {
  if (isProduction) {
    config.mode = "production";

    config.plugins.push(new MiniCssExtractPlugin());

    config.plugins.push(new WorkboxWebpackPlugin.GenerateSW({
      clientsClaim: true,
      skipWaiting: true,
    }));
    
    config.plugins.push(new BundleAnalyzerPlugin({
      analyzerMode: "disabled",
      generateStatsFile: true,
    }));
    
  } else {
    config.mode = "development";
    config.devtool = 'inline-source-map';
  }
  return config;
};
