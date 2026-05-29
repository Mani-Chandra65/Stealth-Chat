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
