import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "../../store/authStore.js";
import { getSocket } from "../../lib/socket.js";
import { getPrivateKey, setGroupKey, getGroupKey } from "../../store/cryptoStore.js";
import { useNotificationStore } from "../../store/notificationStore.js";
import { base64ToArrayBuffer } from "../../utils/crypto/helpers.js";
import { getPublicKey } from "../../utils/indexedDB.js";
import { encryptAESKeyForUser } from "../../utils/crypto/keyExchange.js";
import { 
  encryptGroupMessageContent, 
  decryptGroupMessageContent 
} from "../../utils/crypto/groupCrypto.js";
import { 
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
  Users,
  Settings as SettingsIcon,
  Plus,
  UserMinus,
  ShieldAlert,
  ShieldCheck,
  LogOut,
  ArrowLeft,
  Play
} from "lucide-react";

// Sub-component to download, decrypt, and render media files securely
function DecryptedMedia({ mediaUrl, fileKey, iv, mimeType, filename }) {
  const [decryptedUrl, setDecryptedUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const decryptMedia = async () => {
    try {
      setLoading(true);
      setError(false);

      // Download the encrypted file bytes via proxy
      const response = await axios.get(`/api/v1/messages/download?url=${encodeURIComponent(mediaUrl)}`, {
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

  const isImage = mimeType?.startsWith("image/");
  const isVideo = mimeType?.startsWith("video/");

  useEffect(() => {
    if (isImage || isVideo) {
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
        <>
          <div className="rounded-lg overflow-hidden border border-gray-100 max-w-xs shadow-sm bg-white mt-1 cursor-zoom-in hover:brightness-95 transition-all" onClick={() => setIsFullScreen(true)}>
            <img src={decryptedUrl} alt={filename || "E2EE Attachment"} className="w-full max-h-60 object-cover" />
          </div>

          {isFullScreen && (
            <div 
              className="fixed inset-0 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 z-50 animate-in fade-in duration-200"
              onClick={() => setIsFullScreen(false)}
            >
              <button 
                className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2.5 transition-colors cursor-pointer"
                onClick={() => setIsFullScreen(false)}
              >
                <X size={20} />
              </button>

              <img 
                src={decryptedUrl} 
                alt={filename || "E2EE Attachment"} 
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200" 
                onClick={(e) => e.stopPropagation()} 
              />

              <div className="mt-4 flex items-center gap-4 text-white" onClick={(e) => e.stopPropagation()}>
                <span className="text-sm font-medium opacity-85 truncate max-w-xs">{filename}</span>
                <a
                  href={decryptedUrl}
                  download={filename || "image"}
                  className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-lg transition-colors border border-white/10"
                >
                  <Download size={14} />
                  Download
                </a>
              </div>
            </div>
          )}
        </>
      );
    }

    if (isVideo) {
      return (
        <>
          <div className="relative rounded-lg overflow-hidden border border-gray-100 max-w-xs shadow-sm bg-white mt-1 cursor-zoom-in hover:brightness-95 transition-all" onClick={() => setIsFullScreen(true)}>
            <video src={decryptedUrl} className="w-full max-h-60 object-cover" muted playsInline />
            <div className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/20 transition-all">
              <div className="bg-white/80 rounded-full p-2 text-gray-800 shadow-md">
                <Play size={16} fill="currentColor" />
              </div>
            </div>
          </div>

          {isFullScreen && (
            <div 
              className="fixed inset-0 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 z-50 animate-in fade-in duration-200"
              onClick={() => setIsFullScreen(false)}
            >
              <button 
                className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2.5 transition-colors cursor-pointer"
                onClick={() => setIsFullScreen(false)}
              >
                <X size={20} />
              </button>

              <video 
                src={decryptedUrl} 
                controls 
                autoPlay 
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200" 
                onClick={(e) => e.stopPropagation()} 
              />

              <div className="mt-4 flex items-center gap-4 text-white" onClick={(e) => e.stopPropagation()}>
                <span className="text-sm font-medium opacity-85 truncate max-w-xs">{filename}</span>
                <a
                  href={decryptedUrl}
                  download={filename || "video"}
                  className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-lg transition-colors border border-white/10"
                >
                  <Download size={14} />
                  Download
                </a>
              </div>
            </div>
          )}
        </>
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

const getGroupTimestamp = (group) => {
  if (!group) return 0;
  const timeStr = group.lastActivityAt || group.createdAt;
  if (!timeStr) return 0;
  const parsed = new Date(timeStr).getTime();
  return isNaN(parsed) ? 0 : parsed;
};

export default function Groups() {
  const { accessToken, user } = useAuthStore();
  const unreadGroups = useNotificationStore(state => state.unreadGroups);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Vault states
  const privateKey = getPrivateKey();
  const isVaultUnlocked = !!privateKey;
  const socket = getSocket();

  // Active chat state
  const [activeGroup, setActiveGroup] = useState(null);

  useEffect(() => {
    useNotificationStore.getState().setActiveGroupId(activeGroup?.groupId || null);
    return () => {
      useNotificationStore.getState().setActiveGroupId(null);
    };
  }, [activeGroup]);

  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [inputText, setInputText] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);

  // Group settings & management
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [friendsList, setFriendsList] = useState([]);
  const [isRotatingKeys, setIsRotatingKeys] = useState(false);

  // Creation Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [selectedFriends, setSelectedFriends] = useState([]);

  // UI interaction states
  const [typingMembers, setTypingMembers] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  // Decrypt and store a group AES key in local memory
  const decryptAndStoreGroupAESKey = async (groupId, encryptedGroupKey) => {
    if (!privateKey || !encryptedGroupKey) return false;
    try {
      const encryptedBuf = base64ToArrayBuffer(encryptedGroupKey);
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
      setGroupKey(groupId, aesKey);
      return true;
    } catch (err) {
      console.error(`Failed to decrypt AES key for group ${groupId}:`, err);
      return false;
    }
  };

  // Fetch groups list
  const fetchGroups = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await axios.get("/api/v1/groups/list", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      const fetchedGroups = response.data;
      const decryptedGroups = await Promise.all(
        fetchedGroups.map(async (group) => {
          let isDecrypted = false;
          if (isVaultUnlocked && group.encryptedGroupKey) {
            isDecrypted = await decryptAndStoreGroupAESKey(group.groupId, group.encryptedGroupKey);
          }
          return { ...group, isDecrypted };
        })
      );

      // Sort by lastActivityAt descending
      const sorted = decryptedGroups.sort((a, b) => getGroupTimestamp(b) - getGroupTimestamp(a));
      setGroups(sorted);
    } catch (err) {
      console.error("Failed to fetch groups list:", err);
      setError("Failed to load group chats. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch friends connections (for group creation / additions)
  const fetchFriends = async () => {
    try {
      const response = await axios.get("/api/v1/connections/list", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setFriendsList(response.data);
    } catch (err) {
      console.error("Failed to fetch friends list:", err);
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchGroups();
      fetchFriends();
    }
  }, [accessToken, isVaultUnlocked]);

  // Load message logs for active group and decrypt them
  const loadGroupMessages = async (group) => {
    try {
      setMessagesLoading(true);
      setTypingMembers([]);
      const response = await axios.get(`/api/v1/groups/${group.groupId}/history`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      const rawMsgs = response.data;
      const decryptedMsgs = await Promise.all(
        rawMsgs.map(async (msg) => {
          let decryptedBody = "";
          const isDeleted = !!msg.deleted_at;

          if (!isDeleted) {
            try {
              if (msg.message_type === "text") {
                decryptedBody = await decryptGroupMessageContent(msg.encrypted_content, group.groupId);
              } else if (msg.message_type === "media") {
                const metaString = await decryptGroupMessageContent(msg.encrypted_content, group.groupId);
                const mediaMeta = JSON.parse(metaString);
                return {
                  id: msg.message_id,
                  senderId: msg.sender_id,
                  senderUsername: msg.sender_username || "Group Member",
                  messageType: msg.message_type,
                  mediaMeta,
                  mediaUrl: msg.media_url,
                  createdAt: msg.created_at,
                  replyTo: msg.reply_to,
                  edited: msg.edited,
                  editedAt: msg.edited_at,
                  deletedAt: msg.deleted_at,
                  reactions: msg.reactions || []
                };
              }
            } catch (err) {
              console.error("Decryption error for msg:", msg.message_id, err);
              decryptedBody = "[Vault locked or key rotation error]";
            }
          }

          return {
            id: msg.message_id,
            senderId: msg.sender_id,
            senderUsername: msg.sender_username || "Group Member",
            messageType: msg.message_type,
            text: decryptedBody,
            mediaUrl: msg.media_url,
            createdAt: msg.created_at,
            replyTo: msg.reply_to,
            edited: msg.edited,
            editedAt: msg.edited_at,
            deletedAt: msg.deleted_at,
            reactions: msg.reactions || []
          };
        })
      );

      setMessages(decryptedMsgs);
    } catch (err) {
      console.error("Failed to load group history:", err);
      toast.error("Failed to load group conversation history.");
    } finally {
      setMessagesLoading(false);
    }
  };

  useEffect(() => {
    if (activeGroup && isVaultUnlocked) {
      loadGroupMessages(activeGroup);
    } else {
      setMessages([]);
    }
  }, [activeGroup, isVaultUnlocked]);

  // Handle auto-scrolling
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingMembers]);

  // Handle real-time socket events
  useEffect(() => {
    if (!socket) return;

    const handleMessageReceived = async (payload) => {
      // If it belongs to the active group, decrypt and append
      if (activeGroup && payload.groupId === activeGroup.groupId) {
        let decryptedBody = "";
        try {
          if (payload.messageType === "text") {
            decryptedBody = await decryptGroupMessageContent(payload.ciphertext, activeGroup.groupId);
          } else if (payload.messageType === "media") {
            const metaString = await decryptGroupMessageContent(payload.ciphertext, activeGroup.groupId);
            const mediaMeta = JSON.parse(metaString);
            setMessages(prev => [...prev, {
              id: payload.messageId,
              senderId: payload.senderId,
              senderUsername: payload.senderUsername,
              messageType: payload.messageType,
              mediaMeta,
              mediaUrl: payload.mediaUrl,
              replyTo: payload.replyTo,
              createdAt: payload.createdAt,
              edited: false,
              reactions: []
            }]);
            return;
          }
        } catch (err) {
          console.error("Failed to decrypt real-time group message:", err);
          decryptedBody = "[Failed to decrypt message]";
        }

        setMessages(prev => [...prev, {
          id: payload.messageId,
          senderId: payload.senderId,
          senderUsername: payload.senderUsername,
          messageType: payload.messageType,
          text: decryptedBody,
          mediaUrl: payload.mediaUrl,
          replyTo: payload.replyTo,
          createdAt: payload.createdAt,
          edited: false,
          reactions: []
        }]);
      }

      // Update lastActivityAt in groups list and re-sort
      setGroups(prev => {
        const updated = prev.map(g => {
          if (g.groupId === payload.groupId) {
            return { ...g, lastActivityAt: payload.createdAt };
          }
          return g;
        });
        return updated.sort((a, b) => getGroupTimestamp(b) - getGroupTimestamp(a));
      });
    };

    const handleMessageEdited = async (payload) => {
      if (activeGroup && payload.groupId === activeGroup.groupId) {
        let decryptedText = "";
        try {
          decryptedText = await decryptGroupMessageContent(payload.ciphertext, activeGroup.groupId);
        } catch (err) {
          console.error("Failed to decrypt edited message:", err);
          decryptedText = "[Decryption failure]";
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
      if (activeGroup && payload.groupId === activeGroup.groupId) {
        setMessages(prev => prev.map(m => {
          if (m.id === payload.messageId) {
            return { ...m, text: "", mediaMeta: null, mediaUrl: "", deletedAt: payload.deletedAt };
          }
          return m;
        }));
      }
    };

    const handleMessageReacted = (payload) => {
      if (activeGroup && payload.groupId === activeGroup.groupId) {
        setMessages(prev => prev.map(m => {
          if (m.id === payload.messageId) {
            const current = m.reactions || [];
            if (payload.action === "remove") {
              return {
                ...m,
                reactions: current.filter(r => !(r.userId === payload.userId && r.emoji === payload.emoji))
              };
            } else if (payload.action === "change") {
              return {
                ...m,
                reactions: current.map(r => r.userId === payload.userId ? payload.reaction : r)
              };
            } else if (payload.action === "add") {
              if (current.some(r => r.userId === payload.userId && r.emoji === payload.emoji)) {
                return m;
              }
              return {
                ...m,
                reactions: [...current, payload.reaction]
              };
            }
          }
          return m;
        }));
      }
    };

    const handleTypingStart = (payload) => {
      if (activeGroup && payload.groupId === activeGroup.groupId && payload.userId !== user.id) {
        setTypingMembers(prev => {
          if (prev.some(m => m.userId === payload.userId)) return prev;
          return [...prev, payload];
        });
      }
    };

    const handleTypingStop = (payload) => {
      if (activeGroup && payload.groupId === activeGroup.groupId) {
        setTypingMembers(prev => prev.filter(m => m.userId !== payload.userId));
      }
    };

    const handleMemberAdded = (payload) => {
      if (activeGroup && payload.groupId === activeGroup.groupId) {
        // Reload group members list in Settings
        fetchGroupMembers(activeGroup.groupId);
        toast.success("New member added to the group!");
      }
    };

    const handleMemberRemoved = async (payload) => {
      // If we are the one removed, notify us and kick us out of this active view
      if (payload.userId === user.id) {
        toast.error("You have been removed from this group.");
        if (activeGroup && activeGroup.groupId === payload.groupId) {
          setActiveGroup(null);
        }
        fetchGroups();
        return;
      }

      // If we are remaining, apply key rotation if we are in active view
      if (activeGroup && payload.groupId === activeGroup.groupId) {
        fetchGroupMembers(activeGroup.groupId);

        // Extract our rotated key from list
        const myRotatedKeyInfo = payload.rotatedKeys?.find(rk => rk.userId === user.id);
        if (myRotatedKeyInfo) {
          setIsRotatingKeys(true);
          const decrypted = await decryptAndStoreGroupAESKey(payload.groupId, myRotatedKeyInfo.encryptedGroupKey);
          setIsRotatingKeys(false);
          if (decrypted) {
            toast.success("Security keys successfully rotated.");
          } else {
            toast.error("Failed to decrypt rotated security keys. Vault may be locked.");
          }
        }
      }

      // Refresh groups list to make sure we're up to date
      fetchGroups();
    };

    const handleRoleChanged = (payload) => {
      if (activeGroup && payload.groupId === activeGroup.groupId) {
        fetchGroupMembers(activeGroup.groupId);
        if (payload.userId === user.id) {
          toast.success(`Your role was updated to ${payload.role}.`);
        }
      }
    };

    socket.on("group:message-received", handleMessageReceived);
    socket.on("group:message-edited", handleMessageEdited);
    socket.on("group:message-deleted", handleMessageDeleted);
    socket.on("group:message-reacted", handleMessageReacted);
    socket.on("group:typing-start", handleTypingStart);
    socket.on("group:typing-stop", handleTypingStop);
    socket.on("group:member-added", handleMemberAdded);
    socket.on("group:member-removed", handleMemberRemoved);
    socket.on("group:role-changed", handleRoleChanged);

    return () => {
      socket.off("group:message-received", handleMessageReceived);
      socket.off("group:message-edited", handleMessageEdited);
      socket.off("group:message-deleted", handleMessageDeleted);
      socket.off("group:message-reacted", handleMessageReacted);
      socket.off("group:typing-start", handleTypingStart);
      socket.off("group:typing-stop", handleTypingStop);
      socket.off("group:member-added", handleMemberAdded);
      socket.off("group:member-removed", handleMemberRemoved);
      socket.off("group:role-changed", handleRoleChanged);
    };
  }, [socket, activeGroup]);

  // Handle typing input trigger
  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (!socket || !activeGroup) return;

    socket.emit("group:typing-start", { groupId: activeGroup.groupId });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("group:typing-stop", { groupId: activeGroup.groupId });
    }, 2000);
  };

  // Send Group Message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeGroup || !socket) return;

    if (!isVaultUnlocked) {
      toast.error("Unlock vault in Settings to send secure messages.");
      return;
    }

    const textToSend = inputText.trim();
    setInputText("");

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket.emit("group:typing-stop", { groupId: activeGroup.groupId });

    try {
      const ciphertext = await encryptGroupMessageContent(textToSend, activeGroup.groupId);

      socket.emit("group:message-send", {
        groupId: activeGroup.groupId,
        ciphertext,
        messageType: "text",
        replyTo: replyTo ? replyTo.id : null
      }, (response) => {
        if (response.success) {
          setReplyTo(null);
        } else {
          toast.error(response.error || "Failed to send message");
        }
      });
    } catch (err) {
      console.error("Message send E2EE failure:", err);
      toast.error("Failed to encrypt message.");
    }
  };

  // Send Attachment
  const handleAttachFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeGroup || !socket) return;

    if (!isVaultUnlocked) {
      toast.error("Unlock vault in Settings to upload attachments.");
      return;
    }

    let uploadToastId = null;

    try {
      setUploadingFile(true);
      uploadToastId = toast.loading(`Encrypting & uploading ${file.name}...`);

      // 1. Encrypt the media file locally with a random symmetric key
      const { encryptedBlob, fileKeyBase64, ivBase64 } = await encryptMediaFile(file);

      // 2. Upload the encrypted blob to Cloudinary/server
      const formData = new FormData();
      formData.append("file", encryptedBlob, file.name);

      const uploadRes = await axios.post("/api/v1/messages/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${accessToken}`
        }
      });

      const fileUrl = uploadRes.data.url;

      // 3. Encrypt the key and IV metadata using the group AES key
      const metadataPayload = JSON.stringify({
        fileKey: fileKeyBase64,
        iv: ivBase64,
        filename: file.name,
        mimeType: file.type
      });

      const ciphertext = await encryptGroupMessageContent(metadataPayload, activeGroup.groupId);

      // 4. Send group message
      socket.emit("group:message-send", {
        groupId: activeGroup.groupId,
        ciphertext,
        messageType: "media",
        mediaUrl: fileUrl,
        replyTo: replyTo ? replyTo.id : null
      }, (response) => {
        if (uploadToastId) toast.dismiss(uploadToastId);
        if (response.success) {
          setReplyTo(null);
          toast.success("Secure attachment sent!");
        } else {
          toast.error(response.error || "Failed to send attachment");
        }
      });
    } catch (err) {
      if (uploadToastId) toast.dismiss(uploadToastId);
      console.error("Media upload error:", err);
      
      const errorMsg = err.response?.data?.error || "Error on database/storage side. Please wait and try again.";
      
      toast.error((t) => (
        <div className="flex flex-col gap-2 p-1 text-sm text-gray-800">
          <span className="font-semibold text-red-600">{errorMsg}</span>
          <div className="flex gap-2 mt-1">
            <button
              onClick={async () => {
                toast.dismiss(t.id);
                const reportToastId = toast.loading("Sending error report to admin...");
                try {
                  await axios.post("/api/v1/messages/report-error", {
                    errorDetails: {
                      message: err.message,
                      status: err.response?.status,
                      data: err.response?.data,
                      stack: err.stack
                    },
                    fileName: file.name
                  }, {
                    headers: { Authorization: `Bearer ${accessToken}` }
                  });
                  toast.success("Error report sent to developers!", { id: reportToastId });
                } catch (reportErr) {
                  console.error("Failed to send error report:", reportErr);
                  toast.error("Failed to send report. Please email admin directly.", { id: reportToastId });
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-2.5 py-1 rounded transition-colors cursor-pointer"
            >
              Report to developers
            </button>
            <a
              href={`mailto:admin@stealthchat.app?subject=Upload%20Error%20Report&body=User%20ID:%20${user.id}%0AFile:%20${encodeURIComponent(file.name)}%0AError:%20${encodeURIComponent(err.message)}`}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-2.5 py-1 rounded transition-colors border border-gray-300 inline-flex items-center"
            >
              Email Support
            </a>
          </div>
        </div>
      ), { duration: 10000 });
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Toggle Reaction
  const handleToggleReaction = (messageId, emoji) => {
    if (!socket || !activeGroup) return;
    socket.emit("group:message-react", { messageId, emoji }, (res) => {
      if (!res.success) {
        toast.error("Failed to toggle reaction");
      }
    });
  };

  // Edit message
  const handleEditSave = (messageId, newText) => {
    if (!socket || !activeGroup) return;
    encryptGroupMessageContent(newText, activeGroup.groupId)
      .then(ciphertext => {
        socket.emit("group:message-edit", { messageId, ciphertext }, (res) => {
          if (res.success) {
            setEditingMessage(null);
            toast.success("Message edited!");
          } else {
            toast.error(res.error || "Failed to edit message");
          }
        });
      })
      .catch(err => {
        console.error("E2EE Edit error:", err);
        toast.error("Failed to encrypt edit");
      });
  };

  // Delete message
  const handleDeleteMessage = (messageId) => {
    if (!socket) return;
    if (!window.confirm("Are you sure you want to delete this message?")) return;

    socket.emit("group:message-delete", { messageId }, (res) => {
      if (res.success) {
        toast.success("Message deleted!");
      } else {
        toast.error(res.error || "Failed to delete message");
      }
    });
  };

  // Group creation handler
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim() || !socket) return;

    try {
      const creationToastId = toast.loading("Generating secure E2EE group keys...");

      // 1. Generate a new random AES key for the group
      const groupAesKey = await window.crypto.subtle.generateKey(
        {
          name: "AES-GCM",
          length: 256
        },
        true,
        ["encrypt", "decrypt"]
      );

      const rawGroupKey = await window.crypto.subtle.exportKey("raw", groupAesKey);

      // 2. Encrypt the group key for ourselves (creator)
      const myPublicKey = await getPublicKey(user.id);
      if (!myPublicKey) {
        throw new Error("Local public key not found in IndexedDB. Is your vault unlocked?");
      }

      const encryptedGroupKeyForMe = await encryptAESKeyForUser(rawGroupKey, myPublicKey);

      // 3. Emit group creation event
      socket.emit("group:create", {
        groupName: newGroupName.trim(),
        description: newGroupDesc.trim() || null,
        encryptedGroupKey: encryptedGroupKeyForMe
      }, async (res) => {
        if (!res.success) {
          toast.dismiss(creationToastId);
          toast.error(res.error || "Failed to create group");
          return;
        }

        const newGroupObj = {
          groupId: res.group.group_id,
          groupName: res.group.group_name,
          description: res.group.description,
          role: "owner",
          isDecrypted: true,
          createdAt: res.group.created_at,
          lastActivityAt: res.group.created_at
        };

        setGroupKey(newGroupObj.groupId, groupAesKey);

        // 4. Distribute encrypted group key to each selected initial member
        if (selectedFriends.length > 0) {
          toast.loading("Inviting initial members and distributing keys...", { id: creationToastId });

          for (const friendId of selectedFriends) {
            try {
              // Fetch friend's public key
              const pkRes = await axios.get(`/api/v1/users/public-key/${friendId}`, {
                headers: { Authorization: `Bearer ${accessToken}` }
              });

              const friendPublicKey = pkRes.data.publicKey;
              if (friendPublicKey) {
                // Encrypt group symmetric key with friend's RSA public key
                const encryptedKeyForFriend = await encryptAESKeyForUser(rawGroupKey, friendPublicKey);
                
                // Add to group
                await new Promise((resolve) => {
                  socket.emit("group:member-add", {
                    groupId: newGroupObj.groupId,
                    userId: friendId,
                    encryptedGroupKey: encryptedKeyForFriend
                  }, (addRes) => {
                    if (!addRes.success) {
                      console.error(`Failed to add friend ${friendId} to group:`, addRes.error);
                    }
                    resolve();
                  });
                });
              }
            } catch (pkErr) {
              console.error(`Error inviting friend ${friendId}:`, pkErr);
            }
          }
        }

        toast.dismiss(creationToastId);
        toast.success("Secure E2EE Group Created!");
        
        setIsCreateOpen(false);
        setNewGroupName("");
        setNewGroupDesc("");
        setSelectedFriends([]);

        // Refresh groups
        await fetchGroups();
        setActiveGroup(newGroupObj);
      });
    } catch (err) {
      console.error("Group creation E2EE failure:", err);
      toast.error(err.message || "Failed to create E2EE group keys");
    }
  };

  // Toggle selected friend in creation modal
  const handleToggleFriend = (friendId) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]
    );
  };

  // Group settings & member management functions
  const fetchGroupMembers = async (groupId) => {
    try {
      const response = await axios.get(`/api/v1/groups/${groupId}/members`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setGroupMembers(response.data);
    } catch (err) {
      console.error("Failed to load group members:", err);
    }
  };

  const openGroupSettings = () => {
    if (!activeGroup) return;
    setIsSettingsOpen(true);
    setIsAddingMember(false);
    fetchGroupMembers(activeGroup.groupId);
  };

  // Change member role
  const handleChangeRole = (targetUserId, newRole) => {
    if (!socket || !activeGroup) return;

    socket.emit("group:role-change", {
      groupId: activeGroup.groupId,
      userId: targetUserId,
      role: newRole
    }, (res) => {
      if (res.success) {
        toast.success("Member role updated!");
        fetchGroupMembers(activeGroup.groupId);
      } else {
        toast.error(res.error || "Failed to update role");
      }
    });
  };

  // Remove Group Member (includes E2EE Key Rotation!)
  const handleRemoveMember = async (removeUserId) => {
    if (!socket || !activeGroup) return;
    
    const isSelf = removeUserId === user.id;
    const confirmMsg = isSelf 
      ? "Are you sure you want to leave this group? Security keys will be rotated for remaining members."
      : "Are you sure you want to remove this member? Security keys will be rotated immediately for all other members.";

    if (!window.confirm(confirmMsg)) return;

    try {
      setIsRotatingKeys(true);
      const rotateToastId = toast.loading("Generating and encrypting new group security keys...");

      // 1. Generate a brand new AES key
      const newAesKey = await window.crypto.subtle.generateKey(
        {
          name: "AES-GCM",
          length: 256
        },
        true,
        ["encrypt", "decrypt"]
      );

      const rawNewKey = await window.crypto.subtle.exportKey("raw", newAesKey);

      // 2. Fetch public keys of all remaining members and encrypt the new key for them
      const remainingMembers = groupMembers.filter(m => m.userId !== removeUserId);
      const rotatedKeys = [];

      for (const member of remainingMembers) {
        try {
          const pkRes = await axios.get(`/api/v1/users/public-key/${member.userId}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          const publicKey = pkRes.data.publicKey;
          if (publicKey) {
            const encryptedGroupKey = await encryptAESKeyForUser(rawNewKey, publicKey);
            rotatedKeys.push({
              userId: member.userId,
              encryptedGroupKey
            });
          }
        } catch (pkErr) {
          console.error(`Failed to rotate key for remaining member ${member.userId}:`, pkErr);
        }
      }

      // 3. Emit member removal event
      socket.emit("group:member-remove", {
        groupId: activeGroup.groupId,
        userId: removeUserId,
        rotatedKeys
      }, (res) => {
        toast.dismiss(rotateToastId);
        setIsRotatingKeys(false);

        if (res.success) {
          if (isSelf) {
            toast.success("You left the group.");
            setActiveGroup(null);
            setIsSettingsOpen(false);
          } else {
            toast.success("Member removed and group keys rotated successfully!");
            // Update local symmetric key
            setGroupKey(activeGroup.groupId, newAesKey);
            fetchGroupMembers(activeGroup.groupId);
          }
          fetchGroups();
        } else {
          toast.error(res.error || "Failed to remove member");
        }
      });
    } catch (err) {
      console.error("Key rotation failure during removal:", err);
      toast.error("Key rotation failed. Operation aborted.");
      setIsRotatingKeys(false);
    }
  };

  // Add Member to existing group
  const handleAddMember = async (friendId) => {
    if (!socket || !activeGroup) return;

    try {
      const addToastId = toast.loading("Inviting member and distributing secure key...");

      // 1. Get current group AES key from local memory
      const aesKey = getGroupKey(activeGroup.groupId);
      if (!aesKey) {
        throw new Error("Group symmetric key not found in memory. Unlock vault first.");
      }

      const rawGroupKey = await window.crypto.subtle.exportKey("raw", aesKey);

      // 2. Fetch friend's public key
      const pkRes = await axios.get(`/api/v1/users/public-key/${friendId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      const publicKey = pkRes.data.publicKey;
      if (!publicKey) {
        throw new Error("Could not retrieve target user public key.");
      }

      // 3. Encrypt group key for target friend
      const encryptedKeyForMember = await encryptAESKeyForUser(rawGroupKey, publicKey);

      // 4. Emit member add
      socket.emit("group:member-add", {
        groupId: activeGroup.groupId,
        userId: friendId,
        encryptedGroupKey: encryptedKeyForMember
      }, (res) => {
        toast.dismiss(addToastId);
        if (res.success) {
          toast.success("Member added to group!");
          fetchGroupMembers(activeGroup.groupId);
          setIsAddingMember(false);
        } else {
          toast.error(res.error || "Failed to add member");
        }
      });
    } catch (err) {
      console.error("Add member E2EE failure:", err);
      toast.error(err.message || "Failed to add member securely");
    }
  };

  const myGroupRole = groupMembers.find(m => m.userId === user.id)?.role;
  const isAdminOrOwner = myGroupRole === "owner" || myGroupRole === "admin";

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden relative font-sans">
      
      {/* Key Rotation Global Overlay Loader */}
      {isRotatingKeys && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex flex-col justify-center items-center text-white gap-3.5 transition-all">
          <Loader2 className="animate-spin text-blue-400" size={42} />
          <p className="font-bold text-lg tracking-wide">Rotating Group Encryption Keys</p>
          <p className="text-xs text-slate-300">Enforcing perfect forward secrecy by encrypting new symmetric keys for remaining members...</p>
        </div>
      )}

      {/* Left Column: Groups Sidebar */}
      <div className={`w-full md:w-[340px] border-r border-gray-200 bg-white flex flex-col shrink-0 h-full shadow-sm z-20 ${
        activeGroup ? "hidden md:flex" : "flex"
      }`}>
        
        {/* Sidebar Header */}
        <header className="p-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <Users className="text-blue-600" size={20} />
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">Group Chats</h1>
            <button
              type="button"
              onClick={fetchGroups}
              disabled={loading}
              className="p-1 hover:bg-gray-100 rounded-full text-gray-500 hover:text-blue-600 transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center"
              title="Refresh groups"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-blue-600" : ""} />
            </button>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="p-2 bg-blue-50 hover:bg-blue-100/70 text-blue-600 rounded-lg transition-all duration-200 cursor-pointer shadow-sm hover:scale-105"
            title="Create New Group"
          >
            <Plus size={16} />
          </button>
        </header>

        {/* Groups List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="animate-spin text-blue-600" size={24} />
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-12 px-6 text-gray-400 text-xs leading-relaxed">
              No group chats found. Click the + button above to create one.
            </div>
          ) : (
            <ul className="divide-y divide-gray-50/50">
              {groups.map(g => (
                <li key={g.groupId}>
                  <button
                    onClick={() => setActiveGroup(g)}
                    className={`w-full flex items-center gap-3.5 p-4 text-left transition-all duration-200 cursor-pointer border-l-4 ${
                      activeGroup?.groupId === g.groupId 
                        ? "bg-blue-50/60 border-blue-600" 
                        : "hover:bg-slate-50/50 border-transparent"
                    }`}
                  >
                    <div className="shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center shadow-sm">
                        {g.groupName.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-gray-900 truncate">{g.groupName}</p>
                        {g.role && (
                          <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${
                            g.role === "owner" 
                              ? "bg-amber-50 text-amber-700 border border-amber-200" 
                              : g.role === "admin" 
                                ? "bg-indigo-50 text-indigo-700 border border-indigo-200" 
                                : "bg-gray-100 text-gray-600 border border-gray-200"
                          }`}>
                            {g.role}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        {g.isDecrypted ? (
                          <span className="text-green-600 flex items-center gap-1 font-medium"><Unlock size={10} /> E2EE Ready</span>
                        ) : (
                          <span className="text-amber-500 flex items-center gap-1 font-medium"><Lock size={10} /> Locked</span>
                        )}
                      </p>
                    </div>
                    {unreadGroups[g.groupId] > 0 && (
                      <div className="shrink-0 flex items-center justify-center">
                        <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold bg-blue-600 text-white rounded-full leading-none min-w-4 h-4 shadow-sm">
                          {unreadGroups[g.groupId]}
                        </span>
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Right Column: E2EE Group Chat Area */}
      <div className={`flex-1 flex flex-col bg-white overflow-hidden h-full ${
        activeGroup ? "flex" : "hidden md:flex"
      }`}>
        {activeGroup ? (
          <>
            {/* Header */}
            <header className="px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between shadow-sm shrink-0 z-10">
              <div className="flex items-center gap-3.5">
                <button
                  onClick={() => setActiveGroup(null)}
                  className="md:hidden p-1.5 text-gray-500 hover:bg-gray-150 rounded-lg mr-1 cursor-pointer transition-colors"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center shadow-md">
                  {activeGroup.groupName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 text-base">{activeGroup.groupName}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-green-500 font-semibold flex items-center gap-1">
                      <Shield size={12} className="text-green-500 fill-green-50" />
                      E2EE Group Key Active
                    </p>
                    {activeGroup.description && (
                      <>
                        <span className="text-gray-300 text-[10px]">•</span>
                        <p className="text-xs text-gray-500 truncate max-w-xs">{activeGroup.description}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <button
                onClick={openGroupSettings}
                className="p-2 hover:bg-gray-100 text-gray-500 hover:text-gray-800 rounded-lg transition-colors cursor-pointer"
                title="Group Members & Settings"
              >
                <SettingsIcon size={18} />
              </button>
            </header>

            {/* Message Pane */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-4">
              
              {!isVaultUnlocked && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl p-3.5 flex gap-2 max-w-lg mx-auto shadow-sm">
                  <AlertCircle className="shrink-0 text-amber-600" size={16} />
                  <span>
                    Your secure decryption vault is locked. Unlock it in Settings to read and send messages.
                  </span>
                </div>
              )}

              {messagesLoading ? (
                <div className="flex flex-col justify-center items-center py-20 gap-2">
                  <Loader2 className="animate-spin text-blue-600" size={24} />
                  <span className="text-gray-400 text-xs">Loading secure group history...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-20 text-gray-400 text-xs leading-relaxed max-w-sm mx-auto">
                  No group messages. This conversation is fully encrypted client-side. Server stores only encrypted cyphertext.
                </div>
              ) : (
                messages.map(msg => {
                  const isMe = msg.senderId === user.id;
                  const isDeleted = !!msg.deletedAt;
                  const parentMsg = msg.replyTo ? messages.find(m => m.id === msg.replyTo) : null;
                  
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
                      {/* Sender Username tag */}
                      {!isMe && (
                        <span className="text-[10px] text-gray-400 font-semibold mb-1 ml-1.5">
                          {msg.senderUsername}
                        </span>
                      )}

                      {/* Quoted Reply */}
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
                              ? "bg-blue-700/30 border-blue-400 text-blue-200 hover:bg-blue-700/50 mr-1" 
                              : "bg-gray-100 border-gray-400 text-gray-600 hover:bg-gray-200 ml-1"
                          }`}
                        >
                          <p className="font-semibold text-[9px] uppercase tracking-wide opacity-80">
                            {parentMsg ? (parentMsg.senderId === user.id ? "You" : parentMsg.senderUsername) : "Deleted message"}
                          </p>
                          <p className="truncate">
                            {parentMsg ? (parentMsg.deletedAt ? "[Deleted Message]" : parentMsg.messageType === "media" ? "📎 Secure Attachment" : parentMsg.text) : "[Message not loaded]"}
                          </p>
                        </div>
                      )}

                      {/* Bubble */}
                      <div className={`relative px-4 py-2.5 rounded-2xl shadow-sm border ${
                        isMe 
                          ? "bg-blue-600 text-white border-blue-700 rounded-tr-none" 
                          : "bg-white text-gray-900 border-gray-100 rounded-tl-none"
                      }`}>
                        
                        {isDeleted ? (
                          <span className="text-xs italic text-gray-400">Message deleted</span>
                        ) : editingMessage?.id === msg.id ? (
                          <InlineEdit
                            initialText={msg.text}
                            onSave={(newText) => handleEditSave(msg.id, newText)}
                            onCancel={() => setEditingMessage(null)}
                          />
                        ) : (
                          <div className="flex flex-col gap-1">
                            {msg.messageType === "media" && msg.mediaMeta && (
                              <DecryptedMedia
                                mediaUrl={msg.mediaUrl}
                                fileKey={msg.mediaMeta.fileKey}
                                iv={msg.mediaMeta.iv}
                                mimeType={msg.mediaMeta.mimeType}
                                filename={msg.mediaMeta.filename}
                              />
                            )}
                            {msg.messageType === "text" && (
                              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                            )}
                          </div>
                        )}

                        {/* Message Metadata */}
                        {!isDeleted && editingMessage?.id !== msg.id && (
                          <div className={`flex items-center gap-1.5 mt-1 justify-end select-none`}>
                            <span className={`text-[9px] ${isMe ? "text-blue-200/80" : "text-gray-400"}`}>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {msg.edited && (
                              <span className={`text-[9px] italic ${isMe ? "text-blue-200/60" : "text-gray-400/80"}`}>
                                (edited)
                              </span>
                            )}
                            {isMe && (
                              <CheckCheck size={11} className="text-blue-100/90" />
                            )}
                          </div>
                        )}

                        {/* Reaction floating emoji menu */}
                        {!isDeleted && editingMessage?.id !== msg.id && isVaultUnlocked && (
                          <div className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center bg-white border border-gray-100 rounded-full shadow-lg p-1 gap-1 z-30 ${
                            isMe ? "right-full mr-2" : "left-full ml-2"
                          }`}>
                            {["👍", "❤️", "😂", "😮", "😢", "🙏"].map(emoji => (
                              <button
                                key={emoji}
                                onClick={() => handleToggleReaction(msg.id, emoji)}
                                className="w-6 h-6 flex items-center justify-center text-xs hover:scale-125 transition-transform duration-100 cursor-pointer"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Render reactions list */}
                      {Object.keys(groupedReactions).length > 0 && (
                        <div className={`flex flex-wrap gap-1 mt-1 z-20 ${isMe ? "justify-end" : "justify-start"}`}>
                          {Object.entries(groupedReactions).map(([emoji, rxns]) => {
                            const hasReacted = rxns.some(r => r.userId === user.id);
                            return (
                              <button
                                key={emoji}
                                onClick={() => handleToggleReaction(msg.id, emoji)}
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border transition-colors cursor-pointer select-none ${
                                  hasReacted 
                                    ? "bg-blue-50 border-blue-200 text-blue-700" 
                                    : "bg-white border-gray-150 text-gray-500 hover:bg-gray-50"
                                }`}
                                title={rxns.map(r => r.username).join(", ")}
                              >
                                <span>{emoji}</span>
                                <span>{rxns.length}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Message actions (Reply/Edit/Delete) toolbar */}
                      {!isDeleted && editingMessage?.id !== msg.id && (
                        <div className={`flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 ${
                          isMe ? "justify-end mr-1" : "justify-start ml-1"
                        }`}>
                          <button
                            onClick={() => setReplyTo({ id: msg.id, senderUsername: msg.senderUsername, text: msg.messageType === "media" ? "Secure Attachment" : msg.text })}
                            className="text-[10px] text-gray-400 hover:text-blue-500 flex items-center gap-0.5 cursor-pointer font-medium"
                          >
                            <Reply size={10} /> Reply
                          </button>
                          {isMe && (
                            <>
                              <button
                                onClick={() => setEditingMessage({ id: msg.id, text: msg.text })}
                                className="text-[10px] text-gray-400 hover:text-amber-600 flex items-center gap-0.5 cursor-pointer font-medium"
                              >
                                <Edit3 size={10} /> Edit
                              </button>
                              <button
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="text-[10px] text-gray-400 hover:text-red-600 flex items-center gap-0.5 cursor-pointer font-medium"
                              >
                                <Trash2 size={10} /> Delete
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {/* Typing indicators */}
              {typingMembers.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-gray-400 italic py-1 pl-1">
                  <div className="flex gap-1.5 items-center">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span>
                    {typingMembers.map(m => m.username).join(", ")} {typingMembers.length === 1 ? "is" : "are"} typing...
                  </span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            {isVaultUnlocked && (
              <footer className="p-4 border-t border-gray-150 bg-white shrink-0">
                {replyTo && (
                  <div className="mb-2 p-2 bg-blue-50/70 border-l-4 border-blue-500 rounded-lg flex items-center justify-between text-xs text-blue-900 shadow-inner">
                    <div className="truncate">
                      <span className="font-bold">Replying to {replyTo.senderUsername}:</span>{" "}
                      <span className="italic">{replyTo.text}</span>
                    </div>
                    <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-red-500 cursor-pointer">
                      <X size={14} />
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="flex gap-3 items-center">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAttachFile}
                    className="hidden"
                    accept="image/*,application/pdf,application/zip"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                    className="p-3 text-gray-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50/70 border border-gray-100 rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-50 shrink-0 shadow-sm"
                    title="Attach File"
                  >
                    {uploadingFile ? (
                      <Loader2 className="animate-spin text-blue-600" size={18} />
                    ) : (
                      <Paperclip size={18} />
                    )}
                  </button>

                  <textarea
                    value={inputText}
                    onChange={handleInputChange}
                    placeholder="Write a secure group message..."
                    className="flex-1 p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all resize-none max-h-24 h-11 py-3"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    rows={1}
                  />

                  <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 shadow-sm shadow-blue-150 disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    <Send size={18} />
                  </button>
                </form>
              </footer>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center text-center p-8 bg-slate-50/30">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 flex items-center justify-center text-blue-600 mb-4 shadow-sm border border-blue-100/50">
              <Users size={30} />
            </div>
            <h2 className="text-gray-900 font-bold text-lg tracking-tight">End-to-End Encrypted Groups</h2>
            <p className="text-gray-400 text-xs mt-2 max-w-sm leading-relaxed">
              Create a group and add friends. Sockets broadcast encrypted payloads in real time, and keys are automatically rotated client-side to enforce forward secrecy.
            </p>
          </div>
        )}
      </div>

      {/* MODAL 1: Create Group Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-40">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-gray-900 font-bold text-base flex items-center gap-2">
                <Users className="text-blue-600" size={18} /> Create E2EE Group
              </h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Group Name</label>
                <input
                  type="text"
                  required
                  maxLength={20}
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Project Stealth"
                  className="p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Description</label>
                <textarea
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="What is this group about? (optional)"
                  className="p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-16"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Invite Friends</label>
                <div className="border border-gray-200 rounded-xl max-h-36 overflow-y-auto divide-y divide-gray-100">
                  {friendsList.length === 0 ? (
                    <div className="text-center py-4 text-xs text-gray-400">No connections available. Go to Search to add friends first.</div>
                  ) : (
                    friendsList.map(friend => {
                      const isSelected = selectedFriends.includes(friend.peerId);
                      return (
                        <button
                          key={friend.peerId}
                          type="button"
                          onClick={() => handleToggleFriend(friend.peerId)}
                          className="w-full p-2.5 flex items-center justify-between hover:bg-slate-50/50 text-left transition-colors cursor-pointer text-sm"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs overflow-hidden">
                              {friend.peerProfilePicture ? (
                                <img src={friend.peerProfilePicture} alt={friend.peerUsername} className="w-full h-full object-cover" />
                              ) : (
                                friend.peerUsername.charAt(0).toUpperCase()
                              )}
                            </div>
                            <span className="font-semibold text-gray-800 truncate">{friend.peerUsername}</span>
                          </div>
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                            isSelected ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300"
                          }`}>
                            {isSelected && <Check size={12} />}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2 border-t border-gray-100 mt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 bg-gray-150 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newGroupName.trim() || !isVaultUnlocked}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 cursor-pointer shadow-sm shadow-blue-150"
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Settings & Members Modal */}
      {isSettingsOpen && activeGroup && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-40 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-gray-900 font-bold text-base flex items-center gap-2">
                <SettingsIcon className="text-blue-600" size={18} /> Group Settings
              </h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* View Member list vs Add Member pane */}
            {!isAddingMember ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Group Members ({groupMembers.length})</h4>
                  {isAdminOrOwner && (
                    <button
                      onClick={() => setIsAddingMember(true)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 cursor-pointer"
                    >
                      <UserPlus size={14} /> Add Member
                    </button>
                  )}
                </div>

                <div className="border border-gray-100 rounded-xl max-h-60 overflow-y-auto divide-y divide-gray-50 bg-slate-50/30">
                  {groupMembers.map(member => {
                    const isRemovedTargetMe = member.userId === user.id;
                    const isOwner = member.role === "owner";
                    const isAdmin = member.role === "admin";
                    
                    return (
                      <div key={member.userId} className="p-3 flex items-center justify-between gap-3 text-sm">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs overflow-hidden">
                            {member.profilePicture ? (
                              <img src={member.profilePicture} alt={member.username} className="w-full h-full object-cover" />
                            ) : (
                              member.username.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-gray-800 truncate">{member.username}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">Joined {new Date(member.joinedAt).toLocaleDateString()}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${
                            isOwner 
                              ? "bg-amber-50 text-amber-700 border border-amber-200" 
                              : isAdmin 
                                ? "bg-indigo-50 text-indigo-700 border border-indigo-200" 
                                : "bg-gray-150 text-gray-600 border border-gray-200"
                          }`}>
                            {member.role}
                          </span>

                          {/* Member promotions & removals guards */}
                          {!isOwner && !isRemovedTargetMe && (
                            <>
                              {/* Owners can promote/demote */}
                              {myGroupRole === "owner" && (
                                <select
                                  value={member.role}
                                  onChange={(e) => handleChangeRole(member.userId, e.target.value)}
                                  className="text-xs border border-gray-200 rounded p-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                                >
                                  <option value="member">Member</option>
                                  <option value="admin">Admin</option>
                                </select>
                              )}

                              {/* Admins & Owners can remove members (except owners) */}
                              {isAdminOrOwner && (
                                <button
                                  onClick={() => handleRemoveMember(member.userId)}
                                  className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 cursor-pointer"
                                  title="Remove Member & Rotate Keys"
                                >
                                  <UserMinus size={14} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-3 justify-between pt-3 border-t border-gray-100 mt-2">
                  <button
                    onClick={() => handleRemoveMember(user.id)}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm shadow-red-50"
                  >
                    <LogOut size={13} /> Leave Group
                  </button>
                  <button
                    onClick={() => setIsSettingsOpen(false)}
                    className="px-4 py-2 bg-gray-150 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              // Add Member Pane
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <button onClick={() => setIsAddingMember(false)} className="hover:underline font-bold text-blue-600 cursor-pointer">Members List</button>
                  <span>&gt;</span>
                  <span>Add New Member</span>
                </div>

                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Friend to Invite</h4>
                <div className="border border-gray-100 rounded-xl max-h-60 overflow-y-auto divide-y divide-gray-50 bg-slate-50/30">
                  {friendsList.filter(friend => !groupMembers.some(m => m.userId === friend.peerId)).length === 0 ? (
                    <div className="text-center py-6 text-xs text-gray-400">All available connections are already members of this group.</div>
                  ) : (
                    friendsList
                      .filter(friend => !groupMembers.some(m => m.userId === friend.peerId))
                      .map(friend => (
                        <div key={friend.peerId} className="p-3 flex items-center justify-between gap-3 text-sm">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs overflow-hidden">
                              {friend.peerProfilePicture ? (
                                <img src={friend.peerProfilePicture} alt={friend.peerUsername} className="w-full h-full object-cover" />
                              ) : (
                                friend.peerUsername.charAt(0).toUpperCase()
                              )}
                            </div>
                            <span className="font-bold text-gray-800 truncate">{friend.peerUsername}</span>
                          </div>
                          <button
                            onClick={() => handleAddMember(friend.peerId)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-sm shadow-blue-100"
                          >
                            Add
                          </button>
                        </div>
                      ))
                  )}
                </div>

                <div className="flex justify-end pt-3 border-t border-gray-100 mt-2">
                  <button
                    onClick={() => setIsAddingMember(false)}
                    className="px-4 py-2 bg-gray-150 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
