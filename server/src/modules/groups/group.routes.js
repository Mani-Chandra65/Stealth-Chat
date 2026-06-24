import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import {
  createGroup,
  getGroups,
  getHistory,
  getMembers,
  addMember,
  removeMember,
  changeRole
} from "./group.controller.js";

const router = Router();

router.post("/", authenticate, createGroup);
router.get("/list", authenticate, getGroups);
router.get("/:groupId/history", authenticate, getHistory);
router.get("/:groupId/members", authenticate, getMembers);
router.post("/:groupId/members", authenticate, addMember);
router.post("/:groupId/members/remove", authenticate, removeMember);
router.patch("/:groupId/members/role", authenticate, changeRole);

export default router;
