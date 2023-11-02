import { expect } from 'chai'; // Using Assert style
import request from 'supertest';
import bcrypt from 'bcrypt';
import mongoose, { connect } from 'mongoose';

import User from '../models/user.js';
import app from '../app.js';

describe('GET /feed/posts', () => {
    before(async () => {
        await connect(process.env.MONGODB_URI);
        await mongoose.connection.db.dropDatabase();
    });

    it('should fail to get posts with status code 401', async () => {
        const res = await request(app).get('/feed/posts');

        expect(res.status).to.equal(401);
    });
});

describe('POST /feed/posts', () => {
    let user;
    let token;

    before(async () => {
        await connect(process.env.MONGODB_URI);
        await mongoose.connection.db.dropDatabase();

        const hashed = await bcrypt.hash('tester', 12);
        user = new User({
            email: 'tester@test.com',
            password: hashed,
            name: 'Tester',
        });
        await user.save();

        const res = await request(app)
            .post('/auth/login')
            .set('Content-Type', 'application/json')
            .send({ email: 'tester@test.com', password: 'tester' });

        token = res.body.token;
        expect(token).to.not.be.empty;
    });

    it('should fail title validation', async () => {
        const res = await request(app)
            .post('/feed/posts')
            .set({
                Authorization: 'Bearer ' + token,
                'Content-Type': 'application/json',
            })
            .send({
                title: 'T',
                content: "Weird, isn't it?",
                imageUrl: '/image/dummy.png',
            });
        expect(res.status).to.equal(422);
    });

    it('should fail content validation', async () => {
        const res = await request(app)
            .post('/feed/posts')
            .set({
                Authorization: 'Bearer ' + token,
                'Content-Type': 'application/json',
            })
            .send({
                title: 'This is a post',
                content: 'W',
                imageUrl: '/image/dummy.png',
            });
        expect(res.status).to.equal(422);
    });
});
