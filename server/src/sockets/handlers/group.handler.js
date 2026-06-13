import * as groupService from "../../modules/groups/group.service.js";
import {
  groupMessageSendSchema,
  groupMessageEditSchema,
  groupMessageDeleteSchema,
  groupMessageReactSchema,
  groupCreateSchema,
  memberAddSchema,
  memberRemoveSchema,
  roleChangeSchema
} from "../../modules/groups/group.validation.js";
import { onlineUsers } from "./presence.handler.js";

export const registerGroupHandlers = (io, socket) => {
  // Join all group rooms the user belongs to when they connect
  const joinUserGroups = async () => {
    try {
      const userId = socket.user.id;
      const list = await groupService.getGroups(userId);
      list.forEach((g) => {
        socket.join(`group:${g.groupId}`);
      });
    } catch (error) {
      console.error("Error joining group rooms:", error);
    }
  };

  joinUserGroups();

  socket.on("group:message-send", async (payload, callback) => {
    try {
      const senderId = socket.user.id;
      const parsed = groupMessageSendSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error(parsed.error.errors[0]?.message || "Invalid payload");
      }

      const { groupId, ciphertext, messageType, mediaUrl, replyTo } = parsed.data;

      // Save to database
      const msg = await groupService.saveGroupMessage(
        groupId,
        senderId,
        messageType,
        ciphertext,
        mediaUrl,
        replyTo
      );

      const msgPayload = {
        messageId: msg.message_id,
        groupId: msg.group_id,
        senderId: msg.sender_id,
        senderUsername: socket.user.username,
        messageType: msg.message_type,
        ciphertext: msg.encrypted_content,
        mediaUrl: msg.media_url,
        replyTo: msg.reply_to,
        edited: msg.edited,
        createdAt: msg.created_at,
        reactions: []
      };

      // Broadcast message to room
      io.to(`group:${groupId}`).emit("group:message-received", msgPayload);

      if (typeof callback === "function") {
        callback({ success: true, message: msgPayload });
      }
    } catch (error) {
      console.error("Socket group:message-send error:", error);
      if (typeof callback === "function") {
        callback({ success: false, error: error.message || "Failed to send message" });
      }
    }
  });

  socket.on("group:message-edit", async (payload, callback) => {
    try {
      const senderId = socket.user.id;
      const parsed = groupMessageEditSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error(parsed.error.errors[0]?.message || "Invalid payload");
      }

      const { messageId, ciphertext } = parsed.data;

      const updated = await groupService.editMessage(messageId, senderId, ciphertext);
      if (!updated) {
        throw new Error("Failed to edit message");
      }

      const editPayload = {
        messageId: updated.message_id,
        groupId: updated.group_id,
        senderId: updated.sender_id,
        ciphertext: updated.encrypted_content,
        edited: updated.edited,
        editedAt: updated.edited_at
      };

      io.to(`group:${updated.group_id}`).emit("group:message-edited", editPayload);

      if (typeof callback === "function") {
        callback({ success: true, message: editPayload });
      }
    } catch (error) {
      console.error("Socket group:message-edit error:", error);
      if (typeof callback === "function") {
        callback({ success: false, error: error.message || "Failed to edit message" });
      }
    }
  });

  socket.on("group:message-delete", async (payload, callback) => {
    try {
      const senderId = socket.user.id;
      const parsed = groupMessageDeleteSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error(parsed.error.errors[0]?.message || "Invalid payload");
      }

      const { messageId } = parsed.data;

      const deleted = await groupService.deleteMessage(messageId, senderId);
      if (!deleted) {
        throw new Error("Failed to delete message");
      }

      const deletePayload = {
        messageId: deleted.message_id,
        groupId: deleted.group_id,
        senderId: deleted.sender_id,
        deletedAt: deleted.deleted_at
      };

      io.to(`group:${deleted.group_id}`).emit("group:message-deleted", deletePayload);

      if (typeof callback === "function") {
        callback({ success: true, message: deletePayload });
      }
    } catch (error) {
      console.error("Socket group:message-delete error:", error);
      if (typeof callback === "function") {
        callback({ success: false, error: error.message || "Failed to delete message" });
      }
    }
  });

  socket.on("group:message-react", async (payload, callback) => {
    try {
      const userId = socket.user.id;
      const parsed = groupMessageReactSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error(parsed.error.errors[0]?.message || "Invalid payload");
      }

      const { messageId, emoji } = parsed.data;

      const result = await groupService.toggleReaction(messageId, userId, emoji);

      const reactPayload = {
        messageId,
        groupId: result.groupId,
        userId,
        action: result.action,
        reaction: result.reaction,
        emoji
      };

      io.to(`group:${result.groupId}`).emit("group:message-reacted", reactPayload);

      if (typeof callback === "function") {
        callback({ success: true, ...reactPayload });
      }
    } catch (error) {
      console.error("Socket group:message-react error:", error);
      if (typeof callback === "function") {
        callback({ success: false, error: error.message || "Failed to toggle reaction" });
      }
    }
  });

  socket.on("group:typing-start", async (payload) => {
    try {
      const userId = socket.user.id;
      const { groupId } = payload;
      if (!groupId) return;

      const member = await groupService.verifyMembership(groupId, userId);
      if (!member) return;

      socket.to(`group:${groupId}`).emit("group:typing-start", {
        groupId,
        userId,
        username: socket.user.username
      });
    } catch (error) {
      console.error("Socket group:typing-start error:", error);
    }
  });

  socket.on("group:typing-stop", async (payload) => {
    try {
      const userId = socket.user.id;
      const { groupId } = payload;
      if (!groupId) return;

      const member = await groupService.verifyMembership(groupId, userId);
      if (!member) return;

      socket.to(`group:${groupId}`).emit("group:typing-stop", {
        groupId,
        userId
      });
    } catch (error) {
      console.error("Socket group:typing-stop error:", error);
    }
  });

  // Dynamic membership events for real-time key synchronization and room updates
  socket.on("group:create", async (payload, callback) => {
    try {
      const creatorId = socket.user.id;
      const parsed = groupCreateSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error(parsed.error.errors[0]?.message || "Invalid payload");
      }

      const { groupName, description, encryptedGroupKey } = parsed.data;

      const group = await groupService.createGroup(
        creatorId,
        groupName,
        description,
        encryptedGroupKey
      );

      socket.join(`group:${group.group_id}`);

      if (typeof callback === "function") {
        callback({ success: true, group });
      }
    } catch (error) {
      console.error("Socket group:create error:", error);
      if (typeof callback === "function") {
        callback({ success: false, error: error.message || "Failed to create group" });
      }
    }
  });

  socket.on("group:member-add", async (payload, callback) => {
    try {
      const callerId = socket.user.id;
      const { groupId } = payload;
      const parsed = memberAddSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error(parsed.error.errors[0]?.message || "Invalid payload");
      }

      const { userId, encryptedGroupKey } = parsed.data;

      const inserted = await groupService.addMember(
        groupId,
        callerId,
        userId,
        encryptedGroupKey
      );

      // Make new member's active sockets join the group room
      const memberSockets = onlineUsers.get(userId);
      if (memberSockets) {
        memberSockets.forEach((socketId) => {
          const s = io.sockets.sockets.get(socketId);
          if (s) {
            s.join(`group:${groupId}`);
          }
        });
      }

      const groupDetail = await groupService.verifyMembership(groupId, userId);

      // Emit member joined notification to room
      io.to(`group:${groupId}`).emit("group:member-added", {
        groupId,
        member: {
          userId: inserted.user_id,
          role: inserted.role,
          encryptedGroupKey: inserted.encrypted_group_key,
          joinedAt: inserted.joined_at
        }
      });

      if (typeof callback === "function") {
        callback({ success: true, member: inserted });
      }
    } catch (error) {
      console.error("Socket group:member-add error:", error);
      if (typeof callback === "function") {
        callback({ success: false, error: error.message || "Failed to add member" });
      }
    }
  });

  socket.on("group:member-remove", async (payload, callback) => {
    try {
      const callerId = socket.user.id;
      const { groupId } = payload;
      const parsed = memberRemoveSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error(parsed.error.errors[0]?.message || "Invalid payload");
      }

      const { userId, rotatedKeys } = parsed.data;

      await groupService.removeMember(groupId, callerId, userId, rotatedKeys);

      // Notify the remaining room first so they receive the rotated keys
      io.to(`group:${groupId}`).emit("group:member-removed", {
        groupId,
        userId,
        rotatedKeys
      });

      // Make removed user's sockets leave the group room
      const memberSockets = onlineUsers.get(userId);
      if (memberSockets) {
        memberSockets.forEach((socketId) => {
          const s = io.sockets.sockets.get(socketId);
          if (s) {
            s.leave(`group:${groupId}`);
          }
        });
      }

      if (typeof callback === "function") {
        callback({ success: true });
      }
    } catch (error) {
      console.error("Socket group:member-remove error:", error);
      if (typeof callback === "function") {
        callback({ success: false, error: error.message || "Failed to remove member" });
      }
    }
  });

  socket.on("group:role-change", async (payload, callback) => {
    try {
      const callerId = socket.user.id;
      const { groupId } = payload;
      const parsed = roleChangeSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error(parsed.error.errors[0]?.message || "Invalid payload");
      }

      const { userId, role } = parsed.data;

      const updated = await groupService.changeRole(groupId, callerId, userId, role);

      io.to(`group:${groupId}`).emit("group:role-changed", {
        groupId,
        userId,
        role
      });

      if (typeof callback === "function") {
        callback({ success: true, member: updated });
      }
    } catch (error) {
      console.error("Socket group:role-change error:", error);
      if (typeof callback === "function") {
        callback({ success: false, error: error.message || "Failed to change role" });
      }
    }
  });
};
