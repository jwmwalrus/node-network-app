import { Router } from 'express';
import { body } from 'express-validator';

import {
    getPost,
    getPosts,
    createPost,
    updatePost,
    deletePost,
} from '../controllers/feeds.js';
import isAuth from '../middleware/is-auth.js';

const router = Router();

const titleValidator = body('title').trim().isLength({ min: 5 });
const contentValidator = body('content').trim().isLength({ min: 5 });

router.get('/posts', isAuth, getPosts);
router.post('/posts', isAuth, [titleValidator, contentValidator], createPost);
router.get('/posts/:postId', isAuth, getPost);
router.put(
    '/posts/:postId',
    [titleValidator, contentValidator],
    isAuth,
    updatePost,
);
router.delete('/posts/:postId', isAuth, deletePost);

export default router;
