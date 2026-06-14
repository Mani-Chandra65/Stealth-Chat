import * as messageService from "./message.service.js";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";

const getCloudinaryConfig = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  const isConfigured = !!(
    cloudName &&
    cloudName !== "your_cloudinary_cloud_name_here" &&
    cloudName !== "your_cloud_name" &&
    apiKey &&
    apiKey !== "your_cloudinary_api_key_here" &&
    apiKey !== "your_api_key" &&
    apiSecret &&
    apiSecret !== "your_cloudinary_api_secret_here" &&
    apiSecret !== "your_api_secret"
  );

  return {
    isConfigured,
    cloudName,
    apiKey,
    apiSecret
  };
};

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

    const config = getCloudinaryConfig();

    if (!config.isConfigured) {
      console.error("[ADMIN ALERT] Cloudinary is not configured!");
      return res.status(500).json({
        error: "Error on database/storage side. Please wait and try again.",
        code: "STORAGE_NOT_CONFIGURED"
      });
    }

    // Configure Cloudinary dynamically using current environment variables
    cloudinary.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret,
    });

    // req.file.buffer contains the client-encrypted file bytes
    let fileUrl = "";

    try {
      const uploadResult = await uploadToCloudinary(req.file.buffer);
      fileUrl = uploadResult.secure_url;
    } catch (cloudinaryErr) {
      console.error("[ADMIN ALERT] Cloudinary upload failed:", cloudinaryErr);
      return res.status(500).json({
        error: "Error on database/storage side. Please wait and try again.",
        code: "STORAGE_ERROR",
        details: cloudinaryErr.message || "Cloudinary upload failed"
      });
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

export const reportError = async (req, res) => {
  try {
    const { errorDetails, fileName } = req.body;
    const userId = req.user?.userId || "unknown";

    const logMessage = `[USER REPORTED UPLOAD ERROR] User ID: ${userId}, File: ${fileName || "unknown"}, Error: ${JSON.stringify(errorDetails)}`;
    console.error(logMessage);

    // If SMTP environment variables are defined, send a real email
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT || 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const adminEmail = process.env.ADMIN_EMAIL || "admin@stealthchat.app";

    let emailSent = false;
    if (smtpHost && smtpHost !== "your_smtp_host_here" && smtpUser && smtpUser !== "your_smtp_user_here" && smtpPass && smtpPass !== "your_smtp_password_here") {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: parseInt(smtpPort),
          secure: smtpPort == 465,
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        });

        await transporter.sendMail({
          from: `"Stealth Chat Alert" <${smtpUser}>`,
          to: adminEmail,
          subject: `[ALERT] Stealth Chat Media Upload Failed`,
          text: `A user encountered a file upload error.\n\nUser ID: ${userId}\nFile: ${fileName || "unknown"}\nError Details:\n${JSON.stringify(errorDetails, null, 2)}`,
          html: `<h3>Stealth Chat Media Upload Failure</h3>
                 <p><strong>User ID:</strong> ${userId}</p>
                 <p><strong>File:</strong> ${fileName || "unknown"}</p>
                 <p><strong>Error Details:</strong></p>
                 <pre>${JSON.stringify(errorDetails, null, 2)}</pre>`
        });
        emailSent = true;
      } catch (mailErr) {
        console.error("Failed to send error email:", mailErr);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Report logged successfully",
      emailSent
    });
  } catch (err) {
    console.error("Failed to process error report:", err);
    return res.status(500).json({ error: "Failed to send report" });
  }
};

export const downloadMedia = async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    const decodedUrl = decodeURIComponent(url);

    // Fetch the file from Cloudinary or external source
    const response = await fetch(decodedUrl);
    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to retrieve media from storage" });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader("Content-Type", response.headers.get("content-type") || "application/octet-stream");
    return res.send(buffer);
  } catch (err) {
    console.error("Media download proxy failed:", err);
    return res.status(500).json({ error: "Failed to download media" });
  }
};
