const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
    const isProduction = argv.mode === 'production';
    
    return {
        // МНОЖЕСТВЕННЫЕ ТОЧКИ ВХОДА
        entry: {
            main: './public/index.ts',
            TechSupport: './public/components/TechSupport/TechSupport.ts'
        },
        
        mode: isProduction ? 'production' : 'development',
        
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    use: 'ts-loader',
                    exclude: /node_modules/,
                },
                {
                    test: /\.scss$/i,
                    use: [
                    'style-loader',
                    'css-loader',
                    'sass-loader'
                    ]
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
                '@stores': path.resolve(__dirname, 'public/stores'),
                '@components': path.resolve(__dirname, 'public/components'),
                '@views': path.resolve(__dirname, 'public/views')
            }
        },
      
        output: {
            filename: '[name].bundle.js', // ИСПОЛЬЗУЙТЕ [name]
            path: path.resolve(__dirname, 'dist'),
            publicPath: '/',
            clean: true,
        },

        plugins: [
            // Главная страница
            new HtmlWebpackPlugin({
                template: './public/index.html',
                filename: 'index.html',
                chunks: ['main'], // ТОЛЬКО main bundle
                inject: 'body'
              }),
            // Страница техподдержки
            new HtmlWebpackPlugin({
                template: './public/TechSupport.html',
                filename: 'TechSupport.html',
                chunks: ['TechSupport'], // ТОЛЬКО TechSupport bundle
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
                        from: 'public/components/TechSupport/TechSupport.hbs',
                        to: 'components/TechSupport/[name][ext]',
                        noErrorOnMissing: true
                    },
                    //todo ТОВОЕ ДЛЯ server-worker
                    {
                        from: 'public/service-worker.js',
                        to: '[name][ext]',
                        noErrorOnMissing: true
                    }
                ]
            })
        ],

        devServer: {
            static: {
                directory: path.join(__dirname, 'dist'),
            },
            port: 3000,
            open: true,
            hot: true,
            historyApiFallback: true
        },

        optimization: {
            splitChunks: false,
            runtimeChunk: false,
            minimize: isProduction,
            moduleIds: 'deterministic',
            chunkIds: 'deterministic'
        }
    };
};