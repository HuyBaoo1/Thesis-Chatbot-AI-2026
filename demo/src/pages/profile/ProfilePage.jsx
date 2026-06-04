import { useState } from "react";
import { useAuthStore } from "../../stores/authStore";
import authService from "../../lib/auth.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Avatar } from "../../components/ui/avatar";
import { Spinner } from "../../components/ui/spinner";
import { Badge } from "../../components/ui/badge";
import { Shield, Lock, CheckCircle } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsChangingPassword(true);
    try {
      await authService.changePassword({
        old_password: currentPassword,
        new_password: newPassword,
      });
      setSuccess("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="max-w-2xl page-container">
      <div>
        <h1 className="page-title">Profile</h1>
        <p className="page-subtitle">Manage your account settings</p>
      </div>

      {/* Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <Avatar fallback={user?.name || user?.email || "U"} size="lg" />
            <div>
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{user?.name}</h3>
              <p className="text-[var(--color-text-muted)]">{user?.email}</p>
              <Badge className="mt-2 bg-[var(--color-primary-100)] text-[var(--color-primary-700)] border-[var(--color-primary-200)]">
                <Shield className="w-3 h-3 mr-1" />
                {user?.role}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Change Password
          </CardTitle>
          <CardDescription>Update your password to keep your account secure</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-[var(--color-error-light)] border border-[var(--color-accent-200)] text-[var(--color-accent-600)] text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 rounded-xl bg-[var(--color-success-light)] border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                {success}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--color-text-secondary)]">Current Password</label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--color-text-secondary)]">New Password</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--color-text-secondary)]">Confirm New Password</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" disabled={isChangingPassword}>
              {isChangingPassword ? "Changing..." : "Change Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
