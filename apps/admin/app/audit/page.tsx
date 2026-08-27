"use client";

import React, { useState, useEffect } from "react";
import { AdminShell } from "../../components/layout/AdminShell";
import { PageHeader } from "../../components/ui/PageHeader";
import { DataTable, type Column } from "../../components/ui/DataTable";
import { SearchInput } from "../../components/ui/SearchInput";
import { FilterBar } from "../../components/ui/FilterBar";
import { Pagination } from "../../components/ui/Pagination";
import { Button } from "../../components/ui/Button";
import { Drawer } from "../../components/ui/Drawer";
import { adminApi } from "../../lib/admin-api";
import type { AuditLogItem } from "../../lib/types";

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selected Log Drawer
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const list = await adminApi.listAuditLogs();
        setLogs(list);
      } catch (err) {
        console.warn("Failed to load audit logs:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = logs.filter((log) => {
    const matchesSearch =
      log.summary.toLowerCase().includes(search.toLowerCase()) ||
      log.actorName.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.entityId.toLowerCase().includes(search.toLowerCase());
    const matchesEntity =
      entityFilter === "ALL" || log.entityType === entityFilter;
    return matchesSearch && matchesEntity;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const entityTypes = Array.from(new Set(logs.map((l) => l.entityType)));

  const columns: Column<AuditLogItem>[] = [
    {
      key: "timestamp",
      header: "Timestamp",
      render: (log) => (
        <span
          style={{
            fontSize: "0.75rem",
            fontFamily: "monospace",
            color: "#475569",
          }}
        >
          {log.timestamp}
        </span>
      ),
    },
    {
      key: "actorName",
      header: "Staff / Actor",
      render: (log) => (
        <div>
          <div style={{ fontWeight: 700, color: "#0F172A" }}>
            {log.actorName}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
            Role: {log.actorRole}
          </div>
        </div>
      ),
    },
    {
      key: "action",
      header: "Action",
      render: (log) => (
        <span
          style={{
            fontFamily: "monospace",
            fontSize: "0.75rem",
            fontWeight: 700,
            padding: "2px 6px",
            borderRadius: "4px",
            backgroundColor: "#F1F5F9",
            color: "#0F172A",
            border: "1px solid #E2E8F0",
          }}
        >
          {log.action}
        </span>
      ),
    },
    {
      key: "entityType",
      header: "Entity & ID",
      render: (log) => (
        <div>
          <span
            style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748B" }}
          >
            {log.entityType}:
          </span>{" "}
          <code style={{ fontSize: "0.75rem", color: "#0F172A" }}>
            {log.entityId}
          </code>
        </div>
      ),
    },
    {
      key: "summary",
      header: "Summary Note",
      render: (log) => (
        <span style={{ fontSize: "0.8125rem", color: "#334155" }}>
          {log.summary}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Details",
      align: "right",
      render: (log) => (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedLog(log);
          }}
        >
          Inspect
        </Button>
      ),
    },
  ];

  return (
    <AdminShell>
      <div>
        <PageHeader
          title="Operational Audit Trail"
          subtitle="Immutable record of administrative state changes, payment activations, and privileged actions."
          breadcrumbs={[
            { label: "Operations", href: "/" },
            { label: "Audit Log" },
          ]}
        />

        {/* Filter Controls */}
        <FilterBar
          hasActiveFilters={search !== "" || entityFilter !== "ALL"}
          onReset={() => {
            setSearch("");
            setEntityFilter("ALL");
          }}
        >
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search audit trail by actor, action, entity..."
          />

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <label
              htmlFor="entity-select"
              style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 600 }}
            >
              Entity Type:
            </label>
            <select
              id="entity-select"
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              style={{
                padding: "6px 10px",
                fontSize: "0.8125rem",
                backgroundColor: "#F8FAFC",
                border: "1px solid #CBD5E1",
                borderRadius: "6px",
                color: "#0F172A",
              }}
            >
              <option value="ALL">All Entity Types</option>
              {entityTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </FilterBar>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={paginated}
          keyExtractor={(item) => item.id}
          isLoading={loading}
          onRowClick={(item) => setSelectedLog(item)}
        />

        {/* Pagination */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={filtered.length}
          itemsPerPage={pageSize}
          onPageChange={setPage}
          onItemsPerPageChange={setPageSize}
        />

        {/* Audit Detail Drawer */}
        <Drawer
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title={`Audit Record: ${selectedLog?.id}`}
          subtitle={`${selectedLog?.action} on ${selectedLog?.entityType}`}
          width="540px"
          footer={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedLog(null)}
            >
              Close
            </Button>
          }
        >
          {selectedLog && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                  backgroundColor: "#F8FAFC",
                  padding: "16px",
                  borderRadius: "10px",
                  border: "1px solid #E2E8F0",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#64748B",
                      fontWeight: 700,
                    }}
                  >
                    TIMESTAMP
                  </div>
                  <div
                    style={{
                      fontFamily: "monospace",
                      fontSize: "0.8125rem",
                      marginTop: "2px",
                    }}
                  >
                    {selectedLog.timestamp}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#64748B",
                      fontWeight: 700,
                    }}
                  >
                    ACTOR
                  </div>
                  <div
                    style={{
                      fontWeight: 700,
                      color: "#0F172A",
                      marginTop: "2px",
                    }}
                  >
                    {selectedLog.actorName} ({selectedLog.actorRole})
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#64748B",
                      fontWeight: 700,
                    }}
                  >
                    TARGET ENTITY
                  </div>
                  <div
                    style={{
                      fontWeight: 600,
                      color: "#0F172A",
                      marginTop: "2px",
                    }}
                  >
                    {selectedLog.entityType}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#64748B",
                      fontWeight: 700,
                    }}
                  >
                    TARGET ID
                  </div>
                  <div
                    style={{
                      fontFamily: "monospace",
                      fontSize: "0.8125rem",
                      color: "#0F172A",
                      marginTop: "2px",
                    }}
                  >
                    {selectedLog.entityId}
                  </div>
                </div>
              </div>

              <div>
                <h4
                  style={{
                    margin: "0 0 6px",
                    fontSize: "0.9375rem",
                    fontWeight: 700,
                  }}
                >
                  Operation Summary
                </h4>
                <div
                  style={{
                    padding: "14px",
                    backgroundColor: "#FFFFFF",
                    borderRadius: "8px",
                    border: "1px solid #E2E8F0",
                    fontSize: "0.875rem",
                    color: "#334155",
                  }}
                >
                  {selectedLog.summary}
                </div>
              </div>

              <div
                style={{
                  padding: "12px",
                  borderRadius: "8px",
                  backgroundColor: "#FFFBEB",
                  border: "1px solid #FDE68A",
                  fontSize: "0.8125rem",
                  color: "#92400E",
                }}
              >
                <strong>Operational Invariant:</strong> Audit logs are immutable
                and permanent. Records cannot be edited or purged by any staff
                role.
              </div>
            </div>
          )}
        </Drawer>
      </div>
    </AdminShell>
  );
}
