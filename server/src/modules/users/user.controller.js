import { users } from "../../db/postgresSQL/schema/users.js";
import { auth } from "../../db/postgresSQL/schema/auth.js";
import { deviceSessions } from "../../db/postgresSQL/schema/deviceSessions.js";
import { connections } from "../../db/postgresSQL/schema/connections.js";
import { publicKeys } from "../../db/postgresSQL/schema/publicKeys.js";
import { db } from "../../db/postgresSQL/index.js";
import { and, ilike, eq, or } from "drizzle-orm";

const settingsFields = {
  showLastSeen: users.showLastSeen,
  showOnlineStatus: users.showOnlineStatus,
  readReceipts: users.readReceipts,
  allowConnectionRequests: users.allowConnectionRequests,
};

export const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 3) {
      return res.status(400).json({ error: "Query must be at least 3 characters long" });
    }

    if (!db) {
      return res.status(500).json({ error: "Database connection not available" });
    }

    const fetchedUsers = await db
      .select({
        id: users.id,
        username: users.username,
        profilePicture: users.profilePicture
      })
      .from(users)
      .where(and(ilike(users.username, `%${q}%`), eq(users.isDeleted, false)))
      .limit(5);

    return res.status(200).json(fetchedUsers);
  } catch (error) {
    console.error("Search users error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const { username } = req.params;
    const requesterUsername = req.user?.username;

    if (!db) {
      return res.status(500).json({ error: "Database connection not available" });
    }

    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        bio: users.bio,
        profilePicture: users.profilePicture,
        createdAt: users.createdAt
      })
      .from(users)
      .where(and(eq(users.username, username), eq(users.isDeleted, false)))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Hide email if the requester is not the owner of the profile
    if (requesterUsername !== user.username) {
      delete user.email;
    }

    let connection = null;
    if (requesterUsername !== user.username && req.user?.userId) {
      const conn = await db.query.connections.findFirst({
        where: (connections, { or, and, eq }) => or(
          and(eq(connections.user1_id, req.user.userId), eq(connections.user2_id, user.id)),
          and(eq(connections.user1_id, user.id), eq(connections.user2_id, req.user.userId))
        )
      });
      if (conn) {
        connection = {
          connectionId: conn.connection_id,
          status: conn.status,
          senderId: conn.user1_id
        };
      }
    }

    return res.status(200).json({
      ...user,
      connection
    });
  } catch (error) {
    console.error("Get user profile error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { username, bio, profilePicture } = req.body;

    if (!db) {
      return res.status(500).json({ error: "Database connection not available" });
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        ...(username && { username }),
        ...(bio !== undefined && { bio }),
        ...(profilePicture !== undefined && { profilePicture }),
        updatedAt: new Date(),
      })
      .where(and(eq(users.id, userId), eq(users.isDeleted, false)))
      .returning({
        id: users.id,
        username: users.username,
        email: users.email,
        bio: users.bio,
        profilePicture: users.profilePicture,
      });

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Update user profile error:", error);
    if (error.code === '23505') { // Postgres unique violation (e.g. username taken)
        return res.status(400).json({ error: "Username already in use" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getUserSettings = async (req, res) => {
  try {
    const userId = req.user.userId;

    if (!db) {
      return res.status(500).json({ error: "Database connection not available" });
    }

    const [settings] = await db
      .select({
        email: users.email,
        showLastSeen: users.showLastSeen,
        showOnlineStatus: users.showOnlineStatus,
        readReceipts: users.readReceipts,
        allowConnectionRequests: users.allowConnectionRequests,
      })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.isDeleted, false)))
      .limit(1);

    if (!settings) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json(settings);
  } catch (error) {
    console.error("Get user settings error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const updateUserSettings = async (req, res) => {
  try {
    const userId = req.user.userId;
    const updates = {};

    for (const field of Object.keys(settingsFields)) {
      if (typeof req.body[field] === "boolean") {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No valid settings provided" });
    }

    if (!db) {
      return res.status(500).json({ error: "Database connection not available" });
    }

    const [settings] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(users.id, userId), eq(users.isDeleted, false)))
      .returning({
        email: users.email,
        showLastSeen: users.showLastSeen,
        showOnlineStatus: users.showOnlineStatus,
        readReceipts: users.readReceipts,
        allowConnectionRequests: users.allowConnectionRequests,
      });

    if (!settings) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json(settings);
  } catch (error) {
    console.error("Update user settings error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const updateUserEmail = async (req, res) => {
  try {
    const userId = req.user.userId;
    const email = req.body.email?.trim().toLowerCase();
    const { currentPasswordHash, newPasswordHash } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    if (!currentPasswordHash || !newPasswordHash) {
      return res.status(400).json({ error: "Password is required" });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email address" });
    }

    if (!db) {
      return res.status(500).json({ error: "Database connection not available" });
    }

    const updatedUser = await db.transaction(async (tx) => {
      const [userAuth] = await tx
        .select({
          email: users.email,
          passwordHash: auth.password_hash,
        })
        .from(auth)
        .innerJoin(users, eq(auth.user_id, users.id))
        .where(and(eq(users.id, userId), eq(users.isDeleted, false)))
        .limit(1);

      if (!userAuth) {
        return null;
      }

      if (userAuth.email.toLowerCase() === email) {
        return { emailUnchanged: true };
      }

      if (userAuth.passwordHash !== currentPasswordHash) {
        return { passwordMismatch: true };
      }

      const [updated] = await tx
        .update(users)
        .set({
          email,
          updatedAt: new Date(),
        })
        .where(and(eq(users.id, userId), eq(users.isDeleted, false)))
        .returning({
          id: users.id,
          username: users.username,
          email: users.email,
        });

      await tx
        .update(auth)
        .set({
          password_hash: newPasswordHash,
          last_password_change: new Date(),
        })
        .where(eq(auth.user_id, userId));

      return updated;
    });

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (updatedUser.passwordMismatch) {
      return res.status(401).json({ error: "Incorrect password" });
    }

    if (updatedUser.emailUnchanged) {
      return res.status(400).json({ error: "New email must be different from your current email" });
    }

    return res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Update user email error:", error);
    if (error.code === "23505") {
      return res.status(400).json({ error: "Email already in use" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteUserAccount = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { passwordHash } = req.body;

    if (!passwordHash) {
      return res.status(400).json({ error: "Password is required" });
    }

    if (!db) {
      return res.status(500).json({ error: "Database connection not available" });
    }

    const [userAuth] = await db
      .select({
        passwordHash: auth.password_hash,
      })
      .from(auth)
      .innerJoin(users, eq(auth.user_id, users.id))
      .where(and(eq(users.id, userId), eq(users.isDeleted, false)))
      .limit(1);

    if (!userAuth) {
      return res.status(404).json({ error: "User not found" });
    }

    if (userAuth.passwordHash !== passwordHash) {
      return res.status(401).json({ error: "Incorrect password" });
    }

    const deletedAt = new Date();
    const [deletedUser] = await db
      .update(users)
      .set({
        isDeleted: true,
        deletedAt,
        updatedAt: deletedAt,
      })
      .where(and(eq(users.id, userId), eq(users.isDeleted, false)))
      .returning({ id: users.id });

    if (!deletedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    await db
      .update(deviceSessions)
      .set({ revoked_at: deletedAt })
      .where(eq(deviceSessions.user_id, userId));

    res.clearCookie("refreshToken");
    return res.status(200).json({ success: true, message: "Account marked as deleted" });
  } catch (error) {
    console.error("Delete user account error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getUserPublicKeyEndpoint = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!db) {
      return res.status(500).json({ error: "Database connection not available" });
    }

    const [pkRecord] = await db
      .select({ publicKey: publicKeys.public_key })
      .from(publicKeys)
      .where(eq(publicKeys.user_id, userId))
      .limit(1);

    if (!pkRecord) {
      return res.status(404).json({ error: "Public key not found for this user" });
    }

    return res.status(200).json(pkRecord);
  } catch (error) {
    console.error("Get user public key error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
