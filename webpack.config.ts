import AddAssetHtmlPlugin from 'add-asset-html-webpack-plugin'
import chalk from 'chalk'
import fs from 'fs'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import path from 'path'
import webpack from 'webpack'

const currentDir = process.cwd()
const appDirectory = fs.realpathSync(currentDir)
const resolvePath = (relativePath: string) =>
  path.resolve(appDirectory, relativePath)

let env: any = {}

try {
  env = require('dotenv-safe').config().parsed
} catch (e) {
  if (process.env.NODE_ENV === 'production') {
    console.error(chalk.red(e))
    process.exit(1)
  }
  console.warn(chalk.yellow(e.message))
}

const envStrings = Object.assign(
  {},
  ...Object.keys(env).map((key) => ({
    ['process.env.' + key]: JSON.stringify(env[key]),
  })),
)

console.log({ envStrings })

const config: webpack.Configuration = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  entry: './src',

  plugins: [
    new webpack.DefinePlugin({
      ...envStrings,
    }),
    new webpack.DllReferencePlugin({
      context: __dirname,
      manifest: resolvePath(
        'node_modules/@dlive-superchats/dll/vendors-manifest.json',
      ),
    }),
    new HtmlWebpackPlugin({
      chunksSortMode: 'auto',
      filename: 'index.html',
      inject: true,
      minify: {
        collapseWhitespace: true,
        keepClosingSlash: true,
        minifyCSS: true,
        minifyJS: true,
        minifyURLs: true,
        removeComments: true,
        removeEmptyAttributes: true,
        removeRedundantAttributes: true,
        removeStyleLinkTypeAttributes: true,
        useShortDoctype: true,
      },
      template: './src/index.html',
      title: 'Dlive Superchats',
    }),
    new AddAssetHtmlPlugin({
      filepath: resolvePath(
        'node_modules/@dlive-superchats/dll/vendors.dll.js',
      ),
    }),
  ],

  module: {
    rules: [
      {
        test: /\.(tsx|jsx|ts|js)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            configFile: resolvePath('babel.config.js'),
          },
        },
      },
      {
        test: /\.(vert|frag)$/,
        use: 'raw-loader',
      },
      {
        test: /\.(png|svg)$/,
        use: 'url-loader',
      },
      {
        test: /\.s[ac]ss$/i,
        use: [
          // Creates `style` nodes from JS strings
          'style-loader',
          // Translates CSS into CommonJS
          'css-loader',
          // Compiles Sass to CSS
          'sass-loader',
        ],
      },
    ],
  },

  resolve: {
    extensions: ['.js', '.tsx', '.ts', '.jsx', '*', '.scss'],
  },

  devServer: {
    // open: true,
    host: '0.0.0.0',
    port: 4141,
  },
}

export default config
