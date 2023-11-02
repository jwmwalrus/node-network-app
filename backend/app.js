import { createServer } from 'http';
import { resolve, basename, extname } from 'path';

import express from 'express';
import dotenv from 'dotenv-flow';
import bodyParser from 'body-parser';
import multer from 'multer';

import { connect } from 'mongoose';

import socket from './socket.js';
import feedRoutes from './routes/feeds.js';
import authRoutes from './routes/auth.js';

import AppError from './middleware/errors.js';

dotenv.config();

const app = express();

const storageEngine = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './images');
    },
    filename: (req, file, cb) => {
        const ext = extname(file.originalname);
        const bn = basename(file.originalname, ext);
        const now = new Date();
        const ts = '-' + now.getTime().toString();
        cb(null, bn + ts + ext);
    },
});

const fileFilter = (req, file, cb) => {
    cb(null, ['image/png', 'image/jpg', 'image/jpeg'].includes(file.mimetype));
};

app.use(bodyParser.json());

app.use(multer({ storage: storageEngine, fileFilter }).single('image'));

app.use('/image', express.static(resolve('images')));
app.use(express.static(resolve('public')));

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, PATCH, DELETE',
    );
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization',
    );
    next();
});
app.use('/feed', feedRoutes);
app.use('/auth', authRoutes);

app.use((error, req, res, next) => {
    // console.error(error);
    if (error instanceof AppError) {
        return error.send(res);
    }

    const e = new AppError(error.message, { code: error.code, cause: error });
    return e.send(res);
});

export default app;

try {
    await connect(process.env.MONGODB_URI);

    const server = createServer(app);

    const io = socket.init(server);
    io.on('connection', (client) => {
        console.info('Client connected');
    });

    server.listen(8080);
} catch (e) {
    console.error(e);
}
