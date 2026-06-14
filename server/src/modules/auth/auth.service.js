import {findUserByEmail,findUserByUsername, createUserWithAuth} from './auth.repository.js';
import { db } from '../../db/postgresSQL/index.js';
import { users } from '../../db/postgresSQL/schema/users.js';
import { eq } from 'drizzle-orm';

const registrationConflict = (code, message) => {
    const error = new Error(message);
    error.code = code;
    return error;
};

export const register = async ({ user_name, email, passwordHash, publicKey, encryptedPrivateKey }) => {
    // Check if user exists (even if deleted)
    const existingUserByEmail = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.email, email)
    });
    if (existingUserByEmail) {
        if (existingUserByEmail.isDeleted) {
            throw registrationConflict(
                'EMAIL_DELETED',
                'This email is associated with a deleted account. Please contact support to restore it.'
            );
        }
        throw registrationConflict(
            'EMAIL_EXISTS',
            'A user with this email already exists. Contact the owner if you think this is a problem.'
        );
    }

    const existingUserByUsername = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.username, user_name)
    });
    if (existingUserByUsername) {
        if (existingUserByUsername.isDeleted) {
            throw registrationConflict(
                'USERNAME_DELETED',
                'This username is associated with a deleted account.'
            );
        }
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
    // Check if user exists (even if deleted)
    const userRecord = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.email, email)
    });

    if (!userRecord) {
        throw new Error('User does not exist');
    }

    if (userRecord.isDeleted) {
        throw new Error('This account has been deleted. Please contact support to restore it.');
    }

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
