'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');
const crypto = require('crypto'); // для crypto.randomUUID()

const app = express();

// Middleware для логирования и статики
app.use(morgan('dev'));
// cтатика до всех API-роутов
app.use(express.static(path.resolve(__dirname, '..', 'public')));
//app.use(express.static(path.resolve(__dirname, '..', 'node_modules')));

//парсит тело входящего запроса как JSON
app.use(bodyParser.json());
//парсит куки из заголовка Cookie и сохраняет их в req.cookies
app.use(cookieParser());

// todo ИЗМЕНИТЬ
const images = [
    { src: '/273153700_118738253861831_5906416883131394354_n.jpeg', likes: 120 },
    { src: '/272708814_1158833634855293_1743973316352152210_n.webp.jpg', likes: 250 },
    { src: '/272464515_147005761018515_3100264353239753904_n.webp.jpg', likes: 201 },
    { src: '/259096143_252774593424446_3292295880799640700_n.jpeg', likes: 300 },
    { src: '/19984805_468099790230913_7469029070697660416_n.jpeg', likes: 100500 },
    { src: '/16583858_168051673696142_846500378588479488_n.jpeg', likes: 350 }
];

const users = {
    'belova@mail.ru': { name: 'A', email: 'belova@mail.ru', password: 'password'},
    'lazutkina@mail.ru': { name: 'B', email: 'lazutkina@mail.ru', password: 'password'},
    'tsapkov@mail.ru': { name: 'C', email: 'tsapkov@mail.ru', password: 'password'},
    'vladimirov@mail.ru': { name: 'D', email: 'vladimirov@mail.ru', password: 'password'}
};
const ids = {};

function formUser(user) {
    return {
        ...user,
        password: undefined,
        images: user.images?.map(id => ({ ...images[id], id })) || []
    };
}


//API-роуты 
app.post('/signup', (req, res) => {
    try{   
        const { name, email, password } = req.body;
        if (
            !name || !password || !email || 
            !name.match(/^\S{4,}$/) ||
            !password.match(/^\S{4,}$/) ||
            !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
        ) {
            return res.status(400).json({ error: 'Не валидные данные пользователя' });
        }
        if (users[email]) {
            return res.status(400).json({
                fieldErrors: [
                    { field: 'email', message: 'Пользователь с такой почтой уже существует' }
                ]
            });
        }

        const id = crypto.randomUUID(); // используем crypto из Node.js
        const user = { name, email, password, images: [] };
        ids[id] = email;
        users[email] = user;

        res.cookie('podvorot', id, {
            expires: new Date(Date.now() + 1000 * 60 * 10), //10 min
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' // только в продакшене
        });
        res.status(201).json({ id });
    } catch (err) {
        console.error('Ошибка при входе:', err);

        return res.status(500).json({
            globalError: 'Сервер временно недоступен. Попробуйте позже.'
        });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email) {
            return res.status(400).json({
                fieldErrors: [
                { field: 'email', message: 'Не указан E-Mail' }
                ]
            });
        }

        if (!password) {
            return res.status(400).json({
                fieldErrors: [
                { field: 'password', message: 'Не указан пароль' }
                ]
            });
        }

        if (!users[email] || users[email].password !== password) {
            return res.status(400).json({
                fieldErrors: [
                { field: 'email', message: 'Неверный E-Mail или пароль' }
                ]
            });
        }

        const id = crypto.randomUUID();
        ids[id] = email;

        res.cookie('podvorot', id, {
            expires: new Date(Date.now() + 1000 * 60 * 10),
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production'
        });

        return res.status(200).json({ id });

    } catch (err) {
        console.error('Ошибка при входе:', err);
        return res.status(500).json({
            globalError: 'Сервер временно недоступен. Попробуйте позже.'
        });
    }
});

app.get('/me', (req, res) => {
    const id = req.cookies['podvorot'];
    const email = ids[id];
    if (!email || !users[email]) {
        return res.status(401).end();
    }
    res.json(formUser(users[email]));
});

/*app.get('/feed', (req, res) => {
    const id = req.cookies['podvorot'];
    const emailSession = ids[id];
    if (!emailSession || !users[emailSession]) {
        return res.status(401).end();
    }

    const userSessionImagesSet = new Set(users[emailSession].images || []);
    const result = images
        .map((img, id) => ({ ...img, id }))
        .filter(({ id }) => !userSessionImagesSet.has(id));

    res.json(result);
});

app.post('/like', (req, res) => {
    const id = req.cookies['podvorot'];
    const emailSession = ids[id];
    if (!emailSession || !users[emailSession]) {
        return res.status(401).end();
    }

    const { id: imageId } = req.body;
    if (images[imageId]) {
        images[imageId].likes++;
        res.status(200).json({ status: 'ok' });
    } else {
        res.status(400).json({ error: 'Неверный ID изображения' });
    }
});*/

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
});