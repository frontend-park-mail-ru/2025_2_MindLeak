'use strict';

const express = require('express');
const auth = require('./auth');

const router = express.Router();

router.post('/signup', auth.signup);
router.post('/login', auth.login);
router.get('/me', auth.me);
router.post('/logout', auth.logout);

module.exports = router;