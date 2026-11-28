"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../../lib/auth-context";
import { isStaleAuthContextError, useFamily } from "../../lib/family-context";
import { buildWebAuthContextKey } from "../../lib/family-session-isolation";
import { useI18n } from "../../lib/i18n-context";
import { Alert } from "../ui/alert";
import { Dialog } from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

export function ChildSwitcher() {
  const { t } = useI18n();
  const { isAuthenticated, account } = useAuth();
  const { athletes, activeChild, setActiveChild, addChild } = useFamily();
  const authContextKey = buildWebAuthContextKey(isAuthenticated, account?.id);
  const authGenRef = useRef(0);
  const isMountedRef = useRef(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [newChildName, setNewChildName] = useState("");
  const [newChildDob, setNewChildDob] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      authGenRef.current += 1;
    };
  }, []);

  useEffect(() => {
    authGenRef.current += 1;
    setModalOpen(false);
    setNewChildName("");
    setNewChildDob("");
    setIsSaving(false);
    setError("");
  }, [authContextKey]);

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChildName.trim() || !newChildDob) {
      setError(t("enrol.error.childRequired"));
      return;
    }

    const authGen = authGenRef.current;
    setIsSaving(true);
    setError("");
    try {
      await addChild({
        displayName: newChildName.trim(),
        dateOfBirth: newChildDob,
      });
      if (!isMountedRef.current || authGenRef.current !== authGen) return;
      setNewChildName("");
      setNewChildDob("");
      setModalOpen(false);
    } catch (caught) {
      if (
        !isMountedRef.current ||
        authGenRef.current !== authGen ||
        isStaleAuthContextError(caught)
      ) {
        return;
      }
      setError(
        caught instanceof Error
          ? caught.message
          : t("enrol.error.createAthlete"),
      );
    } finally {
      if (isMountedRef.current && authGenRef.current === authGen) {
        setIsSaving(false);
      }
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <div style={{ fontSize: "0.8125rem", color: "#71717A", fontWeight: 600 }}>
        {t("portal.dashboard.selectChild")}:
      </div>

      <div
        style={{
          display: "flex",
          gap: "6px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {athletes.map((child) => {
          const isSelected = activeChild?.id === child.id;
          return (
            <button
              key={child.id}
              onClick={() => setActiveChild(child)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "9999px",
                border: isSelected ? "2px solid #F59E0B" : "1px solid #E4E4E7",
                backgroundColor: isSelected ? "#FEF3C7" : "#FFFFFF",
                color: isSelected ? "#92400E" : "#3F3F46",
                fontWeight: isSelected ? 700 : 500,
                fontSize: "0.8125rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <span>🏀</span>
              <span>{child.displayName}</span>
            </button>
          );
        })}

        <button
          onClick={() => {
            setError("");
            setModalOpen(true);
          }}
          style={{
            padding: "6px 10px",
            borderRadius: "9999px",
            border: "1px dashed #D4D4D8",
            backgroundColor: "#FAFAFA",
            color: "#52525B",
            fontWeight: 600,
            fontSize: "0.8125rem",
            cursor: "pointer",
          }}
          title={t("portal.child.addAnother")}
        >
          {t("portal.child.add")}
        </button>
      </div>

      <Dialog
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t("portal.child.dialogTitle")}
        description={t("portal.child.dialogDescription")}
      >
        {error ? <Alert variant="danger">{error}</Alert> : null}
        <form
          onSubmit={handleAddChild}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            marginTop: error ? "16px" : 0,
          }}
        >
          <Input
            label={t("enrol.player.fullName")}
            required
            value={newChildName}
            onChange={(e) => setNewChildName(e.target.value)}
            placeholder={t("portal.child.nameExample")}
          />
          <Input
            label={t("enrol.player.dob")}
            type="date"
            required
            value={newChildDob}
            onChange={(e) => setNewChildDob(e.target.value)}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              marginTop: "12px",
            }}
          >
            <Button
              variant="outline"
              size="md"
              type="button"
              onClick={() => setModalOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              isLoading={isSaving}
            >
              {t("portal.child.save")}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
