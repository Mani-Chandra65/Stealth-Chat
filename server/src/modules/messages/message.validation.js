import { z } from "zod";

export const messageSendSchema = z.object({
  chatId: z.string().uuid({ message: "Invalid chat_id format" }),
  ciphertext: z.string().min(1, { message: "Message content cannot be empty" }),
  messageType: z.enum(["text", "media"], { message: "Invalid message type" }),
  mediaUrl: z.string().url({ message: "Invalid media URL format" }).optional().nullable(),
  replyTo: z.string().uuid({ message: "Invalid reply_to UUID format" }).optional().nullable(),
});

export const messageReadSchema = z.object({
  chatId: z.string().uuid({ message: "Invalid chat_id format" }),
});

export const typingSchema = z.object({
  chatId: z.string().uuid({ message: "Invalid chat_id format" }),
});

export const messageEditSchema = z.object({
  messageId: z.string().uuid({ message: "Invalid messageId format" }),
  ciphertext: z.string().min(1, { message: "Message content cannot be empty" }),
});

export const messageDeleteSchema = z.object({
  messageId: z.string().uuid({ message: "Invalid messageId format" }),
});

export const messageReactSchema = z.object({
  messageId: z.string().uuid({ message: "Invalid messageId format" }),
  emoji: z.string().min(1, { message: "Emoji cannot be empty" }),
});

