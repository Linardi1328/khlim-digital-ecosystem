"use client";

import React, { useState } from "react";
import { useI18n } from "../../lib/i18n-context";
import { PublicHeader } from "../../components/layout/public-header";
import { PublicFooter } from "../../components/layout/public-footer";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Alert } from "../../components/ui/alert";

export default function ContactPage() {
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const handleMailto = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`KHLIM Academy Enquiry from ${formData.name}`);
    const body = encodeURIComponent(
      `Parent: ${formData.name}\nEmail: ${formData.email}\nPhone: ${formData.phone}\n\nEnquiry:\n${formData.message}`,
    );
    window.location.href = `mailto:enquiries@khlim.com?subject=${subject}&body=${body}`;
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <PublicHeader />

      <main style={{ flex: 1, maxWidth: "1000px", margin: "0 auto", padding: "48px 20px" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <Badge variant="brand" size="md">
            Get in Touch
          </Badge>
          <h1 style={{ fontSize: "2.75rem", fontWeight: 900, color: "#18181B", margin: "16px 0 12px" }}>
            Contact KHLIM Basketball Academy
          </h1>
          <p style={{ fontSize: "1.125rem", color: "#71717A" }}>
            Reach out regarding trial placements, programme details, or venue logistics.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "32px" }}>
          {/* Enquiry Form */}
          <Card>
            <CardContent>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 16px", color: "#18181B" }}>
                Send an Enquiry
              </h2>

              <Alert variant="info" title="Direct Email Dispatch">
                Online API form submission is currently in development. Submitting below opens your preferred email client directly with our academy team.
              </Alert>

              <form onSubmit={handleMailto} style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
                <Input
                  label="Parent / Guardian Name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Richie Lim"
                />
                <Input
                  label="Email Address"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="guardian@example.com"
                />
                <Input
                  label="Contact Phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+60 12-345 6789"
                />
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "#27272A" }}>
                    Your Message
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Provide details about your child's age and experience..."
                    style={{
                      padding: "10px 14px",
                      fontSize: "0.9375rem",
                      borderRadius: "8px",
                      border: "1px solid #D4D4D8",
                      fontFamily: "inherit",
                      outline: "none",
                      resize: "vertical",
                    }}
                  />
                </div>
                <Button variant="primary" size="md" type="submit">
                  Open Email Client →
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Contact Details */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <Card>
              <CardContent>
                <h3 style={{ fontSize: "1.125rem", fontWeight: 700, margin: "0 0 12px" }}>
                  📧 Direct Academy Contact
                </h3>
                <p style={{ fontSize: "0.875rem", color: "#52525B", lineHeight: 1.6, margin: 0 }}>
                  General Enquiries: <strong>enquiries@khlim.com</strong>
                  <br />
                  Parent Member Support: <strong>support@khlim.com</strong>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <h3 style={{ fontSize: "1.125rem", fontWeight: 700, margin: "0 0 12px" }}>
                  📍 Academy Facilities
                </h3>
                <p style={{ fontSize: "0.875rem", color: "#52525B", lineHeight: 1.6, margin: 0 }}>
                  Venues are scheduled per active programme term. Check our active programmes catalogue for specific venue locations.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
