import path from 'path'
import webpack from 'webpack'

const dependencies = require('./package.json').dependencies

/**
 * Exclude any package.json dependencies that throw errors here.
 */
const ignored: any = []

let vendors: any = []

Object.keys(dependencies).filter((key) =>
  ignored.indexOf(key) === -1 ? vendors.push(key) : null,
)

export default function vendorsWebpack() {
  const basePath = process.cwd()

  return {
    bail: true,
    devtool: '#source-map',
    target: 'web',
    mode: 'development',
    entry: { vendors },
    output: {
      path: path.join(basePath, 'dll'),
      filename: '[name].dll.js',
      library: '[name]_[hash]',
    },
    plugins: [
      new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
      new webpack.DllPlugin({
        context: __dirname,
        name: '[name]_[hash]',
        path: path.resolve(basePath, 'dll', '[name]-manifest.json'),
      }),
    ],
    optimization: {
      minimize: false,
    },
    performance: {
      hints: false,
    },
  }
}
