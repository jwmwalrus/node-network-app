import { join, resolve } from 'path';
import { unlink } from 'fs/promises';

import { validationResult } from 'express-validator';

import Post from '../models/post.js';
import User from '../models/user.js';
import AppError from '../middleware/errors.js';

const ITEMS_PER_PAGE = 2;
const dummyImage = '/image/dummy.png';

export const getPost = async (req, res, next) => {
    const { postId } = req.params;
    try {
        const post = await Post.findById(req.params.postId).populate('creator');
        if (post == null) {
            throw new Error('Post not found');
        }

        res.status(200).json({ post });
    } catch (e) {
        next(
            new AppError('Failed to get post by _id', { code: 404, cause: e }),
            req,
            res,
        );
    }
};

export const getPosts = async (req, res, next) => {
    const { page } = req.query;
    const currentPage = page == null ? 1 : Number(page);
    try {
        let posts = [];
        const totalItems = await Post.find().count();
        if (totalItems > 0) {
            posts = await Post.find()
                .skip((currentPage - 1) * ITEMS_PER_PAGE)
                .limit(ITEMS_PER_PAGE)
                .populate('creator');
        }

        let totalPages = Math.floor(totalItems / ITEMS_PER_PAGE);
        totalPages += totalItems % ITEMS_PER_PAGE > 0 ? 1 : 0;
        totalPages = totalPages > 0 ? totalPages : 1;

        res.status(200).json({ posts, currentPage, totalPages, totalItems });
    } catch (e) {
        next(new AppError('Failed to get posts', { cause: e }), req, res);
    }
};

export const createPost = async (req, res, next) => {
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

    const { title, content } = req.body;

    try {
        const { file } = req;
        if (file == null) {
            throw new Error('Missing file entry in upload');
        }

        const imageUrl =
            file?.path.replace(/^images\//, '/image/') ?? dummyImage;

        const user = await User.findById(req.userId);

        const post = await Post.create({
            title,
            content,
            imageUrl,
            creator: user._id,
        });
        await post.save();

        user.posts.push(post);
        await user.save();

        res.status(201).json({
            post,
            creator: { _id: user._id, name: user.name },
        });
    } catch (e) {
        next(new AppError('Failed to create post', { cause: e }), req, res);
    }
};

export const updatePost = async (req, res, next) => {
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

    const { postId } = req.params;
    const { title, content } = req.body;

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

        let imageUrl = req.body.image;

        const { file } = req;
        if (file != null) {
            imageUrl = file?.path.replace(/^images\//, '/image/') ?? dummyImage;
        }

        if (!imageUrl) {
            throw new Error('No file picked');
        }

        if (post.imageUrl !== imageUrl) {
            await clearImage(post.imageUrl);
        }

        post.title = title;
        post.content = content;
        post.imageUrl = imageUrl;
        await post.save();

        res.status(200).json({ post });
    } catch (e) {
        next(
            new AppError('Failed to update post', { cause: e, code: e.code }),
            req,
            res,
        );
    }
};

export const deletePost = async (req, res, next) => {
    const { postId } = req.params;

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

        await clearImage(post.imageUrl);

        await Post.findByIdAndDelete(postId);

        const user = await User.findById(req.userId);

        user.posts.pull(postId);
        await user.save();

        res.status(204);
    } catch (e) {
        next(
            new AppError('Failed to delete post', { cause: e, code: e.code }),
            req,
            res,
        );
    }
};

const clearImage = async (image) => {
    if (image === dummyImage) {
        return;
    }

    const path = join(resolve('images'), image.replace(/^\/image\//, ''));
    await unlink(path);
};
