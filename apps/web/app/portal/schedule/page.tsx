"use client";

import React, { useEffect, useState } from "react";
import { apiService } from "../../../lib/api-service";
import { useFamily } from "../../../lib/family-context";
import { useI18n } from "../../../lib/i18n-context";
import type { AthleteMembershipItem } from "../../../lib/types";
import { PortalShell } from "../../../components/portal/portal-shell";
import { Badge } from "../../../components/ui/badge";
import { Card } from "../../../components/ui/card";

export default function SchedulePage() {
  const { t } = useI18n();
  const { activeChild } = useFamily();
  const [memberships, setMemberships] = useState<AthleteMembershipItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeChild) { setMemberships([]); setLoading(false); return; }
    setLoading(true);
    apiService.listAthleteMemberships(activeChild.id).then(setMemberships).catch(() => setMemberships([])).finally(() => setLoading(false));
  }, [activeChild]);

  return (
    <PortalShell>
      <div><h1>{t("portal.schedule.title")}</h1><p style={{ color: "#64748b" }}>Detailed Session scheduling is a later platform capability. This page currently shows only authoritative programme-term context already available from memberships.</p>
        {loading ? <p>Loading programme timing…</p> : memberships.length === 0 ? <Card style={{ padding: 32 }}>No programme term is associated with this athlete.</Card> : memberships.map((membership) => <Card key={membership.id} style={{ marginTop: 16 }}><h2>{membership.programmeOffering.name}</h2><Badge variant={membership.status === "ACTIVE" ? "success" : "warning"}>{membership.status}</Badge><p>Term start: {membership.programmeOffering.startsOn ?? "Not scheduled"}</p><p>Term end: {membership.programmeOffering.endsOn ?? "Not scheduled"}</p><p>Venue: {membership.programmeOffering.venue?.name ?? "Not assigned"}</p><small>No individual training session, court or coach assignment is being inferred here.</small></Card>) }
      </div>
    </PortalShell>
  );
}
