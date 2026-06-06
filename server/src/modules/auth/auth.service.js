import {findUserByEmail,findUserByUsername, createUserWithAuth} from './auth.repository.js';

const registrationConflict = (code, message) => {
    const error = new Error(message);
    error.code = code;
    return error;
};

export const register = async ({ user_name, email, passwordHash, publicKey, encryptedPrivateKey }) => {
    const existingUserByEmail = await findUserByEmail(email);
    if (existingUserByEmail) {
        throw registrationConflict(
            'EMAIL_EXISTS',
            'A user with this email already exists. Contact the owner if you think this is a problem.'
        );
    }

    const existingUserByUsername = await findUserByUsername(user_name);
    if (existingUserByUsername) {
        throw registrationConflict(
            'USERNAME_EXISTS',
            'A user with this username already exists.'
        );
    }

    const user = await createUserWithAuth({ username: user_name, email, passwordHash, publicKey, encryptedPrivateKey });
    return user;
};

import { findUserAuthDetailsByEmail, createDeviceSession } from './auth.repository.js';
import { generateToken } from '../../services/jwt.service.js';
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

    const accessToken = generateToken({ userId, username });

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

import { findDeviceSessionByHash, deleteDeviceSession, findUserById } from './auth.repository.js';

export const refreshAuthToken = async (refreshToken) => {
    if (!refreshToken) throw new Error('No refresh token provided');

    // Hash the incoming token
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // Find session
    const session = await findDeviceSessionByHash(refreshTokenHash);
    
    if (!session) {
        throw new Error('Invalid or expired refresh token');
    }

    // Check expiration
    if (new Date(session.expires_at) < new Date()) {
        await deleteDeviceSession(refreshTokenHash);
        throw new Error('Refresh token expired');
    }

    // Get user
    const user = await findUserById(session.user_id);
    if (!user) {
        throw new Error('User not found');
    }

    // Sign new access token
    const accessToken = generateToken({ userId: user.id, username: user.username });

    return { 
        accessToken,
        user: { id: user.id, username: user.username, email: user.email }
    };
};

export const logout = async (refreshToken) => {
    if (refreshToken) {
        const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
        await deleteDeviceSession(refreshTokenHash);
    }
    return true;
};
