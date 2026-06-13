import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import multer from "multer";
import { getMessages, uploadMedia } from "./message.controller.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // Limit to 10MB
  },
});

const router = Router();

router.get("/:chatId", authenticate, getMessages);
router.post("/upload", authenticate, upload.single("file"), uploadMedia);

export default router;
