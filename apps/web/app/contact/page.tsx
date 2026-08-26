"use client";

import React, { useState } from "react";
import { PublicFooter } from "../../components/layout/public-footer";
import { PublicHeader } from "../../components/layout/public-header";
import { Alert } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";

export default function ContactPage() {
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const openEmail = (event: React.FormEvent) => {
    event.preventDefault();
    if (!contactEmail) return;
    const subject = encodeURIComponent(`KHLIM Academy enquiry from ${name}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
    window.location.assign(`mailto:${contactEmail}?subject=${subject}&body=${body}`);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}><PublicHeader /><main style={{ flex: 1, width: "100%", maxWidth: 900, margin: "0 auto", padding: "48px 20px", boxSizing: "border-box" }}><h1>Contact KHLIM Basketball Academy</h1><Card><CardContent>{contactEmail ? <><Alert variant="info">Submitting opens your email application. The website does not claim the message was delivered.</Alert><form onSubmit={openEmail} style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}><Input label="Name" required value={name} onChange={(event) => setName(event.target.value)} /><Input label="Email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /><div><label htmlFor="contact-message">Message</label><textarea id="contact-message" required rows={5} value={message} onChange={(event) => setMessage(event.target.value)} style={{ display: "block", width: "100%", boxSizing: "border-box", marginTop: 6, padding: 12 }} /></div><Button type="submit" variant="primary">Open email application</Button></form></> : <Alert variant="warning" title="Contact channel not configured">A public academy contact address will be published before launch. No placeholder address is presented as a real KHLIM inbox.</Alert>}</CardContent></Card></main><PublicFooter /></div>
  );
}
