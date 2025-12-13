'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const BACKEND = 'https://mindleak.ru';

app.use(morgan('dev'));

app.use(
  '/api',
  createProxyMiddleware({
    target: BACKEND,
    changeOrigin: true,
    secure: false,
    ws: true, // ← WebSocket поддержка
    onProxyReq: (proxyReq, req) => {
      // Передаём куки и заголовки
      // (http-proxy-middleware делает это автоматически при changeOrigin: true)
    },
    onProxyReqWs: () => {
      console.log('🔄 WebSocket proxy upgrade → backend');
    }
  })
);

app.use(express.static(path.resolve(__dirname, '..', 'public')));
app.use(express.static(path.resolve(__dirname, '..', 'node_modules')));
app.use('/dist', express.static(path.resolve(__dirname, '..', 'dist')));

app.use(bodyParser.json());
app.use(cookieParser());

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    
    next();
});

//обработчик SPA
app.get(/\/(?!api|dist|node_modules).*/, (req, res) => {
    // Для всех маршрутов, которые не начинаются с /api, /dist, /node_modules
    res.sendFile(path.resolve(__dirname, '..', 'public', 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log("http://localhost:3000");
});