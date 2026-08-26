"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Alert } from "../../../components/ui/alert";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import {
  restoreRecoverySessionFromUrl,
  supabaseUpdatePassword,
} from "../../../lib/supabase-auth";

export default function ResetPasswordPage() {
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRecoveryReady(Boolean(restoreRecoverySessionFromUrl()));
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }
    if (password !== confirmation) {
      setError("Password confirmation does not match.");
      return;
    }

    setSaving(true);
    try {
      await supabaseUpdatePassword(password);
      setComplete(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", backgroundColor: "#f4f4f5", padding: 24 }}>
      <Card style={{ width: "100%", maxWidth: 460 }}>
        <CardHeader><CardTitle>Set a new password</CardTitle></CardHeader>
        <CardContent>
          {complete ? (
            <Alert variant="success" title="Password updated">
              Your Supabase account password has been changed. <Link href="/auth/login">Return to sign in.</Link>
            </Alert>
          ) : !recoveryReady ? (
            <Alert variant="warning" title="Recovery session unavailable">
              Open this page from the latest password-recovery email. If the link has expired, request another reset link.
            </Alert>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {error ? <Alert variant="danger">{error}</Alert> : null}
              <Input label="New password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" />
              <Input label="Confirm new password" type="password" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" />
              <Button type="submit" variant="primary" isLoading={saving}>Update password</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
