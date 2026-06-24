import { z } from "zod";

export const groupCreateSchema = z.object({
  groupName: z.string().min(1, { message: "Group name is required" }).max(20, { message: "Group name cannot exceed 20 characters" }),
  description: z.string().optional().nullable(),
  encryptedGroupKey: z.string().min(1, { message: "Encrypted group key is required for E2EE" }),
});

export const memberAddSchema = z.object({
  userId: z.string().uuid({ message: "Invalid user ID format" }),
  encryptedGroupKey: z.string().min(1, { message: "Encrypted group key is required for E2EE" }),
});

export const memberRemoveSchema = z.object({
  userId: z.string().uuid({ message: "Invalid user ID format" }),
  rotatedKeys: z.array(
    z.object({
      userId: z.string().uuid({ message: "Invalid user ID format in rotated keys" }),
      encryptedGroupKey: z.string().min(1, { message: "Encrypted group key is required in rotated keys" }),
    })
  ),
});

export const roleChangeSchema = z.object({
  userId: z.string().uuid({ message: "Invalid user ID format" }),
  role: z.enum(["admin", "member"], { message: "Invalid group role" }),
});

export const groupMessageSendSchema = z.object({
  groupId: z.string().uuid({ message: "Invalid group ID format" }),
  ciphertext: z.string().min(1, { message: "Message content cannot be empty" }),
  messageType: z.enum(["text", "media"], { message: "Invalid message type" }),
  mediaUrl: z.string().url({ message: "Invalid media URL format" }).optional().nullable(),
  replyTo: z.string().uuid({ message: "Invalid reply_to UUID format" }).optional().nullable(),
});

export const groupMessageEditSchema = z.object({
  messageId: z.string().uuid({ message: "Invalid message ID format" }),
  ciphertext: z.string().min(1, { message: "Message content cannot be empty" }),
});

export const groupMessageDeleteSchema = z.object({
  messageId: z.string().uuid({ message: "Invalid message ID format" }),
});

export const groupMessageReactSchema = z.object({
  messageId: z.string().uuid({ message: "Invalid message ID format" }),
  emoji: z.string().min(1, { message: "Emoji cannot be empty" }),
});
