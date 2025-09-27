'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');
//const crypto = require('crypto'); // перенесен в auth 

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

const apiRouter = require('./api'); //пойдет в api/index.js
app.use(apiRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
});