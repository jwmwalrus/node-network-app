import dotenv from 'dotenv-flow';
import { expect } from 'chai';
import bcrypt from 'bcrypt';
import mongoose, { connect } from 'mongoose';

import User from '../models/user.js';
import { createPost } from '../controllers/feeds.js';

dotenv.config();

describe('Feeds controller - createPost', () => {
    let user;

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
    });

    it('should add a creator post to the posts of the creator', async () => {
        const req = {
            body: {
                title: 'Test post',
                content: 'This is a content',
            },
            file: {
                path: '/image/dummy.png',
            },
            userId: user._id.toString(),
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

        await createPost(req, res, () => {});
        expect(res.statusCode).to.equal(201);
        expect(res.payload).to.have.property('post');
        expect(res.payload).to.have.property('creator');

        const creator = await User.findById(user._id);
        const idx = creator.posts.findIndex((p) =>
            p.equals(res.payload.post._doc._id),
        );
        expect(idx).to.be.gt(-1);
    });
});
