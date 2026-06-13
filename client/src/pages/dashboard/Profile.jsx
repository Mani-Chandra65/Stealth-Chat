import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { UserPlus, Check, X, MessageSquare } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { getSocket } from "../../lib/socket.js";
import { getPublicKey } from "../../utils/indexedDB.js";
import { generateAndEncryptAESKeys } from "../../utils/crypto/keyExchange.js";
import { setChatKey } from "../../store/cryptoStore.js";

export default function Profile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
  const setCurrentUser = useAuthStore((state) => state.setUser);
  const accessToken = useAuthStore((state) => state.accessToken);
  
  const [userProfile, setUserProfile] = useState(null);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ username: "", bio: "", profilePicture: "" });
  const [saving, setSaving] = useState(false);
  
  // If no username prop is passed, we assume viewing "My Profile"
  const isMyProfile = !username || currentUser?.username === username;
  const targetUsername = username || currentUser?.username;
  const [loading, setLoading] = useState(Boolean(targetUsername));

  useEffect(() => {
    if (!targetUsername) {
      return;
    }

    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/api/v1/users/profile/${targetUsername}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });
        setUserProfile(res.data);
        setEditForm({
          username: res.data.username || "",
          bio: res.data.bio || "",
          profilePicture: res.data.profilePicture || ""
        });
      } catch (err) {
        console.error("Failed to fetch profile:", err);
        setError("User not found or an error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [targetUsername, accessToken]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await axios.put(
        `/api/v1/users/profile`,
        editForm,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );
      setUserProfile(res.data);
      if (res.data.username !== currentUser.username) {
        // Update user context if username changed
        setCurrentUser({ ...currentUser, username: res.data.username });
        navigate(`/profile/${res.data.username}`, { replace: true });
      }
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update profile", err);
      // alert or set error state
      alert(err.response?.data?.error || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleConnect = () => {
    if (!userProfile?.id) return;
    const socket = getSocket();
    if (!socket) {
      toast.error("Not connected to server");
      return;
    }
    socket.emit("connection:send-request", { receiverId: userProfile.id }, (response) => {
      if (response.success) {
        toast.success(response.message || "Connection request sent!");
        setUserProfile(prev => ({
          ...prev,
          connection: {
            connectionId: response.connection.connection_id,
            status: "pending",
            senderId: currentUser.id
          }
        }));
      } else {
        toast.error(response.error || "Failed to send request");
      }
    });
  };

  const handleAccept = async () => {
    if (!userProfile?.connection?.connectionId || !userProfile?.id) return;
    const socket = getSocket();
    if (!socket) {
      toast.error("Not connected to server");
      return;
    }

    const toastId = toast.loading("Performing key exchange...");

    try {
      // 1. Fetch peer public key
      const peerPublicKeyRes = await axios.get(`/api/v1/users/public-key/${userProfile.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const peerPublicKey = peerPublicKeyRes.data.publicKey;

      // 2. Fetch our own public key
      const myPublicKey = await getPublicKey(currentUser.id);

      if (!peerPublicKey || !myPublicKey) {
        throw new Error("Could not retrieve public keys for exchange");
      }

      // 3. Generate symmetric AES key and encrypt for both
      const { aesKey, encryptedAESKeyUser1, encryptedAESKeyUser2 } = await generateAndEncryptAESKeys(peerPublicKey, myPublicKey);

      // 4. Emit accept request
      socket.emit("connection:accept-request", {
        connectionId: userProfile.connection.connectionId,
        encryptedAESKeyUser1,
        encryptedAESKeyUser2
      }, (response) => {
        toast.dismiss(toastId);
        if (response.success) {
          toast.success("Connection accepted!");
          setChatKey(userProfile.connection.connectionId, aesKey);
          setUserProfile(prev => ({
            ...prev,
            connection: {
              ...prev.connection,
              status: "accepted"
            }
          }));
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

  const handleReject = () => {
    if (!userProfile?.connection?.connectionId) return;
    const socket = getSocket();
    if (!socket) {
      toast.error("Not connected to server");
      return;
    }
    socket.emit("connection:reject-request", { connectionId: userProfile.connection.connectionId }, (response) => {
      if (response.success) {
        toast.success(response.message || "Connection rejected!");
        setUserProfile(prev => ({
          ...prev,
          connection: null
        }));
      } else {
        toast.error(response.error || "Failed to reject request");
      }
    });
  };

  if (loading) {
    return <div className="p-8"><p className="text-gray-500">Loading profile...</p></div>;
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-red-600">Error</h1>
        <p className="mt-2 text-gray-700">{error}</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-blue-500 hover:underline">Go Back</button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      {username && (
        <button onClick={() => navigate(-1)} className="mb-6 text-sm text-gray-500 hover:text-gray-900 border px-3 py-1 rounded inline-flex items-center">
          &larr; Back
        </button>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        {isEditing ? (
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Profile</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={editForm.username}
                onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea
                value={editForm.bio}
                onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                rows="3"
                placeholder="Tell us about yourself..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Profile Picture (URL temporarily)</label>
              <input
                type="text"
                value={editForm.profilePicture}
                onChange={(e) => setEditForm({...editForm, profilePicture: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="https://..."
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6">
            <div className="relative">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-blue-100 shrink-0 flex items-center justify-center text-blue-600 text-3xl font-bold overflow-hidden">
                {userProfile?.profilePicture ? (
                  <img src={userProfile.profilePicture} alt={userProfile.username} className="w-full h-full object-cover" />
                ) : (
                  userProfile?.username?.charAt(0).toUpperCase()
                )}
              </div>
            </div>
            
            <div className="text-center sm:text-left flex-1 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{userProfile?.username}</h1>
                  {isMyProfile && (
                    <p className="mt-1 text-gray-500">{userProfile?.email}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {isMyProfile ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Edit Profile
                    </button>
                  ) : !userProfile?.connection ? (
                    <button
                      onClick={handleConnect}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors cursor-pointer"
                    >
                      <UserPlus size={16} />
                      Connect
                    </button>
                  ) : userProfile.connection.status === "pending" ? (
                    userProfile.connection.senderId === currentUser?.id ? (
                      <button
                        disabled
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 bg-gray-100 text-gray-400 rounded-md"
                      >
                        Request Sent
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={handleAccept}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors cursor-pointer"
                        >
                          <Check size={16} />
                          Accept
                        </button>
                        <button
                          onClick={handleReject}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors cursor-pointer"
                        >
                          <X size={16} />
                          Reject
                        </button>
                      </div>
                    )
                  ) : userProfile.connection.status === "accepted" ? (
                    <button
                      onClick={() => navigate("/chats")}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-green-100 text-green-800 border border-green-200 rounded-md hover:bg-green-200 transition-colors cursor-pointer"
                    >
                      <MessageSquare size={16} />
                      Message
                    </button>
                  ) : (
                    <button
                      onClick={handleConnect}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors cursor-pointer"
                    >
                      <UserPlus size={16} />
                      Connect
                    </button>
                  )}
                </div>
              </div>
              
              <div className="mt-6">
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Bio</h2>
                <p className="mt-2 text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg">
                  {userProfile?.bio ? userProfile.bio : "No bio provided yet."}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
