import * as messageService from "../../modules/messages/message.service.js";
import { 
  messageSendSchema, 
  messageReadSchema, 
  typingSchema,
  messageEditSchema,
  messageDeleteSchema,
  messageReactSchema
} from "../../modules/messages/message.validation.js";
import { onlineUsers } from "./presence.handler.js";

export const registerMessageHandlers = (
  io,
  socket
) => {

  socket.on(
    "message:send",
    async (payload, callback) => {
      try {
        const senderId = socket.user.id;
        
        // Zod validation
        const parsed = messageSendSchema.safeParse(payload);
        if (!parsed.success) {
          throw new Error(parsed.error.errors[0]?.message || "Invalid payload");
        }

        const { chatId, ciphertext, messageType, mediaUrl, replyTo } = parsed.data;

        // Verify sender is part of this connection and get connection details
        const connection = await messageService.verifyMembership(chatId, senderId);
        if (!connection) {
          throw new Error("Unauthorized: You are not a participant in this chat");
        }

        const peerId = connection.user1_id === senderId ? connection.user2_id : connection.user1_id;

        // Check if recipient is online to set message status
        const peerSockets = onlineUsers.get(peerId);
        const isPeerOnline = peerSockets && peerSockets.size > 0;
        const initialStatus = isPeerOnline ? "delivered" : "sent";

        // Save to DB
        const msg = await messageService.saveMessage({
          chatId,
          senderId,
          messageType,
          ciphertext,
          mediaUrl,
          replyTo,
          status: initialStatus
        });

        const msgPayload = {
          messageId: msg.message_id,
          chatId: msg.chat_id,
          senderId: msg.sender_id,
          messageType: msg.message_type,
          ciphertext: msg.encrypted_content,
          mediaUrl: msg.media_url,
          replyTo: msg.reply_to,
          status: msg.status,
          createdAt: msg.created_at
        };

        // Emit message to online recipient sockets
        if (isPeerOnline) {
          peerSockets.forEach(socketId => {
            io.to(socketId).emit("message:received", msgPayload);
          });
        }

        // Emit message to sender's other open sockets (for sync)
        const senderSockets = onlineUsers.get(senderId);
        if (senderSockets) {
          senderSockets.forEach(socketId => {
            if (socketId !== socket.id) {
              io.to(socketId).emit("message:received", msgPayload);
            }
          });
        }

        if (typeof callback === "function") {
          callback({
            success: true,
            message: msgPayload
          });
        }
      } catch (error) {
        console.error("Socket message:send error:", error);
        if (typeof callback === "function") {
          callback({
            success: false,
            error: error.message || "Failed to send message"
          });
        }
      }
    }
  );

  socket.on(
    "message:read",
    async (payload, callback) => {
      try {
        const userId = socket.user.id;

        // Zod validation
        const parsed = messageReadSchema.safeParse(payload);
        if (!parsed.success) {
          throw new Error(parsed.error.errors[0]?.message || "Invalid payload");
        }

        const { chatId } = parsed.data;

        // Verify membership and get peer ID
        const connection = await messageService.verifyMembership(chatId, userId);
        if (!connection) {
          throw new Error("Unauthorized: You are not a participant in this chat");
        }

        const peerId = connection.user1_id === userId ? connection.user2_id : connection.user1_id;

        // Mark messages as read in DB
        await messageService.markChatAsRead(chatId, userId);

        // Notify peer's online sockets
        const peerSockets = onlineUsers.get(peerId);
        if (peerSockets) {
          peerSockets.forEach(socketId => {
            io.to(socketId).emit("message:read", {
              chatId,
              readBy: userId
            });
          });
        }

        if (typeof callback === "function") {
          callback({ success: true });
        }
      } catch (error) {
        console.error("Socket message:read error:", error);
        if (typeof callback === "function") {
          callback({
            success: false,
            error: error.message || "Failed to mark messages as read"
          });
        }
      }
    }
  );

  socket.on(
    "typing:start",
    async (payload) => {
      try {
        const userId = socket.user.id;
        
        const parsed = typingSchema.safeParse(payload);
        if (!parsed.success) return;

        const { chatId } = parsed.data;

        const connection = await messageService.verifyMembership(chatId, userId);
        if (!connection) return;

        const peerId = connection.user1_id === userId ? connection.user2_id : connection.user1_id;

        // Notify peer's online sockets
        const peerSockets = onlineUsers.get(peerId);
        if (peerSockets) {
          peerSockets.forEach(socketId => {
            io.to(socketId).emit("typing:start", {
              chatId,
              userId,
              username: socket.user.username
            });
          });
        }
      } catch (error) {
        console.error("Socket typing:start error:", error);
      }
    }
  );

  socket.on(
    "typing:stop",
    async (payload) => {
      try {
        const userId = socket.user.id;

        const parsed = typingSchema.safeParse(payload);
        if (!parsed.success) return;

        const { chatId } = parsed.data;

        const connection = await messageService.verifyMembership(chatId, userId);
        if (!connection) return;

        const peerId = connection.user1_id === userId ? connection.user2_id : connection.user1_id;

        // Notify peer's online sockets
        const peerSockets = onlineUsers.get(peerId);
        if (peerSockets) {
          peerSockets.forEach(socketId => {
            io.to(socketId).emit("typing:stop", {
              chatId,
              userId
            });
          });
        }
      } catch (error) {
        console.error("Socket typing:stop error:", error);
      }
    }
  );

  socket.on(
    "message:edit",
    async (payload, callback) => {
      try {
        const senderId = socket.user.id;
        
        const parsed = messageEditSchema.safeParse(payload);
        if (!parsed.success) {
          throw new Error(parsed.error.errors[0]?.message || "Invalid payload");
        }

        const { messageId, ciphertext } = parsed.data;

        const updated = await messageService.editMessage(messageId, senderId, ciphertext);
        if (!updated) {
          throw new Error("Failed to edit message");
        }

        const connection = await messageService.verifyMembership(updated.chat_id, senderId);
        if (!connection) {
          throw new Error("Unauthorized");
        }
        const peerId = connection.user1_id === senderId ? connection.user2_id : connection.user1_id;

        const editPayload = {
          messageId: updated.message_id,
          chatId: updated.chat_id,
          senderId: updated.sender_id,
          ciphertext: updated.encrypted_content,
          edited: updated.edited,
          editedAt: updated.edited_at
        };

        // Emit to peer sockets
        const peerSockets = onlineUsers.get(peerId);
        if (peerSockets) {
          peerSockets.forEach(socketId => {
            io.to(socketId).emit("message:edited", editPayload);
          });
        }

        // Emit to sender's other sockets (sync)
        const senderSockets = onlineUsers.get(senderId);
        if (senderSockets) {
          senderSockets.forEach(socketId => {
            if (socketId !== socket.id) {
              io.to(socketId).emit("message:edited", editPayload);
            }
          });
        }

        if (typeof callback === "function") {
          callback({
            success: true,
            message: editPayload
          });
        }
      } catch (error) {
        console.error("Socket message:edit error:", error);
        if (typeof callback === "function") {
          callback({
            success: false,
            error: error.message || "Failed to edit message"
          });
        }
      }
    }
  );

  socket.on(
    "message:delete",
    async (payload, callback) => {
      try {
        const senderId = socket.user.id;

        const parsed = messageDeleteSchema.safeParse(payload);
        if (!parsed.success) {
          throw new Error(parsed.error.errors[0]?.message || "Invalid payload");
        }

        const { messageId } = parsed.data;

        const deleted = await messageService.deleteMessage(messageId, senderId);
        if (!deleted) {
          throw new Error("Failed to delete message");
        }

        const connection = await messageService.verifyMembership(deleted.chat_id, senderId);
        if (!connection) {
          throw new Error("Unauthorized");
        }
        const peerId = connection.user1_id === senderId ? connection.user2_id : connection.user1_id;

        const deletePayload = {
          messageId: deleted.message_id,
          chatId: deleted.chat_id,
          senderId: deleted.sender_id,
          deletedAt: deleted.deleted_at
        };

        // Emit to peer sockets
        const peerSockets = onlineUsers.get(peerId);
        if (peerSockets) {
          peerSockets.forEach(socketId => {
            io.to(socketId).emit("message:deleted", deletePayload);
          });
        }

        // Emit to sender's other sockets (sync)
        const senderSockets = onlineUsers.get(senderId);
        if (senderSockets) {
          senderSockets.forEach(socketId => {
            if (socketId !== socket.id) {
              io.to(socketId).emit("message:deleted", deletePayload);
            }
          });
        }

        if (typeof callback === "function") {
          callback({
            success: true,
            message: deletePayload
          });
        }
      } catch (error) {
        console.error("Socket message:delete error:", error);
        if (typeof callback === "function") {
          callback({
            success: false,
            error: error.message || "Failed to delete message"
          });
        }
      }
    }
  );

  socket.on(
    "message:react",
    async (payload, callback) => {
      try {
        const userId = socket.user.id;

        const parsed = messageReactSchema.safeParse(payload);
        if (!parsed.success) {
          throw new Error(parsed.error.errors[0]?.message || "Invalid payload");
        }

        const { messageId, emoji } = parsed.data;

        const result = await messageService.toggleReaction(messageId, userId, emoji);

        const connection = await messageService.verifyMembership(result.chatId, userId);
        if (!connection) {
          throw new Error("Unauthorized");
        }
        const peerId = connection.user1_id === userId ? connection.user2_id : connection.user1_id;

        const reactPayload = {
          messageId,
          chatId: result.chatId,
          userId,
          action: result.action,
          reaction: result.reaction,
          emoji
        };

        // Emit to peer sockets
        const peerSockets = onlineUsers.get(peerId);
        if (peerSockets) {
          peerSockets.forEach(socketId => {
            io.to(socketId).emit("message:reacted", reactPayload);
          });
        }

        // Emit to sender's other sockets (sync)
        const senderSockets = onlineUsers.get(userId);
        if (senderSockets) {
          senderSockets.forEach(socketId => {
            if (socketId !== socket.id) {
              io.to(socketId).emit("message:reacted", reactPayload);
            }
          });
        }

        if (typeof callback === "function") {
          callback({
            success: true,
            ...reactPayload
          });
        }
      } catch (error) {
        console.error("Socket message:react error:", error);
        if (typeof callback === "function") {
          callback({
            success: false,
            error: error.message || "Failed to react to message"
          });
        }
      }
    }
  );
};