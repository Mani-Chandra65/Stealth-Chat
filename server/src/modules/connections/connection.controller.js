import * as connectionService from './connection.service.js';

export const getPendingRequests = async (req, res) => {
    try {
        const userId = req.user.userId;
        const pending = await connectionService.getPending(userId);
        return res.status(200).json(pending);
    } catch (error) {
        console.error("Get pending requests error:", error);
        return res.status(500).json({ error: error.message || "Internal server error" });
    }
};

export const getConnections = async (req, res) => {
    try {
        const userId = req.user.userId;
        const list = await connectionService.getConnections(userId);
        return res.status(200).json(list);
    } catch (error) {
        console.error("Get connections error:", error);
        return res.status(500).json({ error: error.message || "Internal server error" });
    }
};

export const sendConnectionRequest = async (req, res) => {
    try {
        const senderId = req.user.userId;
        const { userId: receiverId } = req.body; // Client calls it 'userId'

        if (!receiverId) {
            return res.status(400).json({ error: "Receiver ID is required" });
        }

        const result = await connectionService.sendRequest(senderId, receiverId);
        return res.status(200).json({
            success: true,
            message: "Connection request sent!",
            connection: result.connection,
            receiver: result.receiver
        });
    } catch (error) {
        console.error("Send connection request error:", error);
        return res.status(400).json({ error: error.message || "Internal server error" });
    }
};

export const acceptConnectionRequest = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { connectionId } = req.params;
        const { encryptedAESKeyUser1, encryptedAESKeyUser2 } = req.body;

        if (!connectionId) {
            return res.status(400).json({ error: "Connection ID is required" });
        }

        if (!encryptedAESKeyUser1 || !encryptedAESKeyUser2) {
            return res.status(400).json({ error: "Encrypted AES keys for both users are required" });
        }

        const result = await connectionService.acceptRequest(connectionId, userId, encryptedAESKeyUser1, encryptedAESKeyUser2);
        return res.status(200).json({
            success: true,
            message: "Connection request accepted!",
            connection: result.connection
        });
    } catch (error) {
        console.error("Accept connection request error:", error);
        return res.status(400).json({ error: error.message || "Internal server error" });
    }
};

export const rejectConnectionRequest = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { connectionId } = req.params;

        if (!connectionId) {
            return res.status(400).json({ error: "Connection ID is required" });
        }

        const result = await connectionService.rejectRequest(connectionId, userId);
        return res.status(200).json({
            success: true,
            message: "Connection request rejected!",
            connection: result
        });
    } catch (error) {
        console.error("Reject connection request error:", error);
        return res.status(400).json({ error: error.message || "Internal server error" });
    }
};
