import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { hashPassword } from "../../utils/crypto/hashPassword";

const defaultSettings = {
  email: "",
  showLastSeen: true,
  showOnlineStatus: true,
  readReceipts: true,
  allowConnectionRequests: true,
};

function Toggle({ checked, disabled, label, onChange }) {
  return (
    <label className={`relative inline-flex items-center ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`} aria-label={label}>
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-disabled:opacity-60 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
    </label>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const accessToken = useAuthStore((state) => state.accessToken);
  const currentUser = useAuthStore((state) => state.user);
  const setCurrentUser = useAuthStore((state) => state.setUser);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const [settings, setSettings] = useState(defaultSettings);
  const [emailForm, setEmailForm] = useState({ email: "", password: "" });
  const [emailError, setEmailError] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPreference, setSavingPreference] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await axios.get("/api/v1/users/settings", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        setSettings(res.data);
        setEmailForm({ email: res.data.email || "", password: "" });
      } catch (err) {
        toast.error(err.response?.data?.error || "Failed to load settings");
      } finally {
        setLoading(false);
      }
    };

    if (accessToken) {
      fetchSettings();
    }
  }, [accessToken]);

  const updatePreference = async (field, value) => {
    const previousSettings = settings;
    setSettings((current) => ({ ...current, [field]: value }));
    setSavingPreference(field);

    try {
      const res = await axios.put(
        "/api/v1/users/settings",
        { [field]: value },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      setSettings(res.data);
      toast.success("Settings updated");
    } catch (err) {
      setSettings(previousSettings);
      toast.error(err.response?.data?.error || "Failed to update setting");
    } finally {
      setSavingPreference(null);
    }
  };

  const handleChangeEmail = async (e) => {
    e.preventDefault();
    setEmailError("");

    const nextEmail = emailForm.email.trim().toLowerCase();
    if (!nextEmail || !emailForm.password) {
      const message = "Enter your new email and current password";
      setEmailError(message);
      toast.error(message);
      return;
    }

    if (nextEmail === settings.email.trim().toLowerCase()) {
      const message = "New email must be different from your current email";
      setEmailError(message);
      toast.error(message);
      return;
    }

    try {
      setSavingEmail(true);
      const currentPasswordHash = await hashPassword(emailForm.password, settings.email);
      const newPasswordHash = await hashPassword(emailForm.password, nextEmail);
      const res = await axios.put(
        "/api/v1/users/settings/email",
        {
          email: nextEmail,
          currentPasswordHash,
          newPasswordHash,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      setSettings((current) => ({ ...current, email: res.data.email }));
      setEmailForm({ email: res.data.email, password: "" });
      if (currentUser) {
        setCurrentUser({ ...currentUser, email: res.data.email });
      }
      toast.success("Email updated");
    } catch (err) {
      const message = err.response?.data?.error || "Failed to update email";
      setEmailError(message);
      toast.error(message);
    } finally {
      setSavingEmail(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setDeleteError("");

    if (!deletePassword) {
      const message = "Enter your password to delete your account";
      setDeleteError(message);
      toast.error(message);
      return;
    }

    try {
      setDeleting(true);
      const passwordHash = await hashPassword(deletePassword, settings.email);
      await axios.post(
        "/api/v1/users/settings/delete-account",
        { passwordHash },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          withCredentials: true,
        }
      );
      toast.success("Account deleted");
      await clearAuth();
      navigate("/login", { replace: true });
    } catch (err) {
      const message = err.response?.data?.error || "Failed to delete account";
      setDeleteError(message);
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-3xl">
        <p className="text-gray-500">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
      <p className="text-gray-600 mb-8">Manage your account, privacy, and preferences.</p>

      <div className="space-y-8">
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Account</h2>
          <div className="space-y-6">
            <form onSubmit={handleChangeEmail} className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900">Email Address</h3>
                <p className="text-sm text-gray-500">Update your email address. Your current password is required.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <input
                  type="email"
                  value={emailForm.email}
                  onChange={(e) => {
                    setEmailError("");
                    setEmailForm((current) => ({ ...current, email: e.target.value }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Email"
                  autoComplete="email"
                />
                <input
                  type="password"
                  value={emailForm.password}
                  onChange={(e) => {
                    setEmailError("");
                    setEmailForm((current) => ({ ...current, password: e.target.value }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Current password"
                  autoComplete="current-password"
                />
                <button
                  type="submit"
                  disabled={savingEmail}
                  className="px-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 font-medium transition-colors disabled:opacity-50"
                >
                  {savingEmail ? "Saving..." : "Save"}
                </button>
              </div>
              {emailError && (
                <p className="text-sm text-red-600" role="alert">{emailError}</p>
              )}
            </form>

            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-medium text-red-600">Delete Account</h3>
                  <p className="text-sm text-gray-500">Mark your account as deleted. Your database record will be retained.</p>
                </div>
                <button
                  onClick={() => {
                    setDeleteError("");
                    setShowDeleteDialog(true);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Privacy & Interactions</h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-medium text-gray-900">Show Last Seen</h3>
                <p className="text-sm text-gray-500">Let others see when you were last active.</p>
              </div>
              <Toggle
                label="Show Last Seen"
                checked={settings.showLastSeen}
                disabled={savingPreference === "showLastSeen"}
                onChange={(value) => updatePreference("showLastSeen", value)}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-medium text-gray-900">Show Online Status</h3>
                <p className="text-sm text-gray-500">Allow others to see when you are currently online.</p>
              </div>
              <Toggle
                label="Show Online Status"
                checked={settings.showOnlineStatus}
                disabled={savingPreference === "showOnlineStatus"}
                onChange={(value) => updatePreference("showOnlineStatus", value)}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-medium text-gray-900">Read Receipts</h3>
                <p className="text-sm text-gray-500">Send and receive read receipts for messages.</p>
              </div>
              <Toggle
                label="Read Receipts"
                checked={settings.readReceipts}
                disabled={savingPreference === "readReceipts"}
                onChange={(value) => updatePreference("readReceipts", value)}
              />
            </div>

            <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-100">
              <div>
                <h3 className="font-medium text-gray-900">Connection Requests</h3>
                <p className="text-sm text-gray-500">Allow other users to send you connection requests.</p>
              </div>
              <Toggle
                label="Connection Requests"
                checked={settings.allowConnectionRequests}
                disabled={savingPreference === "allowConnectionRequests"}
                onChange={(value) => updatePreference("allowConnectionRequests", value)}
              />
            </div>
          </div>
        </section>

        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Blocked Accounts</h2>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-medium text-gray-900">Manage Blocked Users</h3>
              <p className="text-sm text-gray-500">No blocked account backend exists yet.</p>
            </div>
            <button
              disabled
              className="px-4 py-2 bg-gray-100 text-gray-400 rounded-md font-medium cursor-not-allowed"
            >
              View List
            </button>
          </div>
        </section>
      </div>

      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-gray-100 p-6">
            <h2 className="text-xl font-semibold text-gray-900">Delete Account</h2>
            <p className="mt-2 text-sm text-red-600">
              This cannot be undone. Your Account will be deleted permanently. 
              <p className="text-xs text-gray-500"><i>Reach out to us if you want to restore it after deletion.</i></p>
              </p>
            <form onSubmit={handleDeleteAccount} className="mt-5 space-y-4">
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => {
                  setDeleteError("");
                  setDeletePassword(e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:outline-none"
                placeholder="Current password"
                autoComplete="current-password"
                autoFocus
              />
              {deleteError && (
                <p className="text-sm text-red-600" role="alert">{deleteError}</p>
              )}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteDialog(false);
                    setDeletePassword("");
                    setDeleteError("");
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Delete Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
