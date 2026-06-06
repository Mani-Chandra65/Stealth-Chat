import jwt from 'jsonwebtoken';

export const generateToken = (payload, expiresIn = '15m') => {
    return jwt.sign(payload, process.env.JWT_SECRET || 'secret-key', { expiresIn });
};

export const verifyToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET || 'secret-key');
};