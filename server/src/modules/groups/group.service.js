import * as groupRepository from "./group.repository.js";

export const createGroup = async (creatorId, groupName, description, encryptedGroupKey) => {
  return groupRepository.createGroup(creatorId, groupName, description, encryptedGroupKey);
};

export const addMember = async (groupId, callerId, newUserId, encryptedGroupKey) => {
  const caller = await groupRepository.getMemberDetails(groupId, callerId);
  if (!caller) {
    throw new Error("Unauthorized: You are not a member of this group");
  }

  if (caller.role !== "owner" && caller.role !== "admin") {
    throw new Error("Unauthorized: Only group owners or admins can add members");
  }

  const existingMember = await groupRepository.getMemberDetails(groupId, newUserId);
  if (existingMember) {
    throw new Error("User is already a member of this group");
  }

  // Retrieve group detail to check if rejoining user is the creator
  // (groupRepository.addGroupMember already handles creator recovery, but let's pass role properly)
  return groupRepository.addGroupMember(groupId, newUserId, "member", encryptedGroupKey);
};

export const removeMember = async (groupId, callerId, removeUserId, rotatedKeys) => {
  const caller = await groupRepository.getMemberDetails(groupId, callerId);
  if (!caller) {
    throw new Error("Unauthorized: You are not a member of this group");
  }

  const target = await groupRepository.getMemberDetails(groupId, removeUserId);
  if (!target) {
    throw new Error("User is not a member of this group");
  }

  // Check authorization
  const isLeaving = callerId === removeUserId;
  if (!isLeaving) {
    if (caller.role === "member") {
      throw new Error("Unauthorized: Members cannot remove others");
    }

    if (caller.role === "admin" && target.role === "owner") {
      throw new Error("Unauthorized: Admins cannot remove the group owner");
    }
  }

  // Run database transaction to delete member and rotate keys
  await groupRepository.removeGroupMemberAndRotateKeys(groupId, removeUserId, rotatedKeys);
  return { success: true };
};

export const changeRole = async (groupId, callerId, targetUserId, newRole) => {
  const caller = await groupRepository.getMemberDetails(groupId, callerId);
  if (!caller) {
    throw new Error("Unauthorized: You are not a member of this group");
  }

  if (caller.role !== "owner") {
    throw new Error("Unauthorized: Only the group owner can promote or demote members");
  }

  const target = await groupRepository.getMemberDetails(groupId, targetUserId);
  if (!target) {
    throw new Error("User is not a member of this group");
  }

  if (target.role === "owner") {
    throw new Error("Unauthorized: Cannot change the owner's role");
  }

  return groupRepository.updateMemberRole(groupId, targetUserId, newRole);
};

export const getGroups = async (userId) => {
  return groupRepository.getUserGroupsList(userId);
};

export const getHistory = async (groupId, userId) => {
  const member = await groupRepository.getMemberDetails(groupId, userId);
  if (!member) {
    throw new Error("Unauthorized: You are not a member of this group");
  }

  return groupRepository.getGroupMessages(groupId);
};

export const saveGroupMessage = async (groupId, senderId, messageType, ciphertext, mediaUrl, replyTo) => {
  const member = await groupRepository.getMemberDetails(groupId, senderId);
  if (!member) {
    throw new Error("Unauthorized: You are not a member of this group");
  }

  return groupRepository.createGroupMessage({
    groupId,
    senderId,
    messageType,
    encryptedContent: ciphertext,
    mediaUrl,
    replyTo,
  });
};

export const editMessage = async (messageId, senderId, ciphertext) => {
  const msg = await groupRepository.getGroupMessageById(messageId);
  if (!msg) {
    throw new Error("Message not found");
  }

  if (msg.sender_id !== senderId) {
    throw new Error("Unauthorized: You can only edit your own messages");
  }

  return groupRepository.editGroupMessage(messageId, senderId, ciphertext);
};

export const deleteMessage = async (messageId, senderId) => {
  const msg = await groupRepository.getGroupMessageById(messageId);
  if (!msg) {
    throw new Error("Message not found");
  }

  if (msg.sender_id !== senderId) {
    throw new Error("Unauthorized: You can only delete your own messages");
  }

  return groupRepository.deleteGroupMessage(messageId, senderId);
};

export const toggleReaction = async (messageId, userId, emoji) => {
  const msg = await groupRepository.getGroupMessageById(messageId);
  if (!msg) {
    throw new Error("Message not found");
  }

  const member = await groupRepository.getMemberDetails(msg.group_id, userId);
  if (!member) {
    throw new Error("Unauthorized: You are not a member of this group");
  }

  const result = await groupRepository.toggleGroupReaction(messageId, userId, emoji);
  return { ...result, groupId: msg.group_id };
};

export const verifyMembership = async (groupId, userId) => {
  return groupRepository.getMemberDetails(groupId, userId);
};

export const getMembers = async (groupId, userId) => {
  const member = await groupRepository.getMemberDetails(groupId, userId);
  if (!member) {
    throw new Error("Unauthorized: You are not a member of this group");
  }
  return groupRepository.getGroupMembers(groupId);
};
