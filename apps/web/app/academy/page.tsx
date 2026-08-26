"use client";

import React from "react";
import Link from "next/link";
import { PublicFooter } from "../../components/layout/public-footer";
import { PublicHeader } from "../../components/layout/public-header";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";

export default function AcademyPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}><PublicHeader /><main style={{ flex: 1, width: "100%", maxWidth: 1100, margin: "0 auto", padding: "48px 20px", boxSizing: "border-box" }}><div style={{ textAlign: "center", marginBottom: 40 }}><Badge variant="brand">KHLIM Basketball Academy</Badge><h1>The KHLIM development approach</h1><p style={{ color: "#71717a", maxWidth: 680, margin: "0 auto" }}>A structured academy experience focused on basketball fundamentals, team habits and clear communication with families.</p></div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}><Card><h2>Player development</h2><p>Training is organized around progressive skill development and age-appropriate learning.</p></Card><Card><h2>Team standards</h2><p>Players are expected to practise respect, responsibility, effort and sportsmanship.</p></Card><Card><h2>Family visibility</h2><p>The KHLIM platform is designed to make memberships, billing and programme information easier for guardians to understand.</p></Card></div><Card style={{ marginTop: 32 }}><h2>Coaching team</h2><p>Individual coach names, qualifications and assignments will be published only after they are verified and approved by KHLIM management.</p><h2>Training venues</h2><p>Current venue information comes from active programme offerings in the KHLIM backend.</p><Link href="/programmes"><Button variant="primary">View current programmes</Button></Link></Card></main><PublicFooter /></div>
  );
}
