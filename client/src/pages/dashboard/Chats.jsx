import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "../../store/authStore.js";
import { getSocket } from "../../lib/socket.js";
import { getPrivateKey, setChatKey } from "../../store/cryptoStore.js";
import { useNotificationStore } from "../../store/notificationStore.js";
import { base64ToArrayBuffer } from "../../utils/crypto/helpers.js";
import { getPublicKey } from "../../utils/indexedDB.js";
import { generateAndEncryptAESKeys } from "../../utils/crypto/keyExchange.js";
import { 
  encryptMessageContent, 
  decryptMessageContent, 
  encryptMediaFile,
  decryptMediaFile 
} from "../../utils/crypto/chatCrypto.js";
import axios from "axios";
import toast from "react-hot-toast";
import { 
  MessageSquare, 
  UserPlus, 
  Check, 
  CheckCheck,
  X, 
  Clock, 
  Lock, 
  Unlock, 
  AlertCircle,
  Send,
  Paperclip,
  Shield,
  Download,
  Image as ImageIcon,
  Loader2,
  Reply,
  Edit3,
  Trash2,
  Smile,
  RefreshCw,
  ArrowLeft
} from "lucide-react";

// Sub-component to download, decrypt, and render media files securely
function DecryptedMedia({ mediaUrl, fileKey, iv, mimeType, filename }) {
  const [decryptedUrl, setDecryptedUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const decryptMedia = async () => {
    try {
      setLoading(true);
      setError(false);

      // Download the encrypted file bytes
      const response = await axios.get(mediaUrl, {
        responseType: "arraybuffer"
      });

      // Decrypt the bytes
      const decryptedBuffer = await decryptMediaFile(response.data, fileKey, iv);
      const blob = new Blob([decryptedBuffer], { type: mimeType || "application/octet-stream" });
      const objectUrl = URL.createObjectURL(blob);
      setDecryptedUrl(objectUrl);
    } catch (err) {
      console.error("Failed to decrypt media file:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  // Auto-decrypt images; other files can be decrypted on click
  const isImage = mimeType?.startsWith("image/");

  useEffect(() => {
    if (isImage) {
      decryptMedia();
    }
    return () => {
      if (decryptedUrl) {
        URL.revokeObjectURL(decryptedUrl);
      }
    };
  }, [mediaUrl, fileKey, iv, mimeType]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 px-4 bg-gray-50 rounded-lg text-gray-500 text-xs border border-gray-100">
        <Loader2 size={16} className="animate-spin text-blue-600" />
        <span>Decrypting secure attachment...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 py-3 px-4 bg-red-50 rounded-lg text-red-600 text-xs border border-red-100">
        <AlertCircle size={16} />
        <span>Failed to decrypt attachment.</span>
      </div>
    );
  }

  if (decryptedUrl) {
    if (isImage) {
      return (
        <div className="rounded-lg overflow-hidden border border-gray-100 max-w-xs shadow-sm bg-white mt-1">
          <img src={decryptedUrl} alt={filename || "E2EE Attachment"} className="w-full max-h-60 object-cover" />
        </div>
      );
    }

    return (
      <a
        href={decryptedUrl}
        download={filename || "file"}
        className="inline-flex items-center gap-2 py-2.5 px-4 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold rounded-lg border border-green-100 transition-colors mt-1"
      >
        <Download size={14} />
        Download {filename || "Attachment"}
      </a>
    );
  }

  return (
    <button
      onClick={decryptMedia}
      className="inline-flex items-center gap-2 py-2.5 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg border border-blue-100 transition-colors mt-1 cursor-pointer"
    >
      <Lock size={14} />
      Load Encrypted File ({filename || "Attachment"})
    </button>
  );
}

function InlineEdit({ initialText, onSave, onCancel }) {
  const [text, setText] = useState(initialText);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (text.trim()) onSave(text.trim());
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <div className="flex flex-col gap-2 min-w-[220px] max-w-full text-gray-800">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
        rows={2}
        autoFocus
      />
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-2.5 py-1 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSave(text.trim())}
          disabled={!text.trim()}
          className="px-2.5 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 cursor-pointer"
        >
          Save
        </button>
      </div>
    </div>
  );
}

const getChatTimestamp = (chat) => {
  if (!chat) return 0;
  const timeStr = chat.lastActivityAt || chat.createdAt;
  if (!timeStr) return 0;
  const parsed = new Date(timeStr).getTime();
  return isNaN(parsed) ? 0 : parsed;
};

export default function Chats() {
  const { accessToken, user } = useAuthStore();
  const unreadChats = useNotificationStore(state => state.unreadChats);
  const [activeTab, setActiveTab] = useState("chats");
  const [chats, setChats] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Secure active conversation state
  const [activeChat, setActiveChat] = useState(null);

  useEffect(() => {
    useNotificationStore.getState().setActiveChatId(activeChat?.connectionId || null);
    return () => {
      useNotificationStore.getState().setActiveChatId(null);
    };
  }, [activeChat]);

  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [inputText, setInputText] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);

  // Real-time peer status
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);

  // References for scrolling and typing debounces
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  const privateKey = getPrivateKey();
  const isVaultUnlocked = !!privateKey;
  const socket = getSocket();

  // Decrypt AES key for a connection
  const decryptAndStoreAESKey = async (connectionId, encryptedAESKey) => {
    if (!privateKey || !encryptedAESKey) return false;
    try {
      const encryptedBuf = base64ToArrayBuffer(encryptedAESKey);
      const decryptedBuf = await window.crypto.subtle.decrypt(
        {
          name: "RSA-OAEP"
        },
        privateKey,
        encryptedBuf
      );
      const aesKey = await window.crypto.subtle.importKey(
        "raw",
        decryptedBuf,
        {
          name: "AES-GCM",
          length: 256
        },
        true,
        ["encrypt", "decrypt"]
      );
      setChatKey(connectionId, aesKey);
      return true;
    } catch (err) {
      console.error(`Failed to decrypt AES key for connection ${connectionId}:`, err);
      return false;
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const [chatsRes, requestsRes] = await Promise.all([
        axios.get("/api/v1/connections/list", {
          headers: { Authorization: `Bearer ${accessToken}` }
        }),
        axios.get("/api/v1/connections/pending", {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
      ]);

      const fetchedChats = chatsRes.data;
      const decryptedChats = await Promise.all(
        fetchedChats.map(async (chat) => {
          let isDecrypted = false;
          if (isVaultUnlocked && chat.encryptedAESKey) {
            isDecrypted = await decryptAndStoreAESKey(chat.connectionId, chat.encryptedAESKey);
          }
          return { ...chat, isDecrypted };
        })
      );

      // Sort chats dynamically by lastActivityAt descending
      const sortedChats = decryptedChats.sort((a, b) => {
        return getChatTimestamp(b) - getChatTimestamp(a);
      });

      setChats(sortedChats);
      setRequests(requestsRes.data);
    } catch (err) {
      console.error("Failed to load chats/requests:", err);
      setError("Failed to load conversations. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchData();
    }
  }, [accessToken, isVaultUnlocked]);

  // Load message logs for active chat and decrypt them
  const loadChatMessages = async (chat) => {
    try {
      setMessagesLoading(true);
      setIsPeerTyping(false);
      
      const response = await axios.get(`/api/v1/messages/${chat.connectionId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      const rawMsgs = response.data;
      const decryptedMsgs = await Promise.all(
        rawMsgs.map(async (msg) => {
          let decryptedBody = "";
          let mediaMeta = null;

          // Bypass decryption for soft-deleted messages
          if (msg.deleted_at) {
            return {
              id: msg.message_id,
              senderId: msg.sender_id,
              messageType: msg.message_type,
              text: "",
              mediaMeta: null,
              mediaUrl: "",
              createdAt: msg.created_at,
              status: msg.status,
              replyTo: msg.reply_to,
              edited: msg.edited,
              editedAt: msg.edited_at,
              deletedAt: msg.deleted_at,
              reactions: msg.reactions || []
            };
          }

          if (msg.message_type === "text") {
            decryptedBody = await decryptMessageContent(msg.encrypted_content, chat.connectionId);
          } else if (msg.message_type === "media" && msg.encrypted_content) {
            try {
              const metaString = await decryptMessageContent(msg.encrypted_content, chat.connectionId);
              mediaMeta = JSON.parse(metaString);
            } catch (err) {
              console.error("Failed to decrypt media metadata:", err);
            }
          }

          return {
            id: msg.message_id,
            senderId: msg.sender_id,
            messageType: msg.message_type,
            text: decryptedBody,
            mediaMeta,
            mediaUrl: msg.media_url,
            createdAt: msg.created_at,
            status: msg.status,
            replyTo: msg.reply_to,
            edited: msg.edited,
            editedAt: msg.edited_at,
            deletedAt: msg.deleted_at,
            reactions: msg.reactions || []
          };
        })
      );

      setMessages(decryptedMsgs);

      // Emit read receipt for this chat
      if (socket) {
        socket.emit("message:read", { chatId: chat.connectionId });
      }

    } catch (err) {
      console.error("Failed to load messages:", err);
      toast.error("Failed to load chat history");
    } finally {
      setMessagesLoading(false);
    }
  };

  useEffect(() => {
    if (activeChat) {
      loadChatMessages(activeChat);
    } else {
      setMessages([]);
    }
  }, [activeChat]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPeerTyping]);

  // Socket listeners setup
  useEffect(() => {
    if (!socket) return;

    const handleRequestReceived = (payload) => {
      toast.success(`New connection request from ${payload.senderUsername}!`);
      setRequests(prev => {
        if (prev.some(r => r.connectionId === payload.connectionId)) return prev;
        return [
          {
            connectionId: payload.connectionId,
            senderId: payload.senderId,
            senderUsername: payload.senderUsername,
            createdAt: payload.createdAt
          },
          ...prev
        ];
      });
    };

    const handleConnectionAccepted = async (payload) => {
      toast.success(`Connection accepted with ${payload.peerUsername}!`);
      
      let isDecrypted = false;
      if (payload.encryptedAESKey) {
        isDecrypted = await decryptAndStoreAESKey(payload.connectionId, payload.encryptedAESKey);
      }

      const newChat = {
        connectionId: payload.connectionId,
        peerId: payload.peerId,
        peerUsername: payload.peerUsername,
        peerProfilePicture: payload.peerProfilePicture,
        createdAt: payload.createdAt || new Date().toISOString(),
        encryptedAESKey: payload.encryptedAESKey,
        isDecrypted,
        lastActivityAt: payload.createdAt || new Date().toISOString()
      };

      setChats(prev => {
        if (prev.some(c => c.connectionId === payload.connectionId)) return prev;
        const updated = [newChat, ...prev];
        return [...updated].sort((a, b) => getChatTimestamp(b) - getChatTimestamp(a));
      });
      setRequests(prev => prev.filter(r => r.connectionId !== payload.connectionId));
    };

    const handleConnectionRejected = (payload) => {
      setRequests(prev => prev.filter(r => r.connectionId !== payload.connectionId));
    };

    // Real-time message receiver
    const handleMessageReceived = async (payload) => {
      // If it belongs to active chat, decrypt and append
      if (activeChat && payload.chatId === activeChat.connectionId) {
        let decryptedBody = "";
        let mediaMeta = null;

        if (payload.messageType === "text") {
          decryptedBody = await decryptMessageContent(payload.ciphertext, activeChat.connectionId);
        } else if (payload.messageType === "media" && payload.ciphertext) {
          try {
            const metaString = await decryptMessageContent(payload.ciphertext, activeChat.connectionId);
            mediaMeta = JSON.parse(metaString);
          } catch (err) {
            console.error("Failed to decrypt media metadata:", err);
          }
        }

        const newMsg = {
          id: payload.messageId,
          senderId: payload.senderId,
          messageType: payload.messageType,
          text: decryptedBody,
          mediaMeta,
          mediaUrl: payload.mediaUrl,
          createdAt: payload.createdAt,
          status: payload.status,
          replyTo: payload.replyTo,
          edited: payload.edited || false,
          editedAt: payload.editedAt || null,
          deletedAt: payload.deletedAt || null,
          reactions: payload.reactions || []
        };

        setMessages(prev => [...prev, newMsg]);

        // Send read receipt since chat is active
        socket.emit("message:read", { chatId: activeChat.connectionId });

      } else {
        // Increment global notification or alert user
        toast(`New secure message from connection!`, { icon: "🔒" });
      }

      // Sort chats dynamically on new message
      setChats(prev => {
        const updated = prev.map(c => {
          if (c.connectionId === payload.chatId) {
            return { ...c, lastActivityAt: payload.createdAt };
          }
          return c;
        });
        return [...updated].sort((a, b) => getChatTimestamp(b) - getChatTimestamp(a));
      });
    };

    // Real-time read checkmarks listener
    const handleMessageRead = (payload) => {
      if (activeChat && payload.chatId === activeChat.connectionId) {
        setMessages(prev => prev.map(m => {
          if (m.senderId === user.id && m.status !== "read") {
            return { ...m, status: "read" };
          }
          return m;
        }));
      }
    };

    // Typing state listeners
    const handleTypingStart = (payload) => {
      if (activeChat && payload.chatId === activeChat.connectionId) {
        setIsPeerTyping(true);
      }
    };

    const handleTypingStop = (payload) => {
      if (activeChat && payload.chatId === activeChat.connectionId) {
        setIsPeerTyping(false);
      }
    };

    const handlePresenceUpdate = (payload) => {
      setChats(prev => {
        const updated = prev.map(c => {
          if (c.peerId === payload.userId) {
            return { ...c, isOnline: payload.status === "online" };
          }
          return c;
        });
        return updated;
      });
      setActiveChat(prev => {
        if (prev && prev.peerId === payload.userId) {
          return { ...prev, isOnline: payload.status === "online" };
        }
        return prev;
      });
    };

    const handleMessageEdited = async (payload) => {
      if (activeChat && payload.chatId === activeChat.connectionId) {
        let decryptedText = "";
        try {
          decryptedText = await decryptMessageContent(payload.ciphertext, activeChat.connectionId);
        } catch (err) {
          console.error("Failed to decrypt edited message:", err);
          decryptedText = "[Error decrypting edited message]";
        }
        setMessages(prev => prev.map(m => {
          if (m.id === payload.messageId) {
            return { ...m, text: decryptedText, edited: true, editedAt: payload.editedAt };
          }
          return m;
        }));
      }
    };

    const handleMessageDeleted = (payload) => {
      if (activeChat && payload.chatId === activeChat.connectionId) {
        setMessages(prev => prev.map(m => {
          if (m.id === payload.messageId) {
            return { ...m, text: "", mediaMeta: null, mediaUrl: "", deletedAt: payload.deletedAt };
          }
          return m;
        }));
      }
    };

    const handleMessageReacted = (payload) => {
      if (activeChat && payload.chatId === activeChat.connectionId) {
        setMessages(prev => prev.map(m => {
          if (m.id === payload.messageId) {
            const currentReactions = m.reactions || [];
            if (payload.action === "remove") {
              return {
                ...m,
                reactions: currentReactions.filter(r => !(r.userId === payload.userId && r.emoji === payload.emoji))
              };
            } else if (payload.action === "change") {
              return {
                ...m,
                reactions: currentReactions.map(r => {
                  if (r.userId === payload.userId) {
                    return payload.reaction;
                  }
                  return r;
                })
              };
            } else if (payload.action === "add") {
              if (currentReactions.some(r => r.userId === payload.userId && r.emoji === payload.emoji)) {
                return m;
              }
              return {
                ...m,
                reactions: [...currentReactions, payload.reaction]
              };
            }
          }
          return m;
        }));
      }
    };

    socket.on("connection:request-received", handleRequestReceived);
    socket.on("connection:accepted", handleConnectionAccepted);
    socket.on("connection:rejected", handleConnectionRejected);
    socket.on("message:received", handleMessageReceived);
    socket.on("message:read", handleMessageRead);
    socket.on("typing:start", handleTypingStart);
    socket.on("typing:stop", handleTypingStop);
    socket.on("presence:update", handlePresenceUpdate);
    socket.on("message:edited", handleMessageEdited);
    socket.on("message:deleted", handleMessageDeleted);
    socket.on("message:reacted", handleMessageReacted);

    return () => {
      socket.off("connection:request-received", handleRequestReceived);
      socket.off("connection:accepted", handleConnectionAccepted);
      socket.off("connection:rejected", handleConnectionRejected);
      socket.off("message:received", handleMessageReceived);
      socket.off("message:read", handleMessageRead);
      socket.off("typing:start", handleTypingStart);
      socket.off("typing:stop", handleTypingStop);
      socket.off("presence:update", handlePresenceUpdate);
      socket.off("message:edited", handleMessageEdited);
      socket.off("message:deleted", handleMessageDeleted);
      socket.off("message:reacted", handleMessageReacted);
    };
  }, [socket, activeChat]);

  // Handle typing input changes
  const handleInputChange = (e) => {
    setInputText(e.target.value);
    
    if (!socket || !activeChat) return;

    // Emit typing start
    socket.emit("typing:start", { chatId: activeChat.connectionId });

    // Debounce typing stop
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing:stop", { chatId: activeChat.connectionId });
    }, 2000);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChat || !socket) return;

    if (!isVaultUnlocked) {
      toast.error("Decryption vault is locked. Unlock it in Settings to send secure messages.");
      return;
    }

    const textToSend = inputText.trim();
    setInputText("");

    // Stop typing state immediately
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket.emit("typing:stop", { chatId: activeChat.connectionId });

    try {
      // 1. Encrypt message locally using AES symmetric key
      const ciphertext = await encryptMessageContent(textToSend, activeChat.connectionId);

      // 2. Emit to socket
      socket.emit("message:send", {
        chatId: activeChat.connectionId,
        ciphertext,
        messageType: "text",
        replyTo: replyTo ? replyTo.id : null
      }, (response) => {
        if (response.success) {
          const sentMsg = {
            id: response.message.messageId,
            senderId: user.id,
            messageType: "text",
            text: textToSend,
            createdAt: response.message.createdAt,
            status: response.message.status,
            replyTo: response.message.replyTo,
            edited: false,
            editedAt: null,
            deletedAt: null,
            reactions: []
          };
          setMessages(prev => [...prev, sentMsg]);
          setReplyTo(null);

          // Update lastActivityAt in chats and re-sort
          setChats(prev => {
            const updated = prev.map(c => {
              if (c.connectionId === activeChat.connectionId) {
                return { ...c, lastActivityAt: response.message.createdAt };
              }
              return c;
            });
            return [...updated].sort((a, b) => getChatTimestamp(b) - getChatTimestamp(a));
          });
        } else {
          toast.error(response.error || "Failed to send message");
        }
      });
    } catch (err) {
      console.error("Encryption/Sending failed:", err);
      toast.error("Encryption failed. Vault locked?");
    }
  };

  // Encrypt and upload media files
  const handleMediaUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeChat || !socket) return;

    if (!isVaultUnlocked) {
      toast.error("Decryption vault is locked. Unlock it in Settings to send secure attachments.");
      return;
    }

    try {
      setUploadingFile(true);
      const uploadToastId = toast.loading(`Encrypting and uploading ${file.name}...`);

      // 1. Encrypt the file locally
      const { encryptedBlob, fileKeyBase64, ivBase64 } = await encryptMediaFile(file);

      // 2. Upload the encrypted ciphertext buffer to the server Cloudinary/Local endpoint
      const formData = new FormData();
      formData.append("file", encryptedBlob, file.name);

      const uploadRes = await axios.post("/api/v1/messages/upload", formData, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "multipart/form-data"
        }
      });

      const fileUrl = uploadRes.data.url;

      // 3. Encrypt the key and IV metadata locally using the chat AES key
      const metadataPayload = JSON.stringify({
        fileKey: fileKeyBase64,
        iv: ivBase64,
        filename: file.name,
        mimeType: file.type
      });

      const ciphertext = await encryptMessageContent(metadataPayload, activeChat.connectionId);

      // 4. Send message to chat
      socket.emit("message:send", {
        chatId: activeChat.connectionId,
        ciphertext,
        messageType: "media",
        mediaUrl: fileUrl,
        replyTo: replyTo ? replyTo.id : null
      }, (response) => {
        toast.dismiss(uploadToastId);
        if (response.success) {
          const sentMsg = {
            id: response.message.messageId,
            senderId: user.id,
            messageType: "media",
            mediaMeta: {
              fileKey: fileKeyBase64,
              iv: ivBase64,
              filename: file.name,
              mimeType: file.type
            },
            mediaUrl: fileUrl,
            createdAt: response.message.createdAt,
            status: response.message.status,
            replyTo: response.message.replyTo,
            edited: false,
            editedAt: null,
            deletedAt: null,
            reactions: []
          };
          setMessages(prev => [...prev, sentMsg]);
          setReplyTo(null);
          toast.success("Secure attachment sent!");

          // Update lastActivityAt in chats and re-sort
          setChats(prev => {
            const updated = prev.map(c => {
              if (c.connectionId === activeChat.connectionId) {
                return { ...c, lastActivityAt: response.message.createdAt };
              }
              return c;
            });
            return [...updated].sort((a, b) => getChatTimestamp(b) - getChatTimestamp(a));
          });
        } else {
          toast.error(response.error || "Failed to send attachment info");
        }
      });

    } catch (err) {
      console.error("Media secure transfer failed:", err);
      toast.error("Encryption or upload failed");
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleToggleReaction = (messageId, emoji) => {
    if (!socket) return;
    socket.emit("message:react", { messageId, emoji }, (response) => {
      if (response.success) {
        setMessages(prev => prev.map(m => {
          if (m.id === messageId) {
            const currentReactions = m.reactions || [];
            if (response.action === "remove") {
              return {
                ...m,
                reactions: currentReactions.filter(r => !(r.userId === user.id && r.emoji === emoji))
              };
            } else if (response.action === "change") {
              return {
                ...m,
                reactions: currentReactions.map(r => {
                  if (r.userId === user.id) {
                    return response.reaction;
                  }
                  return r;
                })
              };
            } else {
              if (currentReactions.some(r => r.userId === user.id && r.emoji === emoji)) {
                return m;
              }
              return {
                ...m,
                reactions: [...currentReactions, response.reaction]
              };
            }
          }
          return m;
        }));
      } else {
        toast.error(response.error || "Failed to toggle reaction");
      }
    });
  };

  const handleEditMessage = async (messageId, editedText) => {
    if (!socket || !activeChat) return;
    try {
      const ciphertext = await encryptMessageContent(editedText, activeChat.connectionId);
      socket.emit("message:edit", { messageId, ciphertext }, (response) => {
        if (response.success) {
          setMessages(prev => prev.map(m => {
            if (m.id === messageId) {
              return { ...m, text: editedText, edited: true, editedAt: response.message.editedAt };
            }
            return m;
          }));
          setEditingMessage(null);
        } else {
          toast.error(response.error || "Failed to edit message");
        }
      });
    } catch (err) {
      console.error("Failed to encrypt edited message:", err);
      toast.error("Failed to encrypt message");
    }
  };

  const handleDeleteMessage = (messageId) => {
    if (!socket) return;
    socket.emit("message:delete", { messageId }, (response) => {
      if (response.success) {
        setMessages(prev => prev.map(m => {
          if (m.id === messageId) {
            return { ...m, text: "", mediaMeta: null, mediaUrl: "", deletedAt: response.message.deletedAt };
          }
          return m;
        }));
        toast.success("Message deleted");
      } else {
        toast.error(response.error || "Failed to delete message");
      }
    });
  };

  const getMessageSenderName = (senderId) => {
    if (!activeChat) return "";
    return senderId === user.id ? "You" : activeChat.peerUsername;
  };

  const handleAcceptRequest = async (connectionId) => {
    const socket = getSocket();
    if (!socket) {
      toast.error("Not connected to server");
      return;
    }

    const request = requests.find(r => r.connectionId === connectionId);
    if (!request) {
      toast.error("Request details not found");
      return;
    }

    if (!isVaultUnlocked) {
      toast.error("Decryption vault is locked. Unlock it in Settings to accept connection requests.");
      return;
    }

    const toastId = toast.loading("Performing key exchange...");

    try {
      const peerPublicKeyRes = await axios.get(`/api/v1/users/public-key/${request.senderId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const peerPublicKey = peerPublicKeyRes.data.publicKey;

      const myPublicKey = await getPublicKey(user.id);

      if (!peerPublicKey || !myPublicKey) {
        throw new Error("Could not retrieve public keys for exchange");
      }

      const { aesKey, encryptedAESKeyUser1, encryptedAESKeyUser2 } = await generateAndEncryptAESKeys(peerPublicKey, myPublicKey);

      socket.emit("connection:accept-request", {
        connectionId,
        encryptedAESKeyUser1,
        encryptedAESKeyUser2
      }, (response) => {
        toast.dismiss(toastId);
        if (response.success) {
          toast.success("Connection accepted!");
          setChatKey(connectionId, aesKey);
        } else {
          toast.error(response.error || "Failed to accept request");
        }
      });

    } catch (err) {
      toast.dismiss(toastId);
      console.error("Key exchange failed:", err);
      toast.error(err.message || "Failed to perform key exchange");
    }
  };

  const handleRejectRequest = (connectionId) => {
    const socket = getSocket();
    if (!socket) {
      toast.error("Not connected to server");
      return;
    }

    socket.emit("connection:reject-request", { connectionId }, (response) => {
      if (response.success) {
        toast.success("Request rejected");
        setRequests(prev => prev.filter(r => r.connectionId !== connectionId));
      } else {
        toast.error(response.error || "Failed to reject request");
      }
    });
  };

  return (
    <div className="flex h-full bg-gray-50 overflow-hidden">
      
      {/* Left Column: Chats & Requests Panel */}
      <div className={`w-full md:w-80 border-r border-gray-200 bg-white flex flex-col shrink-0 ${
        activeChat ? "hidden md:flex" : "flex"
      }`}>
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">Secure Chats</h1>
              <button
                type="button"
                onClick={fetchData}
                disabled={loading}
                className="p-1 hover:bg-gray-100 rounded-full text-gray-500 hover:text-blue-600 transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center"
                title="Refresh chats"
              >
                <RefreshCw size={14} className={loading ? "animate-spin text-blue-600" : ""} />
              </button>
            </div>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              isVaultUnlocked 
                ? "bg-green-50 text-green-700 border border-green-100" 
                : "bg-amber-50 text-amber-700 border border-amber-100"
            }`}>
              {isVaultUnlocked ? <Unlock size={12} /> : <Lock size={12} />}
              {isVaultUnlocked ? "Unlocked" : "Locked"}
            </div>
          </div>

          {/* Tab Selection */}
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("chats")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                activeTab === "chats" 
                  ? "bg-white text-gray-900 shadow-sm" 
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Chats {chats.length > 0 && `(${chats.length})`}
            </button>
            <button
              onClick={() => setActiveTab("requests")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                activeTab === "requests" 
                  ? "bg-white text-gray-900 shadow-sm" 
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Requests {requests.length > 0 && `(${requests.length})`}
            </button>
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="animate-spin text-blue-600" size={24} />
            </div>
          ) : activeTab === "chats" ? (
            chats.length === 0 ? (
              <div className="text-center py-10 px-5 text-gray-400 text-xs">
                No active conversations. Start by connecting with someone in Search.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {chats.map(chat => (
                  <li key={chat.connectionId}>
                    <button
                      onClick={() => setActiveChat(chat)}
                      className={`w-full flex items-center gap-3.5 p-4 text-left transition-colors cursor-pointer ${
                        activeChat?.connectionId === chat.connectionId 
                          ? "bg-blue-50/70 border-l-4 border-blue-600" 
                          : "hover:bg-gray-50/50"
                      }`}
                    >
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center overflow-hidden">
                          {chat.peerProfilePicture ? (
                            <img src={chat.peerProfilePicture} alt={chat.peerUsername} className="w-full h-full object-cover" />
                          ) : (
                            chat.peerUsername.charAt(0).toUpperCase()
                          )}
                        </div>
                        {chat.isOnline && (
                          <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-blue-500 ring-2 ring-white shadow-sm" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 truncate">{chat.peerUsername}</p>
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
                          {chat.isDecrypted ? (
                            <span className="text-green-600 flex items-center gap-1"><Unlock size={10} /> E2EE Ready</span>
                          ) : (
                            <span className="text-amber-500 flex items-center gap-1"><Lock size={10} /> Locked</span>
                          )}
                        </p>
                      </div>
                      {unreadChats[chat.connectionId] > 0 && (
                        <div className="shrink-0 flex items-center justify-center">
                          <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold bg-blue-600 text-white rounded-full leading-none min-w-4 h-4 shadow-sm">
                            {unreadChats[chat.connectionId]}
                          </span>
                        </div>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : (
            requests.length === 0 ? (
              <div className="text-center py-10 px-5 text-gray-400 text-xs">
                No pending connection requests.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {requests.map(req => (
                  <li key={req.connectionId} className="p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 overflow-hidden">
                        {req.senderProfilePicture ? (
                          <img src={req.senderProfilePicture} alt={req.senderUsername} className="w-full h-full object-cover" />
                        ) : (
                          req.senderUsername.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-xs text-gray-900 truncate">{req.senderUsername}</p>
                        <p className="text-[10px] text-gray-400">wants to connect</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptRequest(req.connectionId)}
                        className="flex-1 py-1.5 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors cursor-pointer shadow-sm shadow-green-100"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleRejectRequest(req.connectionId)}
                        className="flex-1 py-1.5 text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-600 rounded-md transition-colors cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )
          )}
        </div>
      </div>

      {/* Right Column: Secure Active Chat Dialog */}
      <div className={`flex-1 flex flex-col bg-white overflow-hidden h-full ${
        activeChat ? "flex" : "hidden md:flex"
      }`}>
        {activeChat ? (
          <>
            {/* Active Chat Header */}
            <header className="px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between shadow-sm shrink-0 z-10">
              <div className="flex items-center gap-3.5">
                <button
                  onClick={() => setActiveChat(null)}
                  className="md:hidden p-1.5 text-gray-500 hover:bg-gray-150 rounded-lg mr-1 cursor-pointer transition-colors"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center overflow-hidden">
                    {activeChat.peerProfilePicture ? (
                      <img src={activeChat.peerProfilePicture} alt={activeChat.peerUsername} className="w-full h-full object-cover" />
                    ) : (
                      activeChat.peerUsername.charAt(0).toUpperCase()
                    )}
                  </div>
                  {activeChat.isOnline && (
                    <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-blue-500 ring-2 ring-white shadow-sm" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{activeChat.peerUsername}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-green-500 font-semibold flex items-center gap-1">
                      <Shield size={12} className="text-green-500 fill-green-50" />
                      End-to-End Encrypted
                    </p>
                    <span className="text-[10px] text-gray-300">•</span>
                    <p className={`text-xs font-semibold ${activeChat.isOnline ? "text-blue-600" : "text-gray-400"}`}>
                      {activeChat.isOnline ? "Online" : "Offline"}
                    </p>
                  </div>
                </div>
              </div>
            </header>

            {/* Chat Messages Log */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-4">
              
              {/* Vault locked warning inside chat area */}
              {!isVaultUnlocked && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl p-3 flex gap-2 max-w-lg mx-auto">
                  <AlertCircle className="shrink-0" size={16} />
                  <span>
                    Your secure decryption vault is locked. You will not be able to read incoming messages, view attachments, or send new messages until you unlock it in Settings.
                  </span>
                </div>
              )}

              {messagesLoading ? (
                <div className="flex flex-col justify-center items-center py-20">
                  <Loader2 className="animate-spin text-blue-600 mb-2" size={24} />
                  <span className="text-gray-400 text-xs">Loading secure message log...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-20 text-gray-400 text-xs">
                  This chat is completely end-to-end encrypted. No plaintext history is ever sent to or stored on the server.
                </div>
              ) : (
                messages.map(msg => {
                  const isMe = msg.senderId === user.id;
                  const isDeleted = !!msg.deletedAt;
                  const parentMsg = msg.replyTo ? messages.find(m => m.id === msg.replyTo) : null;
                  
                  // Group reactions for this message
                  const groupedReactions = {};
                  (msg.reactions || []).forEach(r => {
                    if (!groupedReactions[r.emoji]) {
                      groupedReactions[r.emoji] = [];
                    }
                    groupedReactions[r.emoji].push(r);
                  });

                  return (
                    <div
                      key={msg.id}
                      id={`msg-${msg.id}`}
                      className={`group relative flex flex-col max-w-[70%] transition-all ${isMe ? "ml-auto items-end" : "mr-auto items-start"}`}
                    >
                      {/* Quoted Message (Reply) */}
                      {msg.replyTo && !isDeleted && (
                        <div 
                          onClick={() => {
                            const element = document.getElementById(`msg-${msg.replyTo}`);
                            if (element) {
                              element.scrollIntoView({ behavior: "smooth", block: "center" });
                              element.classList.add("ring-2", "ring-blue-400", "ring-offset-2");
                              setTimeout(() => {
                                element.classList.remove("ring-2", "ring-blue-400", "ring-offset-2");
                              }, 2000);
                            }
                          }}
                          className={`mb-1.5 p-2 rounded-xl border-l-4 text-xs cursor-pointer transition-all max-w-[260px] truncate ${
                            isMe 
                              ? "bg-blue-700/30 border-blue-400 text-blue-200 hover:bg-blue-700/50 align-self-end mr-1" 
                              : "bg-gray-100 border-gray-400 text-gray-600 hover:bg-gray-200 ml-1"
                          }`}
                        >
                          <div className="font-bold flex items-center gap-1">
                            <Reply size={10} className="transform scale-x-[-1]" />
                            {parentMsg ? getMessageSenderName(parentMsg.senderId) : "Message"}
                          </div>
                          <p className="truncate mt-0.5 max-w-[200px]">
                            {parentMsg 
                              ? (parentMsg.deletedAt 
                                  ? "[This message was deleted]" 
                                  : (parentMsg.messageType === "media" 
                                      ? `📎 File: ${parentMsg.mediaMeta?.filename || "Attachment"}` 
                                      : parentMsg.text))
                              : "Original message content"}
                          </p>
                        </div>
                      )}

                      {/* Message Bubble Container */}
                      <div className="relative">
                        <div className={`p-3.5 rounded-2xl shadow-sm text-sm leading-relaxed ${
                          isDeleted
                            ? "bg-gray-100 text-gray-400 border border-gray-200 italic rounded-2xl"
                            : isMe 
                              ? "bg-blue-600 text-white rounded-br-none" 
                              : "bg-white text-gray-800 border border-gray-100 rounded-bl-none"
                        }`}>
                          {isDeleted ? (
                            <p className="flex items-center gap-1.5 text-xs">
                              <Trash2 size={13} className="opacity-60" />
                              This message was deleted
                            </p>
                          ) : editingMessage?.id === msg.id ? (
                            <InlineEdit
                              initialText={msg.text}
                              onSave={(text) => handleEditMessage(msg.id, text)}
                              onCancel={() => setEditingMessage(null)}
                            />
                          ) : msg.messageType === "text" ? (
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                          ) : msg.mediaMeta ? (
                            <div className="flex flex-col gap-2 min-w-44">
                              <div className="flex items-center gap-2 text-xs border-b border-white/10 pb-1.5 font-medium">
                                <ImageIcon size={14} className={isMe ? "text-blue-200" : "text-gray-400"} />
                                <span className="truncate">{msg.mediaMeta.filename}</span>
                              </div>
                              <DecryptedMedia
                                mediaUrl={msg.mediaUrl}
                                fileKey={msg.mediaMeta.fileKey}
                                iv={msg.mediaMeta.iv}
                                mimeType={msg.mediaMeta.mimeType}
                                filename={msg.mediaMeta.filename}
                              />
                            </div>
                          ) : (
                            <p className="italic text-xs text-red-500">Secure attachment metadata unavailable</p>
                          )}
                        </div>

                        {/* Reaction Badges on Bubble */}
                        {msg.reactions && msg.reactions.length > 0 && !isDeleted && (
                          <div className={`flex flex-wrap items-center gap-1 absolute bottom-[-10px] z-10 ${
                            isMe ? "right-3" : "left-3"
                          }`}>
                            {Object.entries(groupedReactions).map(([emoji, rxList]) => {
                              const hasMyReaction = rxList.some(r => r.userId === user.id);
                              const userNamesList = rxList.map(r => r.username).join(", ");
                              return (
                                <button
                                  key={emoji}
                                  onClick={() => handleToggleReaction(msg.id, emoji)}
                                  title={userNamesList}
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border shadow-sm transition-all cursor-pointer ${
                                    hasMyReaction 
                                      ? "bg-blue-50 border-blue-200 text-blue-700 font-semibold" 
                                      : "bg-white border-gray-100 text-gray-500 hover:bg-gray-50"
                                  }`}
                                >
                                  <span>{emoji}</span>
                                  {rxList.length > 1 && <span>{rxList.length}</span>}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Hover Actions Menu */}
                      {!isDeleted && editingMessage?.id !== msg.id && (
                        <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-2 bg-white border border-gray-200 shadow-md py-1 px-2.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 ${
                          isMe ? "right-full mr-3" : "left-full ml-3"
                        }`}>
                          {/* Quick Reactions */}
                          <div className="flex items-center gap-1">
                            {["👍", "❤️", "😂", "😮", "😢", "🙏"].map(emoji => (
                              <button
                                key={emoji}
                                onClick={() => handleToggleReaction(msg.id, emoji)}
                                className="hover:scale-125 transition-transform p-0.5 cursor-pointer text-sm"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                          
                          <div className="w-[1px] h-3.5 bg-gray-200" />
                          
                          {/* Thread Reply */}
                          <button
                            onClick={() => setReplyTo({
                              id: msg.id,
                              text: msg.messageType === "media" ? `📎 File: ${msg.mediaMeta?.filename || "Attachment"}` : msg.text,
                              senderUsername: getMessageSenderName(msg.senderId),
                              isMe
                            })}
                            className="p-1 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-50 transition-colors cursor-pointer"
                            title="Reply"
                          >
                            <Reply size={13} className="transform scale-x-[-1]" />
                          </button>
                          
                          {/* Inline Edit (Sender text message only) */}
                          {isMe && msg.messageType === "text" && (
                            <button
                              onClick={() => setEditingMessage({ id: msg.id, text: msg.text })}
                              className="p-1 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-50 transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <Edit3 size={13} />
                            </button>
                          )}
                          
                          {/* Soft Delete (Sender only) */}
                          {isMe && (
                            <button
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this message?")) {
                                  handleDeleteMessage(msg.id);
                                }
                              }}
                              className="p-1 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-50 transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      )}

                      {/* Message details */}
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-gray-400 font-medium px-1">
                        <span>{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        {msg.edited && !isDeleted && (
                          <span className="italic text-gray-400 font-normal">(edited)</span>
                        )}
                        {isMe && !isDeleted && (
                          <span>
                            {msg.status === "read" ? (
                              <CheckCheck size={13} className="text-blue-500" />
                            ) : msg.status === "delivered" ? (
                              <CheckCheck size={13} className="text-gray-400" />
                            ) : (
                              <Check size={13} className="text-gray-400" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Real-time Typing Bubble */}
              {isPeerTyping && (
                <div className="flex items-center gap-2 mr-auto bg-white border border-gray-100 py-2.5 px-4 rounded-2xl rounded-bl-none shadow-sm max-w-max">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{activeChat.peerUsername} is typing</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Thread Reply Preview */}
            {replyTo && (
              <div className="px-5 py-2.5 border-t border-gray-150 bg-gray-50 flex items-center justify-between transition-all duration-200 animate-fade-in shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Reply size={15} className="text-blue-500 transform scale-x-[-1]" />
                  <div className="text-xs truncate">
                    <span className="font-semibold text-gray-700">Replying to {replyTo.senderUsername}</span>
                    <p className="text-gray-400 text-[11px] mt-0.5 truncate max-w-lg">{replyTo.text}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyTo(null)}
                  className="p-1 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>
            )}

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white shrink-0 flex items-center gap-3">
              {/* Media Upload Trigger */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleMediaUpload}
                className="hidden"
                disabled={uploadingFile || !isVaultUnlocked}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile || !isVaultUnlocked}
                className="p-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-gray-500 hover:text-gray-800 transition-all cursor-pointer disabled:opacity-50"
                title="Send secure attachment"
              >
                {uploadingFile ? (
                  <Loader2 size={20} className="animate-spin text-blue-600" />
                ) : (
                  <Paperclip size={20} />
                )}
              </button>

              <input
                type="text"
                value={inputText}
                onChange={handleInputChange}
                disabled={!isVaultUnlocked}
                placeholder={isVaultUnlocked ? "Type your secure message..." : "Unlock vault in Settings to message"}
                className="flex-1 p-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400 text-sm"
              />

              <button
                type="submit"
                disabled={!inputText.trim() || !isVaultUnlocked}
                className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-100 transition-all cursor-pointer disabled:opacity-50"
              >
                <Send size={20} />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50/50">
            <div className="w-20 h-20 bg-blue-50 border border-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-5 shadow-sm">
              <Shield size={38} className="fill-blue-50" />
            </div>
            <h3 className="font-bold text-xl text-gray-900">End-to-End Encrypted Chat</h3>
            <p className="text-gray-500 text-sm text-center max-w-sm mt-2 leading-relaxed">
              Select a secure conversation from the sidebar to load message logs. All messages and attachments are encrypted locally and decrypted on your device.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
