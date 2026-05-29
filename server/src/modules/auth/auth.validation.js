import { z } from "zod";

export const registerSchema = z.object({
  user_name: z.string().min(3).max(30),
  email: z.email(),
  passwordHash: z.string().min(1),
  publicKey: z.string().min(1),
  encryptedPrivateKey: z.string().min(1)
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1)
});