import * as messageRepository from "./message.repository.js";

export const saveMessage = async ({
  chatId,
  senderId,
  messageType,
  ciphertext,
  mediaUrl,
  replyTo,
  status = "sent"
}) => {
  const connection = await messageRepository.getConnectionParticipants(chatId);
  if (!connection) {
    throw new Error("Chat connection not found");
  }

  if (connection.status !== "accepted") {
    throw new Error("Cannot send messages in an unaccepted connection");
  }

  if (connection.user1_id !== senderId && connection.user2_id !== senderId) {
    throw new Error("You are not a participant in this chat");
  }

  return messageRepository.createMessage({
    chatId,
    senderId,
    messageType,
    encryptedContent: ciphertext,
    mediaUrl,
    replyTo,
    status
  });
};

export const getHistory = async (chatId, userId) => {
  const connection = await messageRepository.getConnectionParticipants(chatId);
  if (!connection) {
    throw new Error("Chat connection not found");
  }

  if (connection.status !== "accepted") {
    throw new Error("Cannot fetch messages for an unaccepted connection");
  }

  if (connection.user1_id !== userId && connection.user2_id !== userId) {
    throw new Error("You are not authorized to view messages in this chat");
  }

  return messageRepository.getChatMessages(chatId);
};

export const markChatAsRead = async (chatId, userId) => {
  const connection = await messageRepository.getConnectionParticipants(chatId);
  if (!connection) {
    throw new Error("Chat connection not found");
  }

  if (connection.user1_id !== userId && connection.user2_id !== userId) {
    throw new Error("You are not authorized to access this chat");
  }

  return messageRepository.updateMessagesStatus(chatId, userId, "read");
};

export const verifyMembership = async (chatId, userId) => {
  const connection = await messageRepository.getConnectionParticipants(chatId);
  if (!connection) return null;
  if (connection.user1_id !== userId && connection.user2_id !== userId) return null;
  return connection;
};

export const editMessage = async (messageId, senderId, ciphertext) => {
  const msg = await messageRepository.getMessageById(messageId);
  if (!msg) {
    throw new Error("Message not found");
  }

  const connection = await messageRepository.getConnectionParticipants(msg.chat_id);
  if (!connection) {
    throw new Error("Chat connection not found");
  }

  if (msg.sender_id !== senderId) {
    throw new Error("Unauthorized: You can only edit your own messages");
  }

  return messageRepository.editMessage(messageId, senderId, ciphertext);
};

export const deleteMessage = async (messageId, senderId) => {
  const msg = await messageRepository.getMessageById(messageId);
  if (!msg) {
    throw new Error("Message not found");
  }

  const connection = await messageRepository.getConnectionParticipants(msg.chat_id);
  if (!connection) {
    throw new Error("Chat connection not found");
  }

  if (msg.sender_id !== senderId) {
    throw new Error("Unauthorized: You can only delete your own messages");
  }

  return messageRepository.deleteMessage(messageId, senderId);
};

export const toggleReaction = async (messageId, userId, emoji) => {
  const msg = await messageRepository.getMessageById(messageId);
  if (!msg) {
    throw new Error("Message not found");
  }

  const connection = await messageRepository.getConnectionParticipants(msg.chat_id);
  if (!connection) {
    throw new Error("Chat connection not found");
  }

  if (connection.user1_id !== userId && connection.user2_id !== userId) {
    throw new Error("Unauthorized: You are not a participant in this chat");
  }

  const result = await messageRepository.toggleReaction(messageId, userId, emoji);
  return { ...result, chatId: msg.chat_id };
};

