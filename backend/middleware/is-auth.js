import jwt from 'jsonwebtoken';

const isAuth = (req, res, next) => {
    const authorization = req.get('Authorization');
    if (!authorization) {
        const e = new Error('Not authenticated');
        e.code = 401;
        throw e;
    }

    const token = authorization.split(' ')[1];
    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
        e.code = 500;
        throw e;
    }

    if (decoded == null) {
        const e = new Error('Invalid token');
        e.code = 401;
        throw e;
    }

    req.userId = decoded.userId;
    next();
};

export default isAuth;
