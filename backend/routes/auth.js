import { Router } from 'express';
import { body } from 'express-validator';

import { signUp, logIn } from '../controllers/auth.js';

import User from '../models/user.js';

const router = Router();

const nameValidator = body(
    'name',
    'At least two characters are required for the name',
)
    .notEmpty()
    .isLength({ min: 2 })
    .trim();

const emailValidator = body('email')
    .isEmail({ require_tld: false })
    .withMessage('Please enter a valid email address')
    .normalizeEmail();

const existingEmailValidator = body('email').custom(async (value) => {
    const user = await User.findOne({ email: value });
    if (!user) {
        throw new Error('No user exists with the provided E-Mail');
    }

    return true;
});

const newEmailValidator = body('email').custom(async (value) => {
    const user = await User.findOne({ email: value });
    if (user) {
        throw new Error('E-Mail exists already, please pick a different one');
    }

    return true;
});

const passwordValidator = body(
    'password',
    'Please enter a password with only numbers and letters and at least 5 characters long',
)
    .isLength({ min: 5 })
    .isAlphanumeric()
    .trim();

router.put(
    '/signup',
    [nameValidator, emailValidator, newEmailValidator, passwordValidator],
    signUp,
);

router.post(
    '/login',
    [emailValidator, existingEmailValidator, passwordValidator],
    logIn,
);

export default router;
