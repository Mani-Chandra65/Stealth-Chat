import { db } from '../../db/postgresSQL/index.js';
import { and, eq } from 'drizzle-orm';
import { auth, users, publicKeys, deviceSessions } from '../../db/postgresSQL/schema/index.js';

export const findUserByEmail = async (email) => {
    const user = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.email, email)
    });
    return user;
};

export const findUserByUsername = async (username) => {
    const user = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.username, username)
    });
    return user;
}

export const createUserWithAuth = async ({
    username,
    email,
    passwordHash,
    publicKey,
    encryptedPrivateKey
}) => {
    return db.transaction(async (tx) => {
        const [user] = await tx.insert(users).values({
            username,
            email,
        }).returning();

        await tx.insert(auth).values({
            user_id: user.id,
            password_hash: passwordHash
        });
        
        await tx.insert(publicKeys).values({
            user_id: user.id,
            public_key: publicKey,
            encrypted_private_key: encryptedPrivateKey
        });
        return user;
    });
};
export const findUserAuthDetailsByEmail = async (email) => {
    const result = await db.select({
        id: users.id,
        username: users.username,
        email: users.email,
        is_deleted: users.isDeleted,
        password_hash: auth.password_hash,
        public_key: publicKeys.public_key,
        encrypted_private_key: publicKeys.encrypted_private_key
    })
    .from(users)
    .innerJoin(auth, eq(users.id, auth.user_id))
    .innerJoin(publicKeys, eq(users.id, publicKeys.user_id))
    .where(and(eq(users.email, email), eq(users.isDeleted, false)))
    .limit(1);
    
    return result[0];
};

export const createDeviceSession = async ({ user_id, device_name, ip_address, refresh_token_hash, expires_at }) => {
    const [session] = await db.insert(deviceSessions).values({
        user_id,
        device_name,
        ip_address,
        refresh_token_hash,
        expires_at
    }).returning();
    return session;
};

export const findDeviceSessionByHash = async (hash) => {
    const session = await db.query.deviceSessions.findFirst({
        where: (deviceSessions, { and, eq, isNull }) => and(
            eq(deviceSessions.refresh_token_hash, hash),
            isNull(deviceSessions.revoked_at)
        )
    });
    return session;
};

export const deleteDeviceSession = async (hash) => {
    await db.delete(deviceSessions).where(eq(deviceSessions.refresh_token_hash, hash));
};

export const findUserById = async (id) => {
    const user = await db.query.users.findFirst({
        where: (users, { and, eq }) => and(eq(users.id, id), eq(users.isDeleted, false))
    });
    return user;
};
