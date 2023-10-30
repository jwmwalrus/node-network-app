import jwt from 'jsonwebtoken';

const auth = (req, res, next) => {
    const authorization = req.get('Authorization');

    req.isAuth = false;

    if (!authorization) {
        return next();
    }

    const token = authorization.split(' ')[1];
    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
        return next();
    }

    if (decoded == null) {
        return next();
    }

    req.userId = decoded.userId;
    req.isAuth = true;
    next();
};

export default auth;
