import * as messageService from "./message.service.js";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";

const isCloudinaryConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// Helper to stream upload memory buffers to Cloudinary as raw assets
const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw", // Encrypted files have binary headers and must be raw
      },
      (error, result) => {
        if (result) {
          resolve(result);
        } else {
          reject(error);
        }
      }
    );
    stream.write(fileBuffer);
    stream.end();
  });
};

export const getMessages = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { chatId } = req.params;

    if (!chatId) {
      return res.status(400).json({ error: "Chat ID is required" });
    }

    const messagesList = await messageService.getHistory(chatId, userId);
    return res.status(200).json(messagesList);
  } catch (error) {
    console.error("Get messages error:", error);
    return res.status(400).json({ error: error.message || "Internal server error" });
  }
};

export const uploadMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // req.file.buffer contains the client-encrypted file bytes
    let fileUrl = "";

    if (isCloudinaryConfigured) {
      const uploadResult = await uploadToCloudinary(req.file.buffer);
      fileUrl = uploadResult.secure_url;
    } else {
      // Local fallback
      const uploadDir = path.join(process.cwd(), "uploads");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const fileExt = req.file.originalname ? path.extname(req.file.originalname) : ".enc";
      const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}${fileExt}`;
      const filePath = path.join(uploadDir, filename);
      
      fs.writeFileSync(filePath, req.file.buffer);
      fileUrl = `${req.protocol}://${req.get("host")}/uploads/${filename}`;
    }

    return res.status(200).json({
      success: true,
      url: fileUrl,
    });
  } catch (error) {
    console.error("Media upload error:", error);
    return res.status(500).json({ error: error.message || "Media upload failed" });
  }
};
