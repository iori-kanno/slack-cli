const webpack = require('webpack');
const path = require('path');

/**
 * @type {import('webpack').Configuration}
 */
module.exports = {
  target: 'node',

  mode: 'development',

  entry: {
    'slack-cli': './src/entry.ts',
    'slash-command': './src/slash-commands/index.ts',
  },

  output: {
    clean: true,
    filename: '[name].bundle.js',
    path: `${__dirname}/dist`,
  },

  externals: [
    // package.json はビルドファイルには含めず外部ファイルとして読み込む
    // パスはビルド後のファイル構造を考慮する
    ({ request }, callback) => {
      // if (/package\.json$/.test(request)) {
      //   callback(null, 'commonjs ../../package.json');
      // } else {
      callback();
      // }
    },

    // require("node:<package>") に対応していない node バージョンのために、
    // require("<package>") に変換する
    ({ request }, callback) => {
      const module = request.match(/^node:(.+)/)?.[1];

      if (module) {
        callback(null, `commonjs ${module}`);
      } else {
        callback();
      }
    },

    // Do not include the sqlite3 binary file
    {
      sqlite3: 'commonjs sqlite3',
    },
  ],

  resolve: {
    extensions: ['.js', '.ts', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: path.resolve(__dirname, 'tsconfig.json'),
          },
        },
      },
    ],
  },

  plugins: [
    // ビルドファイルの先頭に shebang を追加する
    new webpack.BannerPlugin({ banner: '#!/usr/bin/env node', raw: true }),
    // 出力先のファイルを`slack-cli.js`のみにするための設定
    new webpack.optimize.LimitChunkCountPlugin({ maxChunks: 1 }),
  ],
};
