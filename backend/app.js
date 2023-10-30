import { createServer } from 'http';
import { resolve, basename, extname, join } from 'path';
import { unlink } from 'fs/promises';

import express from 'express';
import 'dotenv/config';
import bodyParser from 'body-parser';
import multer from 'multer';

import { connect } from 'mongoose';
import { graphqlHTTP } from 'express-graphql';

import AppError from './middleware/errors.js';
import graphqlSchema from './graphql/schema.js';
import graphqlResolvers from './graphql/resolvers.js';
import auth from './middleware/auth.js';

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
        'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    );
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization',
    );

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

const DUMMY_IMAGE = '/image/dummy.png';

const clearImage = async (image) => {
    if (image === DUMMY_IMAGE) {
        return;
    }

    const path = join(resolve('images'), image.replace(/^\/image\//, ''));
    await unlink(path);
};

app.use(auth);

app.put('/post-image', async (req, res, next) => {
    if (!req.isAuth) {
        const e = new Error('Not authenticated!');
        e.status = 401;
        throw e;
    }

    const { file } = req;
    if (file == null) {
        return res.status(200).send({ message: 'No file was provided' });
    }

    if (req.body.oldPath) {
        await clearImage(req.body.oldPath);
    }

    const filePath = file?.path.replace(/^images\//, '/image/') ?? DUMMY_IMAGE;
    return res.status(200).send({ filePath });
});

app.use(
    '/graphql',
    graphqlHTTP({
        schema: graphqlSchema,
        rootValue: graphqlResolvers,
        graphiql: true,
        customFormatErrorFn: (err) => {
            if (!err.originalError) {
                return err;
            }

            const message = err.message || 'An error occurred';
            const data = err.originalError.data;
            const status = err.originalError.code || 400;

            return { ...err, message, data, status };
        },
    }),
);

app.use((error, req, res, next) => {
    console.error(error);
    if (error instanceof AppError) {
        return error.send(res);
    }

    const e = new AppError(error.message, { code: error.code, cause: error });
    return e.send(res);
});

try {
    await connect(process.env.MONGODB_URI);

    const server = createServer(app);
    server.listen(8080);
} catch (e) {
    console.error(e);
}
