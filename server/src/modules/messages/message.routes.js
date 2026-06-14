import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import multer from "multer";
import { getMessages, uploadMedia, reportError, downloadMedia } from "./message.controller.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // Limit to 10MB
  },
});

const router = Router();

router.get("/download", authenticate, downloadMedia);
router.get("/:chatId", authenticate, getMessages);
router.post("/upload", authenticate, upload.single("file"), uploadMedia);
router.post("/report-error", authenticate, reportError);

export default router;
