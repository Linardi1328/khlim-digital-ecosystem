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
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
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
            Have questions about programme placement, trial sessions, or venue locations? Our team is here to assist.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "32px" }}>
          {/* Enquiry Form */}
          <Card>
            <CardContent>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 16px", color: "#18181B" }}>
                Send Us an Enquiry
              </h2>

              {submitted ? (
                <Alert variant="success" title="Message Sent Successfully!">
                  Thank you for reaching out. A member of our academy team will get back to you via WhatsApp or email within 24 hours.
                </Alert>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <Input
                    label="Parent / Guardian Name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Michael Tan"
                  />
                  <Input
                    label="Email Address"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. michael@example.com"
                  />
                  <Input
                    label="WhatsApp Mobile Number"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. +60 12-345 6789"
                  />
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "#27272A" }}>
                      Your Question / Child&apos;s Age
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Tell us about your child's age, experience, and preferred training venue..."
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
                    Send Enquiry →
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Location & Direct Contacts */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <Card>
              <CardContent>
                <h3 style={{ fontSize: "1.125rem", fontWeight: 700, margin: "0 0 12px" }}>
                  📍 KHLIM Arena Serdang
                </h3>
                <p style={{ fontSize: "0.875rem", color: "#52525B", lineHeight: 1.5, margin: "0 0 8px" }}>
                  Jalan Kasturi 3, 43300 Seri Kembangan, Selangor, Malaysia
                </p>
                <div style={{ fontSize: "0.8125rem", color: "#71717A" }}>
                  Training Days: Wednesday, Friday & Saturday
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <h3 style={{ fontSize: "1.125rem", fontWeight: 700, margin: "0 0 12px" }}>
                  📍 Cyberjaya Sports Complex
                </h3>
                <p style={{ fontSize: "0.875rem", color: "#52525B", lineHeight: 1.5, margin: "0 0 8px" }}>
                  Persiaran Multimedia, 63000 Cyberjaya, Selangor, Malaysia
                </p>
                <div style={{ fontSize: "0.8125rem", color: "#71717A" }}>
                  Training Days: Sunday
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <h3 style={{ fontSize: "1.125rem", fontWeight: 700, margin: "0 0 12px" }}>
                  💬 WhatsApp Support Hotline
                </h3>
                <p style={{ fontSize: "0.875rem", color: "#52525B", margin: 0 }}>
                  Direct Coach Helpline: <strong>+60 12-345 6789</strong>
                  <br />
                  Operating Hours: Mon–Sat 9:00 AM – 7:00 PM
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
