const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    entry: './public/index.ts',
    
    mode: isProduction ? 'production' : 'development',
    
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.hbs$/,
          use: 'handlebars-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg)$/,
          type: 'asset/resource',
          generator: {
            filename: 'img/[name][ext]'
          }
        }
      ],
    },
    
    resolve: {
      extensions: ['.ts', '.js', '.hbs'],
      alias: {
        // Добавляем алиасы для удобства импортов
        '@stores': path.resolve(__dirname, 'public/stores'),
        '@components': path.resolve(__dirname, 'public/components'),
        '@views': path.resolve(__dirname, 'public/views')
      }
    },
    
    output: {
      filename: 'bundle.js',
      path: path.resolve(__dirname, 'dist'),
      publicPath: '/', // Важно для корректных путей
      clean: true,
    },

    plugins: [
      // Главная страница
      new HtmlWebpackPlugin({
        template: './public/index.html',
        filename: 'index.html',
        inject: 'body'
      }),
      // Страница техподдержки
      new HtmlWebpackPlugin({
        template: './public/TechSupport.html',
        filename: 'TechSupport.html',
        inject: 'body'
      }),
      // Копируем статические файлы
      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'public/img',
            to: 'img',
            noErrorOnMissing: true
          },
          {
            from: 'public/components/**/*.hbs',
            to: '[name][ext]',
            noErrorOnMissing: true
          }
        ]
      })
    ],

    // Dev server для разработки
    devServer: {
      static: {
        directory: path.join(__dirname, 'dist'),
      },
      port: 3000,
      open: true,
      hot: true,
      historyApiFallback: true // Для SPA
    },

    //todo УБРАТЬ КОГДА УБЕЖДУСЬ, ЧТО ПРОБЛЕМА БЫЛА В ТОТ МОМЕНТ НА БЭКЕ А НЕ У МЕНЯ (Т К ТЕСТ ПРИШЕЛ НА АПДЕЙТ БЭКА)
    optimization: {
      splitChunks: false,
      runtimeChunk: false,
      minimize: isProduction,
      moduleIds: 'deterministic',
      chunkIds: 'deterministic'
    }
  };
};