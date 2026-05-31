import {findUserByEmail,findUserByUsername, createUserWithAuth} from './auth.repository.js';

export const register = async ({ user_name, email, passwordHash, publicKey, encryptedPrivateKey }) => {
    const existingUserByEmail = await findUserByEmail(email);
    if (existingUserByEmail) {
        throw new Error('Email already in use');
    }

    const existingUserByUsername = await findUserByUsername(user_name);
    if (existingUserByUsername) {
        throw new Error('Username already in use');
    }

    const user = await createUserWithAuth({ username: user_name, email, passwordHash, publicKey, encryptedPrivateKey });
    return user;
};

import { findUserAuthDetailsByEmail, createDeviceSession } from './auth.repository.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export const login = async ({ email, passwordHash, deviceName, ipAddress }) => {
    const userAuth = await findUserAuthDetailsByEmail(email);
    
    if (!userAuth) {
        throw new Error('Invalid email or password');
    }

    // Direct comparison because hashing is offloaded to the client
    if (userAuth.password_hash !== passwordHash) {
        throw new Error('Invalid email or password');
    }

    const { id: userId, username, public_key, encrypted_private_key } = userAuth;

    const accessToken = jwt.sign(
        { userId, username },
        process.env.JWT_SECRET || 'secret-key',
        { expiresIn: '15m' }
    );

    const refreshToken = crypto.randomBytes(40).toString('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days refresh 

    await createDeviceSession({
        user_id: userId,
        device_name: deviceName || 'Unknown Device',
        ip_address: ipAddress || 'Unknown IP',
        refresh_token_hash: refreshTokenHash,
        expires_at: expiresAt
    });

    return {
        accessToken,
        refreshToken,
        publicKey: public_key,
        encryptedPrivateKey: encrypted_private_key,
        user: { id: userId, username, email }
    };
};
