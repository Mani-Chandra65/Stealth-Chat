import { Router } from "express";
import {
  deleteUserAccount,
  getUserProfile,
  getUserSettings,
  searchUsers,
  updateUserEmail,
  updateUserProfile,
  updateUserSettings,
  getUserPublicKeyEndpoint,
} from "./user.controller.js";
import { authenticate } from "../../middleware/auth.js";

const router = Router();

router.get("/search", searchUsers);
router.get("/settings", authenticate, getUserSettings);
router.put("/settings", authenticate, updateUserSettings);
router.put("/settings/email", authenticate, updateUserEmail);
router.post("/settings/delete-account", authenticate, deleteUserAccount);
// Authenticate the profile fetch so we know who is requesting it
router.get("/profile/:username", authenticate, getUserProfile);
router.put("/profile", authenticate, updateUserProfile);
router.get("/public-key/:userId", authenticate, getUserPublicKeyEndpoint);

export default router;
