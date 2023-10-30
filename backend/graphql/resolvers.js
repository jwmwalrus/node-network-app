import bcrypt from 'bcrypt';
import validator from 'validator';
import jwt from 'jsonwebtoken';

import User from '../models/user.js';
import Post from '../models/post.js';

const ITEMS_PER_PAGE = 2;

export default {
    createUser: async ({ userInput }, req) => {
        const { name, email, password } = userInput;

        const errors = [];
        if (!validator.isEmail(email, { require_tld: false })) {
            errors.push({ message: 'Email is not valid' });
        }
        if (
            validator.isEmpty(password) ||
            !validator.isLength(password, { min: 5 })
        ) {
            errors.push({
                message: 'Password must contain at least 5 characters',
            });
        }
        if (!validator.isLength(name, { min: 2 })) {
            errors.push({ message: 'Name must contain at least 2 characters' });
        }

        if (errors.length > 0) {
            const e = new Error('Invalid input');
            e.data = errors;
            e.code = 422;
            throw e;
        }

        try {
            const existing = await User.findOne({ email });
            if (existing) {
                throw new Error('User already exists');
            }

            const hashed = await bcrypt.hash(password, 12);

            const user = new User({
                name,
                email,
                password: hashed,
            });
            const created = await user.save();

            return { ...created._doc, _id: created._id.toString() };
        } catch (e) {
            console.error(e);
            const err = new Error('Failed to create user', { cause: e });
            throw err;
        }
    },

    login: async ({ email, password }, res) => {
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

        return { token, userId };
    },

    createPost: async ({ postInput }, req) => {
        if (!req.isAuth) {
            const e = new Error('Not authenticated!');
            e.status = 401;
            throw e;
        }

        const { title, content, imageUrl } = postInput;

        const errors = [];
        if (
            validator.isEmpty(title) ||
            !validator.isLength(title, { min: 5 })
        ) {
            errors.push({
                message: 'Title must be at least 5 characters long',
            });
        }
        if (validator.isEmpty(content)) {
            errors.push({ message: 'Content cannot be empty' });
        }
        if (errors.length > 0) {
            const e = new Error('Invalid input');
            e.data = errors;
            e.status = 422;
            throw e;
        }

        try {
            const user = await User.findById(req.userId);
            if (!user) {
                const e = new Error('Invalid user');
                e.status = 401;
                throw e;
            }

            const post = await Post.create({
                title,
                content,
                imageUrl,
                creator: user._id,
            });
            await post.save();
            await post.populate('creator');

            user.posts.push(post);
            await user.save();
            console.log({
                ...post._doc,
                _id: post._id.toString(),
                createdAt: post.createdAt.toISOString(),
                updatedAt: post.updatedAt.toISOString(),
            });

            return {
                ...post._doc,
                _id: post._id.toString(),
                createdAt: post.createdAt.toISOString(),
                updatedAt: post.updatedAt.toISOString(),
            };
        } catch (e) {
            console.error(e);
            const err = new Error('Failed to create post', { cause: e });
            throw err;
        }
    },

    post: async ({ postId }, req) => {
        if (!req.isAuth) {
            const e = new Error('Post not found');
            e.status = 401;
            throw e;
        }

        try {
            const post = await Post.findById(postId).populate('creator');
            if (post == null) {
                throw new Error('Post not found');
            }

            return {
                ...post._doc,
                _id: post._id.toString(),
                createdAt: post.createdAt.toISOString(),
                updatedAt: post.updatedAt.toISOString(),
            };
        } catch (e) {
            const err = Error('Failed to get post by _id');
            err.status = 404;
            throw err;
        }
    },

    posts: async ({ page }, req) => {
        if (!req.isAuth) {
            const e = new Error('Post not found');
            e.status = 401;
            throw e;
        }

        const currentPage = page == null ? 1 : Number(page);
        try {
            let posts = [];
            const totalItems = await Post.find().count();
            if (totalItems > 0) {
                posts = await Post.find()
                    .populate('creator')
                    .sort({ createdAt: -1 })
                    .skip((currentPage - 1) * ITEMS_PER_PAGE)
                    .limit(ITEMS_PER_PAGE);
            }

            let totalPages = Math.floor(totalItems / ITEMS_PER_PAGE);
            totalPages += totalItems % ITEMS_PER_PAGE > 0 ? 1 : 0;
            totalPages = totalPages > 0 ? totalPages : 1;

            return {
                posts: posts.map((p) => ({
                    ...p._doc,
                    _id: p._id.toString(),
                    createdAt: p.createdAt.toISOString(),
                    updatedAt: p.updatedAt.toISOString(),
                })),
                currentPage,
                totalPages,
                totalItems,
            };
        } catch (e) {
            const err = new Error('Failed to get posts', { cause: e });
            err.status = 400;
            throw err;
        }
    },

    updatePost: async ({ id, postInput }, req) => {
        if (!req.isAuth) {
            const e = new Error('Not authenticated!');
            e.status = 401;
            throw e;
        }

        const { title, content, imageUrl } = postInput;

        const errors = [];
        if (
            validator.isEmpty(title) ||
            !validator.isLength(title, { min: 5 })
        ) {
            errors.push({
                message: 'Title must be at least 5 characters long',
            });
        }
        if (validator.isEmpty(content)) {
            errors.push({ message: 'Content cannot be empty' });
        }
        if (errors.length > 0) {
            const e = new Error('Invalid input');
            e.data = errors;
            e.status = 422;
            throw e;
        }

        try {
            const post = await Post.findById(id).populate('creator');
            if (post == null) {
                const e = new Error('Post does not exist');
                e.code = 404;
                throw e;
            }

            if (req.userId !== post.creator._id.toString()) {
                const e = new Error('Not authorized');
                e.code = 403;
                throw e;
            }

            post.title = title;
            post.content = content;
            if (imageUrl !== 'undefined') {
                // if (post.imageUrl !== imageUrl) {
                //     await clearImage(post.imageUrl);
                // }

                post.imageUrl = imageUrl;
            }
            await post.save();

            return {
                ...post._doc,
                _id: post._id.toString(),
                createdAt: post.createdAt.toISOString(),
                updatedAt: post.updatedAt.toISOString(),
            };
        } catch (e) {
            console.error(e);
            const err = Error('Failed to update post', {
                cause: e,
            });
            err.status = 400;
            throw err;
        }
    },

    deletePost: async ({ postId }, req) => {
        if (!req.isAuth) {
            const e = new Error('Not authenticated!');
            e.status = 401;
            throw e;
        }

        try {
            const post = await Post.findById(postId);
            if (post == null) {
                const e = new Error('Post does not exist');
                e.code = 404;
                throw e;
            }

            if (req.userId !== post.creator.toString()) {
                const e = new Error('Not authorized');
                e.code = 403;
                throw e;
            }

            // await clearImage(post.imageUrl);

            await Post.findByIdAndDelete(postId);

            const user = await User.findById(req.userId);

            user.posts.pull(postId);
            await user.save();

            return true;
        } catch (e) {
            console.error(e);
            const err = Error('Failed to delete post', {
                cause: e,
            });
            err.status = 400;
            throw err;
        }
    },

    user: async (args, req) => {
        if (!req.isAuth) {
            const e = new Error('Not authenticated!');
            e.status = 404;
            throw e;
        }

        const user = await User.findById(req.userId);

        return { ...user._doc, _id: user._id.toString() };
    },

    updateStatus: async ({ status }, req) => {
        if (!req.isAuth) {
            const e = new Error('Not authenticated!');
            e.status = 404;
            throw e;
        }

        try {
            const user = await User.findById(req.userId);
            user.status = status;
            await user.save();

            return { ...user._doc, _id: user._id.toString() };
        } catch (e) {
            console.error(e);
            const err = new Error('Failed to update user staatus', {
                cause: e,
            });
            err.status = 400;
            throw err;
        }
    },
};
