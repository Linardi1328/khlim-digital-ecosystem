"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { isFeatureNotAvailableError } from "@khlim/api-client";
import { useAuth } from "../../../lib/auth-context";
import {
  isStaleAuthContextError,
  useFamily,
} from "../../../lib/family-context";
import { buildWebAuthContextKey } from "../../../lib/family-session-isolation";
import { useI18n } from "../../../lib/i18n-context";
import { PortalShell } from "../../../components/portal/portal-shell";
import { Alert } from "../../../components/ui/alert";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { Dialog } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";

export default function PlayersPage() {
  const { t, formatDate } = useI18n();
  const { isAuthenticated, account } = useAuth();
  const { athletes, athleteLinks, addChild } = useFamily();
  const authContextKey = buildWebAuthContextKey(isAuthenticated, account?.id);
  const authGenRef = useRef(0);
  const isMountedRef = useRef(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [serverDeferred, setServerDeferred] = useState(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      authGenRef.current += 1;
    };
  }, []);

  useEffect(() => {
    authGenRef.current += 1;
    setOpen(false);
    setName("");
    setDateOfBirth("");
    setSaving(false);
    setError("");
    setServerDeferred(false);
  }, [authContextKey]);

  const addAthlete = async (event: React.FormEvent) => {
    event.preventDefault();
    const authGen = authGenRef.current;
    setSaving(true);
    setError("");
    try {
      await addChild({ displayName: name.trim(), dateOfBirth });
      if (!isMountedRef.current || authGenRef.current !== authGen) return;
      setName("");
      setDateOfBirth("");
      setOpen(false);
    } catch (caught) {
      if (
        !isMountedRef.current ||
        authGenRef.current !== authGen ||
        isStaleAuthContextError(caught)
      ) {
        return;
      }
      if (isFeatureNotAvailableError(caught)) {
        setOpen(false);
        setServerDeferred(true);
        return;
      }
      setError(
        caught instanceof Error ? caught.message : t("portal.players.addError"),
      );
    } finally {
      if (isMountedRef.current && authGenRef.current === authGen) {
        setSaving(false);
      }
    }
  };

  return (
    <PortalShell serverDeferred={serverDeferred}>
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 28,
          }}
        >
          <div>
            <h1 style={{ marginBottom: 6 }}>{t("portal.players.title")}</h1>
            <p style={{ color: "#64748b", margin: 0 }}>
              {t("portal.players.subtitle")}
            </p>
          </div>
          <Button variant="primary" onClick={() => setOpen(true)}>
            + {t("portal.players.addChild")}
          </Button>
        </div>
        {athletes.length === 0 ? (
          <Card style={{ padding: 40, textAlign: "center" }}>
            <p>{t("portal.players.empty")}</p>
            <Button variant="primary" onClick={() => setOpen(true)}>
              {t("portal.players.addFirst")}
            </Button>
          </Card>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 20,
            }}
          >
            {athletes.map((athlete) => {
              const link = athleteLinks.find(
                (item) => item.athlete.id === athlete.id,
              );
              return (
                <Card key={athlete.id}>
                  <CardContent>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <h2 style={{ margin: 0 }}>{athlete.displayName}</h2>
                      <Badge variant="success" size="sm">
                        {t("portal.players.linked")}
                      </Badge>
                    </div>
                    <p style={{ color: "#64748b" }}>
                      {t("portal.players.dateOfBirth")}:{" "}
                      {formatDate(athlete.dateOfBirth)}
                    </p>
                    <p style={{ color: "#64748b" }}>
                      {t("portal.players.relationship")}:{" "}
                      {link?.relationshipType ??
                        t("portal.players.guardianRelationship")}
                    </p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Link href={`/portal/players/${athlete.id}`}>
                        <Button variant="outline" size="sm">
                          {t("portal.players.viewProfile")}
                        </Button>
                      </Link>
                      <Link
                        href={`/enrol?athleteId=${encodeURIComponent(athlete.id)}`}
                      >
                        <Button variant="primary" size="sm">
                          {t("portal.players.enrol")}
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        <Dialog
          isOpen={open}
          onClose={() => setOpen(false)}
          title={t("portal.players.addChild")}
          description={t("portal.players.dialogDescription")}
        >
          {error ? <Alert variant="danger">{error}</Alert> : null}
          <form
            onSubmit={addAthlete}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              marginTop: error ? 16 : 0,
            }}
          >
            <Input
              label={t("portal.players.childName")}
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <Input
              label={t("portal.players.dateOfBirth")}
              type="date"
              required
              value={dateOfBirth}
              onChange={(event) => setDateOfBirth(event.target.value)}
            />
            <Button type="submit" variant="primary" isLoading={saving}>
              {t("portal.players.saveProfile")}
            </Button>
          </form>
        </Dialog>
      </div>
    </PortalShell>
  );
}
