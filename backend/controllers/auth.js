import { validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import User from '../models/user.js';
import AppError from '../middleware/errors.js';

export const signUp = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(
            new AppError('Validation failed, provided data is incorrect', {
                code: 422,
                errors: errors.array(),
            }),
            req,
            res,
        );
    }

    const { email, name, password } = req.body;

    try {
        const hashed = await bcrypt.hash(password, 12);

        const user = new User({
            name,
            email,
            password: hashed,
        });
        await user.save();

        res.status(201).json({ userId: user._id.toString() });
    } catch (e) {
        next(new AppError('Failed to create user', { cause: e }), req, res);
    }
};

export const logIn = async (req, res, next) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (user == null) {
            const e = new Error('Invalid email or password');
            e.code = 401;
            throw e;
        }

        const matches = await bcrypt.compare(password, user.password);
        if (!matches) {
            const e = new Error('Invalid email or password');
            e.code = 401;
            throw e;
        }

        const userId = user._id.toString();

        const token = jwt.sign({ email, userId }, process.env.JWT_SECRET, {
            expiresIn: '1h',
        });

        res.status(200).json({ token, userId });
    } catch (e) {
        next(
            new AppError('Failed to create user', { cause: e, code: e.code }),
            req,
            res,
        );
    }
};
