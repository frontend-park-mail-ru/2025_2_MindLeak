'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');
//const crypto = require('crypto'); // перенесен в auth 
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// Middleware для логирования и статики
app.use(morgan('dev'));
// cтатика до всех API-роутов
app.use(express.static(path.resolve(__dirname, '..', 'public')));
app.use(express.static(path.resolve(__dirname, '..', 'node_modules')));

//парсит тело входящего запроса как JSON
app.use(bodyParser.json());
//парсит куки из заголовка Cookie и сохраняет их в req.cookies
app.use(cookieParser());

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    
    // ВАЖНО: отвечаем на OPTIONS запрос сразу
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    
    next();
});


// прокси для API
app.use('/api', createProxyMiddleware({
    target: 'http://62.109.19.84:8090',
    changeOrigin: true,
    cookieDomainRewrite: 'localhost',
    onProxyReq: (proxyReq, req, res) => {
        console.log('Proxying request:', req.method, req.url);
    },
    onProxyRes: (proxyRes, req, res) => {
        console.log('Proxy response:', proxyRes.statusCode, req.url);
    }
}));

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
});