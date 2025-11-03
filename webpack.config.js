const path = require('path');

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
      ],
    },
    
    resolve: {
      extensions: ['.ts', '.js', '.hbs'],
    },
    
    output: {
      filename: 'bundle.js',
      path: path.resolve(__dirname, 'public'),
    },

    //todo УБРАТЬ КОГДА УБЕЖДУСЬ, ЧТО ПРОБЛЕМА БЫЛА В ТОТ МОМЕНТ НА БЭКЕ А НЕ У МЕНЯ (Т К ТЕСТ ПРИШЕЛ НА АПДЕЙТ БЭКА)
    // Полностью отключаем разделение кода
    optimization: {
      splitChunks: false,
      runtimeChunk: false,
      minimize: isProduction,
      // Предотвращаем создание отдельных файлов для чанков
      moduleIds: 'deterministic',
      chunkIds: 'deterministic'
    }
  };
};