import argon2, { argon2id } from 'argon2';

const hash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost:65536,
    timeCost: 3,
    parallelism: 4,
});

const valid = await argon2.verify(storedHash,password);
