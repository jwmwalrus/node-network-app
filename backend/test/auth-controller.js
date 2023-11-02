import dotenv from 'dotenv-flow';
import { expect } from 'chai';
import bcrypt from 'bcrypt';
import mongoose, { connect } from 'mongoose';

import { logIn, signUp } from '../controllers/auth.js';
import User from '../models/user.js';

dotenv.config();

describe('Auth controller - signUp', () => {
    before(async () => {
        await connect(process.env.MONGODB_URI);
        await mongoose.connection.db.dropDatabase();
    });

    it('should successfully signup', async () => {
        const req = {
            body: {
                email: 'succeeder@test.com',
                password: 'tester',
                name: 'Tester',
            },
        };
        const res = {
            statusCode: 0,
            body: {},
            status(code) {
                this.statusCode = code;
                return this;
            },
            json(p) {
                this.body = p;
                return this;
            },
        };
        await signUp(req, res, () => {});

        expect(res.statusCode).to.equal(201);
        expect(res.body).to.have.property('userId');
    });
});

describe('Auth Controller - logIn', () => {
    before(async () => {
        await connect(process.env.MONGODB_URI);
        await mongoose.connection.db.dropDatabase();

        const hashed = await bcrypt.hash('tester', 12);
        const user = new User({
            email: 'tester@test.com',
            password: hashed,
            name: 'Tester',
        });
        await user.save();
    });

    it('should throw an error with code 401 for user not found', async () => {
        const req = {
            body: {
                email: 'wrong@test.com',
                password: 'tester',
            },
        };

        await logIn(req, {}, (err) => {
            expect(err.code).to.equal(401);
        });
    });

    it('should throw an error with code 401 for wrong password', async () => {
        const req = {
            body: {
                email: 'tester@test.com',
                password: 'texter',
            },
        };

        await logIn(req, {}, (err) => {
            expect(err.code).to.equal(401);
        });
    });

    it('should login successfully', async () => {
        const req = {
            body: {
                email: 'tester@test.com',
                password: 'tester',
            },
        };
        const res = {
            statusCode: 0,
            payload: {},
            status(code) {
                this.statusCode = code;
                return this;
            },
            json(p) {
                this.payload = p;
                return this;
            },
        };

        await logIn(req, res, () => {});

        expect(res.statusCode).to.equal(200);
    });
});
