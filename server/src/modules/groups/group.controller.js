import * as groupService from "./group.service.js";
import {
  groupCreateSchema,
  memberAddSchema,
  memberRemoveSchema,
  roleChangeSchema
} from "./group.validation.js";

export const createGroup = async (req, res) => {
  try {
    const creatorId = req.user.userId;
    const validatedData = groupCreateSchema.parse(req.body);

    const group = await groupService.createGroup(
      creatorId,
      validatedData.groupName,
      validatedData.description,
      validatedData.encryptedGroupKey
    );

    return res.status(201).json({
      success: true,
      message: "Group created successfully",
      group
    });
  } catch (error) {
    console.error("Create group error:", error);
    return res.status(400).json({ error: error.message || "Invalid request data" });
  }
};

export const getGroups = async (req, res) => {
  try {
    const userId = req.user.userId;
    const list = await groupService.getGroups(userId);
    return res.status(200).json(list);
  } catch (error) {
    console.error("Get groups error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
};

export const getHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { groupId } = req.params;

    if (!groupId) {
      return res.status(400).json({ error: "Group ID is required" });
    }

    const messages = await groupService.getHistory(groupId, userId);
    return res.status(200).json(messages);
  } catch (error) {
    console.error("Get group history error:", error);
    return res.status(400).json({ error: error.message || "Internal server error" });
  }
};

export const getMembers = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { groupId } = req.params;

    if (!groupId) {
      return res.status(400).json({ error: "Group ID is required" });
    }

    const members = await groupService.getMembers(groupId, userId);
    return res.status(200).json(members);
  } catch (error) {
    console.error("Get group members error:", error);
    return res.status(400).json({ error: error.message || "Internal server error" });
  }
};

export const addMember = async (req, res) => {
  try {
    const callerId = req.user.userId;
    const { groupId } = req.params;
    const validatedData = memberAddSchema.parse(req.body);

    const inserted = await groupService.addMember(
      groupId,
      callerId,
      validatedData.userId,
      validatedData.encryptedGroupKey
    );

    return res.status(200).json({
      success: true,
      message: "Member added successfully",
      member: inserted
    });
  } catch (error) {
    console.error("Add group member error:", error);
    return res.status(400).json({ error: error.message || "Invalid request data" });
  }
};

export const removeMember = async (req, res) => {
  try {
    const callerId = req.user.userId;
    const { groupId } = req.params;
    const validatedData = memberRemoveSchema.parse(req.body);

    const result = await groupService.removeMember(
      groupId,
      callerId,
      validatedData.userId,
      validatedData.rotatedKeys
    );

    return res.status(200).json({
      success: true,
      message: "Member removed and group keys rotated successfully",
      ...result
    });
  } catch (error) {
    console.error("Remove group member error:", error);
    return res.status(400).json({ error: error.message || "Invalid request data" });
  }
};

export const changeRole = async (req, res) => {
  try {
    const callerId = req.user.userId;
    const { groupId } = req.params;
    const validatedData = roleChangeSchema.parse(req.body);

    const updated = await groupService.changeRole(
      groupId,
      callerId,
      validatedData.userId,
      validatedData.role
    );

    return res.status(200).json({
      success: true,
      message: "Member role updated successfully",
      member: updated
    });
  } catch (error) {
    console.error("Change member role error:", error);
    return res.status(400).json({ error: error.message || "Invalid request data" });
  }
};
