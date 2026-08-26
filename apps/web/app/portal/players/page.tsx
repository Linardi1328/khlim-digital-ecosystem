"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useI18n } from "../../../lib/i18n-context";
import { useFamily } from "../../../lib/family-context";
import { PortalShell } from "../../../components/portal/portal-shell";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Dialog } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Select } from "../../../components/ui/select";
import { Alert } from "../../../components/ui/alert";

export default function PlayersPage() {
  const { t } = useI18n();
  const { athletes, athleteLinks, addChild, setActiveChild } = useFamily();

  const [modalOpen, setModalOpen] = useState(false);
  const [newChildName, setNewChildName] = useState("");
  const [newChildDob, setNewChildDob] = useState("2017-06-15");
  const [newChildGender, setNewChildGender] = useState("Male");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChildName.trim()) return;
    setIsSaving(true);
    setError("");
    try {
      await addChild({
        displayName: newChildName.trim(),
        dateOfBirth: newChildDob,
        gender: newChildGender,
      });
      setNewChildName("");
      setModalOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to add athlete";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PortalShell>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#0F172A", margin: "0 0 6px" }}>
              {t("portal.players.title")}
            </h1>
            <p style={{ fontSize: "0.9375rem", color: "#64748B", margin: 0 }}>
              {t("portal.players.subtitle")}
            </p>
          </div>

          <Button variant="primary" size="md" onClick={() => setModalOpen(true)}>
            + {t("portal.players.addChild")}
          </Button>
        </div>

        {athletes.length === 0 ? (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              backgroundColor: "#FFFFFF",
              borderRadius: "16px",
              border: "1px dashed #D4D4D8",
            }}
          >
            <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>👦</div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 8px", color: "#18181B" }}>
              No Managed Athletes Yet
            </h3>
            <p style={{ fontSize: "0.875rem", color: "#71717A", maxWidth: "400px", margin: "0 auto 20px" }}>
              Add your children to your guardian account to manage their academy enrolments.
            </p>
            <Button variant="primary" size="md" onClick={() => setModalOpen(true)}>
              + Add First Athlete
            </Button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
            {athletes.map((athlete) => {
              const link = athleteLinks.find((l) => l.athlete.id === athlete.id);
              return (
                <Card key={athlete.id} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <CardContent>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "16px" }}>
                      <div
                        style={{
                          width: "56px",
                          height: "56px",
                          borderRadius: "50%",
                          backgroundColor: "#FEF3C7",
                          color: "#92400E",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                          fontSize: "1.5rem",
                        }}
                      >
                        {athlete.displayName[0]}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <h3 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, color: "#0F172A" }}>
                            {athlete.displayName}
                          </h3>
                          <Badge variant="success" size="sm">
                            ACTIVE
                          </Badge>
                        </div>
                        <div style={{ fontSize: "0.8125rem", color: "#64748B", marginTop: "4px" }}>
                          Date of Birth: {athlete.dateOfBirth} • {athlete.gender || "Youth"}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        backgroundColor: "#F8FAFC",
                        padding: "12px 14px",
                        borderRadius: "8px",
                        border: "1px solid #E2E8F0",
                        fontSize: "0.8125rem",
                        color: "#475569",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        marginBottom: "16px",
                      }}
                    >
                      <div>👥 Relationship: <strong>{link?.relationshipType || "Guardian"}</strong></div>
                      <div>🌐 Language: <strong>{athlete.preferredLocale.toUpperCase()}</strong></div>
                    </div>

                    <div style={{ display: "flex", gap: "10px" }}>
                      <Link href={`/portal/players/${athlete.id}`} style={{ flex: 1, textDecoration: "none" }}>
                        <Button variant="outline" size="sm" style={{ width: "100%" }}>
                          View Profile & Enrolments →
                        </Button>
                      </Link>
                      <Link href={`/enrol?athleteId=${athlete.id}`} style={{ textDecoration: "none" }}>
                        <Button variant="primary" size="sm">
                          Enrol
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Add Child Modal */}
        <Dialog
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={t("portal.players.addChild")}
          description="Create an athlete profile linked to your guardian family account."
        >
          {error && (
            <div style={{ marginBottom: "16px" }}>
              <Alert variant="danger">{error}</Alert>
            </div>
          )}

          <form onSubmit={handleAddChild} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <Input
              label="Child Full Name"
              required
              value={newChildName}
              onChange={(e) => setNewChildName(e.target.value)}
              placeholder="e.g. Maya Lim"
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <Input
                label="Date of Birth"
                type="date"
                required
                value={newChildDob}
                onChange={(e) => setNewChildDob(e.target.value)}
              />
              <Select
                label="Gender"
                value={newChildGender}
                onChange={(e) => setNewChildGender(e.target.value)}
                options={[
                  { label: "Male", value: "Male" },
                  { label: "Female", value: "Female" },
                ]}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
              <Button variant="outline" size="md" type="button" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="md" type="submit" isLoading={isSaving}>
                Save Profile
              </Button>
            </div>
          </form>
        </Dialog>
      </div>
    </PortalShell>
  );
}
