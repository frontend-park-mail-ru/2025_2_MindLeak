'use strict';

const crypto = require('crypto');

/**
 * Хранилище пользователей
 * @type {Object<string, {name: string, email: string, password: string, avatar: string}>}
 */
const users = {
  'belova@mail.ru': { name: 'A', email: 'belova@mail.ru', password: 'password', avatar: 'defaultAvatar.jpg' },
  'lazutkina@mail.ru': { name: 'B', email: 'lazutkina@mail.ru', password: 'password', avatar: 'defaultAvatar.jpg' },
  'tsapkov@mail.ru': { name: 'C', email: 'tsapkov@mail.ru', password: 'password', avatar: 'defaultAvatar.jpg' },
  'vladimirov@mail.ru': { name: 'D', email: 'vladimirov@mail.ru', password: 'password', avatar: 'defaultAvatar.jpg' }
};

/**
 * Хранилище сессий
 * @type {Object<string, string>}
 */
const ids = {};

/**
 * Удаляет пароль из объекта пользователя для безопасного ответа
 * @param {Object} user - Объект пользователя
 * @returns {Object} - Безопасный объект пользователя
 */
function formUser(user) {
    return {
        ...user,
        password: undefined
    };
}

module.exports = {
    /**
     * Регистрация нового пользователя
     * @param {import('express').Request} req - Объект запроса Express
     * @param {import('express').Response} res - Объект ответа Express
     * @returns {void}
     */
    signup: (req, res) => {
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
                return res.status(409).json({
                    fieldErrors: [
                        { field: 'email', message: 'Пользователь с такой почтой уже существует' }
                    ]
                });
            }

            const id = crypto.randomUUID();
            const user = { name, email, password, images: [] };
            ids[id] = email;
            users[email] = user;

            res.cookie('podvorot', id, {
                expires: new Date(Date.now() + 1000 * 60 * 10),
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production'
            });
            res.status(201).json({ id });
        } catch (err) {
            console.error('Ошибка при входе:', err);

            return res.status(500).json({
                globalError: 'Сервер временно недоступен. Попробуйте позже.'
            });
        }
    },

    /**
     * Авторизация пользователя
     * Возвращает email, имя и аватар при успешной проверке
     * @param {import('express').Request} req - Объект запроса Express
     * @param {import('express').Response} res - Объект ответа Express
     * @returns {void}
     */
    login: (req, res) => {
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
            const user = users[email];
            if (!user || user.password !== password) {
                return res.status(401).json({
                    fieldErrors: [{ field: 'email', message: 'Неверный email или пароль' }]
                });
            }
            const id = crypto.randomUUID();
            ids[id] = email;

            res.cookie('podvorot', id, {
                expires: new Date(Date.now() + 1000 * 60 * 10),
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production'
            });

            res.status(200).json({
                email: user.email,
                name: user.name,
                avatar: user.avatar
            });
        } catch (err) {
            console.error('Ошибка при входе:', err);
            return res.status(500).json({
                globalError: 'Сервер временно недоступен. Попробуйте позже.'
            });
        }
    },

    /**
     * Получение данных текущего пользователя по сессии
     * @param {import('express').Request} req - Объект запроса Express
     * @param {import('express').Response} res - Объект ответа Express
     * @returns {void}
     */
    me: (req, res) => {
        const id = req.cookies['podvorot'];
        const email = ids[id];
        if (!email || !users[email]) {
            return res.status(401).end();
        }
        res.json(formUser(users[email]));
    },

    /**
     * Выход из системы — удаление сессии
     * @param {import('express').Request} req - Объект запроса Express
     * @param {import('express').Response} res - Объект ответа Express
     * @returns {void}
     */
    logout: (req, res) => {
        const id = req.cookies['podvorot'];
        if (id) {
            delete ids[id]; // удаляем сессию на сервере
        }
        res.clearCookie('podvorot'); // удаляем кук у клиента
        res.status(200).json({ ok: true });
    }
};