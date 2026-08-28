from pathlib import Path

schema = Path("prisma/schema.prisma")
text = schema.read_text()
if "enum EditorialEntryType" not in text:
    text += '''

enum EditorialEntryType {
  ACHIEVEMENT
  PLAYER_SPOTLIGHT
}

enum EditorialEntryStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

model EditorialEntry {
  id                String               @id @default(uuid()) @db.Uuid
  type              EditorialEntryType
  slug              String?              @unique @db.VarChar(160)
  title             String               @db.VarChar(220)
  eventName         String               @db.VarChar(220)
  summary           String               @db.Text
  yearLabel         String?              @db.VarChar(80)
  playerName        String?              @db.VarChar(160)
  achievement       String?              @db.VarChar(220)
  achievedOnLabel   String?              @db.VarChar(120)
  articleParagraphs Json?
  photoLabel        String               @db.VarChar(220)
  imageUrl          String?              @db.Text
  factsVerified     Boolean              @default(false)
  aiAssisted        Boolean              @default(false)
  status            EditorialEntryStatus @default(DRAFT)
  publishedAt       DateTime?
  createdAt         DateTime             @default(now())
  updatedAt         DateTime             @updatedAt

  @@index([type, status, publishedAt])
  @@map("editorial_entries")
}
'''
schema.write_text(text)

migration = Path("prisma/migrations/20260828024500_editorial_studio")
migration.mkdir(exist_ok=True)
(migration / "migration.sql").write_text('''CREATE TYPE "EditorialEntryType" AS ENUM ('ACHIEVEMENT', 'PLAYER_SPOTLIGHT');
CREATE TYPE "EditorialEntryStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TABLE "editorial_entries" (
  "id" UUID NOT NULL,
  "type" "EditorialEntryType" NOT NULL,
  "slug" VARCHAR(160),
  "title" VARCHAR(220) NOT NULL,
  "eventName" VARCHAR(220) NOT NULL,
  "summary" TEXT NOT NULL,
  "yearLabel" VARCHAR(80),
  "playerName" VARCHAR(160),
  "achievement" VARCHAR(220),
  "achievedOnLabel" VARCHAR(120),
  "articleParagraphs" JSONB,
  "photoLabel" VARCHAR(220) NOT NULL,
  "imageUrl" TEXT,
  "factsVerified" BOOLEAN NOT NULL DEFAULT false,
  "aiAssisted" BOOLEAN NOT NULL DEFAULT false,
  "status" "EditorialEntryStatus" NOT NULL DEFAULT 'DRAFT',
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "editorial_entries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "editorial_entries_slug_key" ON "editorial_entries"("slug");
CREATE INDEX "editorial_entries_type_status_publishedAt_idx" ON "editorial_entries"("type", "status", "publishedAt");
''')

editorial_dir = Path("apps/api/src/editorial")
editorial_dir.mkdir(exist_ok=True)
(editorial_dir / "editorial.service.ts").write_text(r'''import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

export type EditorialType = "ACHIEVEMENT" | "PLAYER_SPOTLIGHT";

export interface EditorialInput {
  type: EditorialType;
  slug?: string;
  title: string;
  eventName: string;
  summary: string;
  yearLabel?: string;
  playerName?: string;
  achievement?: string;
  achievedOnLabel?: string;
  articleParagraphs?: string[];
  photoLabel: string;
  imageUrl?: string;
  factsVerified?: boolean;
  aiAssisted?: boolean;
}

@Injectable()
export class EditorialService {
  constructor(private readonly prisma: PrismaService) {}

  listAdmin() {
    return this.prisma.client.editorialEntry.findMany({ orderBy: { updatedAt: "desc" } });
  }

  listPublished(type: EditorialType) {
    return this.prisma.client.editorialEntry.findMany({
      where: { type, status: "PUBLISHED", factsVerified: true },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    });
  }

  findPublishedSpotlight(slug: string) {
    return this.prisma.client.editorialEntry.findFirst({
      where: { slug, type: "PLAYER_SPOTLIGHT", status: "PUBLISHED", factsVerified: true },
    });
  }

  create(input: EditorialInput) {
    this.assertComplete(input);
    return this.prisma.client.editorialEntry.create({
      data: {
        type: input.type,
        slug: input.slug,
        title: input.title,
        eventName: input.eventName,
        summary: input.summary,
        yearLabel: input.yearLabel,
        playerName: input.playerName,
        achievement: input.achievement,
        achievedOnLabel: input.achievedOnLabel,
        articleParagraphs: input.articleParagraphs,
        photoLabel: input.photoLabel,
        imageUrl: input.imageUrl,
        factsVerified: Boolean(input.factsVerified),
        aiAssisted: Boolean(input.aiAssisted),
      },
    });
  }

  async update(id: string, input: Partial<EditorialInput>) {
    const existing = await this.requireEntry(id);
    const merged = {
      type: existing.type,
      slug: input.slug ?? existing.slug ?? undefined,
      title: input.title ?? existing.title,
      eventName: input.eventName ?? existing.eventName,
      summary: input.summary ?? existing.summary,
      yearLabel: input.yearLabel ?? existing.yearLabel ?? undefined,
      playerName: input.playerName ?? existing.playerName ?? undefined,
      achievement: input.achievement ?? existing.achievement ?? undefined,
      achievedOnLabel: input.achievedOnLabel ?? existing.achievedOnLabel ?? undefined,
      articleParagraphs: input.articleParagraphs ?? (Array.isArray(existing.articleParagraphs) ? existing.articleParagraphs.filter((item): item is string => typeof item === "string") : undefined),
      photoLabel: input.photoLabel ?? existing.photoLabel,
      imageUrl: input.imageUrl ?? existing.imageUrl ?? undefined,
      factsVerified: input.factsVerified ?? existing.factsVerified,
      aiAssisted: input.aiAssisted ?? existing.aiAssisted,
    } satisfies EditorialInput;
    this.assertComplete(merged);
    return this.prisma.client.editorialEntry.update({
      where: { id },
      data: {
        slug: input.slug,
        title: input.title,
        eventName: input.eventName,
        summary: input.summary,
        yearLabel: input.yearLabel,
        playerName: input.playerName,
        achievement: input.achievement,
        achievedOnLabel: input.achievedOnLabel,
        articleParagraphs: input.articleParagraphs,
        photoLabel: input.photoLabel,
        imageUrl: input.imageUrl,
        factsVerified: input.factsVerified,
        aiAssisted: input.aiAssisted,
      },
    });
  }

  async publish(id: string) {
    const entry = await this.requireEntry(id);
    if (!entry.factsVerified) throw new BadRequestException("Facts must be verified before publication");
    this.assertComplete({
      type: entry.type,
      slug: entry.slug ?? undefined,
      title: entry.title,
      eventName: entry.eventName,
      summary: entry.summary,
      yearLabel: entry.yearLabel ?? undefined,
      playerName: entry.playerName ?? undefined,
      achievement: entry.achievement ?? undefined,
      achievedOnLabel: entry.achievedOnLabel ?? undefined,
      articleParagraphs: Array.isArray(entry.articleParagraphs) ? entry.articleParagraphs.filter((item): item is string => typeof item === "string") : undefined,
      photoLabel: entry.photoLabel,
      imageUrl: entry.imageUrl ?? undefined,
      factsVerified: entry.factsVerified,
      aiAssisted: entry.aiAssisted,
    });
    return this.prisma.client.editorialEntry.update({
      where: { id },
      data: { status: "PUBLISHED", publishedAt: entry.publishedAt ?? new Date() },
    });
  }

  async unpublish(id: string) {
    await this.requireEntry(id);
    return this.prisma.client.editorialEntry.update({ where: { id }, data: { status: "DRAFT", publishedAt: null } });
  }

  generateSpotlightDraft(input: { playerName: string; eventName: string; achievement: string; achievedOnLabel: string; developmentNote?: string }) {
    const required = [input.playerName, input.eventName, input.achievement, input.achievedOnLabel];
    if (required.some((value) => !value?.trim())) throw new BadRequestException("Player, event, achievement and event date are required");
    const development = input.developmentNote?.trim() || "the preparation, habits and resilience built through consistent training";
    return {
      headline: `${input.playerName} reaches ${input.achievement} at ${input.eventName}`,
      excerpt: `${input.playerName} has reached ${input.achievement} at ${input.eventName}, a milestone that reflects ${development}.`,
      articleParagraphs: [
        `${input.playerName} reached ${input.achievement} at ${input.eventName} on ${input.achievedOnLabel}, marking a memorable competitive milestone.`,
        `The result reflects ${development}. KHLIM's editorial focus is on the verified achievement and the development habits behind it rather than overstating the club's role.`,
        "The achievement also recognises the wider support around the player, including teammates, coaches and family, while keeping the focus on the athlete's next stage of growth.",
      ],
      aiAssisted: true,
      generator: "khlim-editorial-assist-v1",
      sourceFactsOnly: true,
    };
  }

  private async requireEntry(id: string) {
    const entry = await this.prisma.client.editorialEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException("Editorial entry not found");
    return entry;
  }

  private assertComplete(input: EditorialInput) {
    if (!input.title?.trim() || !input.eventName?.trim() || !input.summary?.trim() || !input.photoLabel?.trim()) throw new BadRequestException("Title, event name, summary and photo label are required");
    if (input.type === "ACHIEVEMENT" && !input.yearLabel?.trim()) throw new BadRequestException("Achievement year label is required");
    if (input.type === "PLAYER_SPOTLIGHT") {
      if (!input.slug?.trim() || !input.playerName?.trim() || !input.achievement?.trim() || !input.achievedOnLabel?.trim()) throw new BadRequestException("Spotlight slug, player, achievement and event date are required");
      if (!input.articleParagraphs || input.articleParagraphs.length < 2) throw new BadRequestException("Spotlight article requires at least two paragraphs");
    }
  }
}
''')
(editorial_dir / "editorial.controller.ts").write_text(r'''import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public, RequireAnyRole, RequireMfa } from "../auth/authorization.decorators";
import { EditorialService, type EditorialInput } from "./editorial.service";

@ApiTags("editorial")
@Controller()
export class EditorialController {
  constructor(private readonly editorial: EditorialService) {}

  @Public()
  @Get("editorial/achievements")
  listAchievements() { return this.editorial.listPublished("ACHIEVEMENT"); }

  @Public()
  @Get("editorial/player-spotlights")
  listSpotlights() { return this.editorial.listPublished("PLAYER_SPOTLIGHT"); }

  @Public()
  @Get("editorial/player-spotlights/:slug")
  getSpotlight(@Param("slug") slug: string) { return this.editorial.findPublishedSpotlight(slug); }

  @Get("admin/editorial")
  @ApiBearerAuth("supabase")
  @RequireAnyRole("SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN")
  listAdmin() { return this.editorial.listAdmin(); }

  @Post("admin/editorial")
  @ApiBearerAuth("supabase")
  @RequireAnyRole("SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN")
  create(@Body() input: EditorialInput) { return this.editorial.create(input); }

  @Patch("admin/editorial/:id")
  @ApiBearerAuth("supabase")
  @RequireAnyRole("SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN")
  update(@Param("id") id: string, @Body() input: Partial<EditorialInput>) { return this.editorial.update(id, input); }

  @Post("admin/editorial/player-spotlights/draft")
  @ApiBearerAuth("supabase")
  @RequireAnyRole("SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN")
  @ApiOperation({ summary: "Generate an AI-assisted newsletter draft from staff-supplied facts" })
  draft(@Body() input: Parameters<EditorialService["generateSpotlightDraft"]>[0]) { return this.editorial.generateSpotlightDraft(input); }

  @Post("admin/editorial/:id/publish")
  @ApiBearerAuth("supabase")
  @RequireAnyRole("SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN")
  @RequireMfa()
  publish(@Param("id") id: string) { return this.editorial.publish(id); }

  @Post("admin/editorial/:id/unpublish")
  @ApiBearerAuth("supabase")
  @RequireAnyRole("SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN")
  @RequireMfa()
  unpublish(@Param("id") id: string) { return this.editorial.unpublish(id); }
}
''')
(editorial_dir / "editorial.module.ts").write_text('''import { Module } from "@nestjs/common";
import { EditorialController } from "./editorial.controller";
import { EditorialService } from "./editorial.service";

@Module({ controllers: [EditorialController], providers: [EditorialService], exports: [EditorialService] })
export class EditorialModule {}
''')

app = Path("apps/api/src/app.module.ts")
s = app.read_text()
if "EditorialModule" not in s:
    s = s.replace('import { HealthController } from "./health.controller";', 'import { HealthController } from "./health.controller";\nimport { EditorialModule } from "./editorial/editorial.module";')
    s = s.replace("    BillingModule,\n", "    BillingModule,\n    EditorialModule,\n")
app.write_text(s)

sidebar = Path("apps/admin/components/layout/AdminSidebar.tsx")
s = sidebar.read_text()
if "Editorial Studio" not in s:
    s = s.replace('{ href: "/scheduling", label: "Scheduling", icon: "📅" },', '{ href: "/scheduling", label: "Scheduling", icon: "📅" },\n  { href: "/editorial", label: "Editorial Studio", icon: "📰" },')
sidebar.write_text(s)

admin_page = Path("apps/admin/app/editorial/page.tsx")
admin_page.parent.mkdir(exist_ok=True)
admin_page.write_text(r'''"use client";

import React, { useEffect, useState } from "react";
import { AdminShell } from "../../components/layout/AdminShell";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { getAdminAccessToken } from "../../lib/admin-api";

const API = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/v1").replace(/\/+$/, "");
type Entry = { id:string; type:"ACHIEVEMENT"|"PLAYER_SPOTLIGHT"; slug?:string|null; title:string; eventName:string; summary:string; yearLabel?:string|null; playerName?:string|null; achievement?:string|null; achievedOnLabel?:string|null; articleParagraphs?:string[]|null; photoLabel:string; imageUrl?:string|null; factsVerified:boolean; aiAssisted:boolean; status:"DRAFT"|"PUBLISHED"|"ARCHIVED" };
const empty = { type:"PLAYER_SPOTLIGHT" as "ACHIEVEMENT"|"PLAYER_SPOTLIGHT", slug:"", title:"", eventName:"", summary:"", yearLabel:"", playerName:"", achievement:"", achievedOnLabel:"", articleParagraphs:"", photoLabel:"", imageUrl:"", factsVerified:false, developmentNote:"" };
async function api(path:string, init?:RequestInit) { const token=getAdminAccessToken(); const response=await fetch(`${API}${path}`,{...init,headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})}}); if(!response.ok) throw new Error((await response.text())||`HTTP ${response.status}`); return response.json(); }

export default function EditorialStudioPage(){
  const [entries,setEntries]=useState<Entry[]>([]); const [form,setForm]=useState({...empty}); const [message,setMessage]=useState("");
  const load=async()=>{try{setEntries(await api("/admin/editorial"));}catch(error){setMessage(error instanceof Error?error.message:String(error));}};
  useEffect(()=>{void load();},[]);
  const set=(key:keyof typeof form,value:string|boolean)=>setForm((current)=>({...current,[key]:value}));
  async function generateDraft(){try{const draft=await api("/admin/editorial/player-spotlights/draft",{method:"POST",body:JSON.stringify({playerName:form.playerName,eventName:form.eventName,achievement:form.achievement,achievedOnLabel:form.achievedOnLabel,developmentNote:form.developmentNote})});setForm((current)=>({...current,title:draft.headline,summary:draft.excerpt,articleParagraphs:draft.articleParagraphs.join("\n\n")}));setMessage("AI-assisted draft generated from supplied facts. Review it before saving.");}catch(error){setMessage(error instanceof Error?error.message:String(error));}}
  async function save(){try{const payload={type:form.type,slug:form.type==="PLAYER_SPOTLIGHT"?form.slug:undefined,title:form.title,eventName:form.eventName,summary:form.summary,yearLabel:form.type==="ACHIEVEMENT"?form.yearLabel:undefined,playerName:form.type==="PLAYER_SPOTLIGHT"?form.playerName:undefined,achievement:form.type==="PLAYER_SPOTLIGHT"?form.achievement:undefined,achievedOnLabel:form.type==="PLAYER_SPOTLIGHT"?form.achievedOnLabel:undefined,articleParagraphs:form.type==="PLAYER_SPOTLIGHT"?form.articleParagraphs.split(/\n\s*\n/).filter(Boolean):undefined,photoLabel:form.photoLabel,imageUrl:form.imageUrl||undefined,factsVerified:form.factsVerified,aiAssisted:form.type==="PLAYER_SPOTLIGHT"};await api("/admin/editorial",{method:"POST",body:JSON.stringify(payload)});setForm({...empty,type:form.type});setMessage("Draft saved.");await load();}catch(error){setMessage(error instanceof Error?error.message:String(error));}}
  async function transition(id:string,action:"publish"|"unpublish"){try{await api(`/admin/editorial/${id}/${action}`,{method:"POST"});setMessage(action==="publish"?"Published to public website.":"Removed from public website.");await load();}catch(error){setMessage(error instanceof Error?error.message:String(error));}}
  const field=(label:string,key:keyof typeof form,placeholder="")=><label>{label}<input value={String(form[key])} placeholder={placeholder} onChange={(e)=>set(key,e.target.value)}/></label>;
  return <AdminShell><div><PageHeader title="Editorial Studio" subtitle="Create verified club achievements and Player Spotlight newsletters, with AI-assisted drafting from staff-supplied facts." breadcrumbs={[{label:"Operations",href:"/"},{label:"Editorial Studio"}]}/><div className="editorial-grid"><section className="editorial-panel"><h2>New editorial draft</h2><label>Content type<select value={form.type} onChange={(e)=>set("type",e.target.value)}><option value="PLAYER_SPOTLIGHT">Player Spotlight</option><option value="ACHIEVEMENT">Club Achievement</option></select></label>{form.type==="PLAYER_SPOTLIGHT"?<>{field("Player name","playerName")}{field("URL slug","slug","player-name-event")}{field("Achievement","achievement","Gold medal / selection / milestone")}{field("Achievement date","achievedOnLabel")}<label>Development note<textarea value={form.developmentNote} onChange={(e)=>set("developmentNote",e.target.value)}/></label></>:field("Year / season label","yearLabel")}{field("Event name","eventName")}{form.type==="PLAYER_SPOTLIGHT"&&<Button variant="outline" onClick={generateDraft}>Generate AI-assisted draft</Button>}{field("Headline / title","title")}<label>Summary<textarea value={form.summary} onChange={(e)=>set("summary",e.target.value)}/></label>{form.type==="PLAYER_SPOTLIGHT"&&<label>Article paragraphs<textarea rows={10} value={form.articleParagraphs} onChange={(e)=>set("articleParagraphs",e.target.value)}/></label>}{field("Photo description","photoLabel")}{field("Approved photo URL (optional)","imageUrl")}<label className="check"><input type="checkbox" checked={form.factsVerified} onChange={(e)=>set("factsVerified",e.target.checked)}/> Facts and photo rights verified by KHLIM staff</label><Button onClick={save}>Save draft</Button>{message&&<p role="status">{message}</p>}</section><section><h2>Saved content</h2>{entries.length===0&&<p>No editorial entries yet.</p>}{entries.map((entry)=><article className="saved" key={entry.id}><div className="saved-head"><strong>{entry.title}</strong><span>{entry.status}</span></div><p>{entry.eventName} · {entry.factsVerified?"Facts verified":"Verification required"}</p><div className="actions">{entry.status==="PUBLISHED"?<Button variant="outline" size="sm" onClick={()=>transition(entry.id,"unpublish")}>Unpublish</Button>:<Button size="sm" disabled={!entry.factsVerified} onClick={()=>transition(entry.id,"publish")}>Publish</Button>}{entry.type==="PLAYER_SPOTLIGHT"&&entry.slug&&<a href={`/spotlight/${entry.slug}`} target="_blank" rel="noreferrer">Public URL</a>}</div></article>)}</section></div><style jsx>{`.editorial-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(320px,.9fr);gap:24px}.editorial-panel,.saved{background:white;border:1px solid #e2e8f0;border-radius:12px;padding:20px}.saved{margin-bottom:12px;padding:16px}.saved-head,.actions{display:flex;justify-content:space-between;gap:12px;align-items:center}.actions{justify-content:flex-start}label{display:block;font-size:.85rem;font-weight:650;color:#334155;margin:12px 0}input,textarea,select{box-sizing:border-box;width:100%;margin-top:6px;padding:10px;border:1px solid #cbd5e1;border-radius:8px;font:inherit}.check{display:flex;gap:8px;align-items:center}.check input{width:auto;margin:0}@media(max-width:900px){.editorial-grid{grid-template-columns:1fr}}`}</style></div></AdminShell>;
}
''')

Path("apps/web/lib/editorial-api.ts").write_text(r'''import type { AchievementStory, PlayerSpotlightArticle } from "./editorial-content";
const API=(process.env.NEXT_PUBLIC_API_BASE_URL||"http://localhost:3001/v1").replace(/\/+$/,"");
const GRADIENT="linear-gradient(135deg, #18181b, #3f2d0b 58%, #0f172a)";
type Entry={id:string;slug?:string|null;title:string;eventName:string;summary:string;yearLabel?:string|null;playerName?:string|null;achievement?:string|null;achievedOnLabel?:string|null;articleParagraphs?:unknown;photoLabel:string;imageUrl?:string|null;factsVerified:boolean;aiAssisted:boolean};
const paragraphs=(value:unknown):string[]=>Array.isArray(value)?value.filter((item):item is string=>typeof item==="string"):[];
export const toAchievement=(entry:Entry):AchievementStory=>({id:entry.id,yearLabel:entry.yearLabel||"KHLIM",title:entry.title,eventName:entry.eventName,description:entry.summary,photoLabel:entry.photoLabel,imageUrl:entry.imageUrl||undefined,placeholderGradient:GRADIENT,factsVerified:entry.factsVerified,status:"published"});
export const toSpotlight=(entry:Entry):PlayerSpotlightArticle=>({slug:entry.slug||entry.id,playerName:entry.playerName||"KHLIM Player",headline:entry.title,eventName:entry.eventName,achievement:entry.achievement||"Verified milestone",achievedOnLabel:entry.achievedOnLabel||"Verified date",excerpt:entry.summary,articleParagraphs:paragraphs(entry.articleParagraphs),photoLabel:entry.photoLabel,imageUrl:entry.imageUrl||undefined,placeholderGradient:GRADIENT,factsVerified:entry.factsVerified,status:"published",aiAssisted:true});
async function get(path:string){const response=await fetch(`${API}${path}`,{cache:"no-store"});if(!response.ok)throw new Error(`Editorial API ${response.status}`);return response.json() as Promise<Entry[]>;}
export async function fetchPublishedAchievements(){return (await get("/editorial/achievements")).map(toAchievement);}
export async function fetchPublishedSpotlights(){return (await get("/editorial/player-spotlights")).map(toSpotlight);}
export async function fetchPublishedSpotlight(slug:string){const response=await fetch(`${API}/editorial/player-spotlights/${encodeURIComponent(slug)}`,{cache:"no-store"});if(!response.ok)return null;const entry=await response.json() as Entry|null;return entry?toSpotlight(entry):null;}
''')

achievements=Path("apps/web/components/home/achievements-section.tsx")
s=achievements.read_text()
if not s.startswith('"use client"'):
    s='"use client";\n\n'+s
s=s.replace('import React from "react";','import React, { useEffect, useState } from "react";')
s=s.replace('} from "../../lib/editorial-content";','} from "../../lib/editorial-content";\nimport { fetchPublishedAchievements } from "../../lib/editorial-api";')
s=s.replace('export function AchievementsSection() {\n  const stories =\n    publishedAchievements.length > 0\n      ? publishedAchievements\n      : achievementArchiveSlots;\n  const preview = publishedAchievements.length === 0;','export function AchievementsSection() {\n  const [remote, setRemote] = useState<AchievementStory[]>([]);\n  useEffect(() => { void fetchPublishedAchievements().then(setRemote).catch(() => undefined); }, []);\n  const live = remote.length > 0 ? remote : publishedAchievements;\n  const stories = live.length > 0 ? live : achievementArchiveSlots;\n  const preview = live.length === 0;')
achievements.write_text(s)

spot=Path("apps/web/components/home/player-spotlight-section.tsx")
s=spot.read_text()
if not s.startswith('"use client"'):
    s='"use client";\n\n'+s
s=s.replace('import React from "react";','import React, { useEffect, useState } from "react";')
s=s.replace('} from "../../lib/editorial-content";','} from "../../lib/editorial-content";\nimport { fetchPublishedSpotlights } from "../../lib/editorial-api";')
s=s.replace('export function PlayerSpotlightSection() {\n  const preview = publishedPlayerSpotlights.length === 0;\n  const stories = preview\n    ? [playerSpotlightEditorialPreview]\n    : publishedPlayerSpotlights.slice(0, 3);','export function PlayerSpotlightSection() {\n  const [remote, setRemote] = useState<PlayerSpotlightArticle[]>([]);\n  useEffect(() => { void fetchPublishedSpotlights().then(setRemote).catch(() => undefined); }, []);\n  const live = remote.length > 0 ? remote : publishedPlayerSpotlights;\n  const preview = live.length === 0;\n  const stories = preview ? [playerSpotlightEditorialPreview] : live.slice(0, 3);')
s=s.replace('!preview && publishedPlayerSpotlights.length > 3','!preview && live.length > 3')
spot.write_text(s)

Path("tests/phase-6-editorial-studio.test.mjs").write_text(r'''import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
const root=new URL("../",import.meta.url);const read=(p)=>readFile(new URL(p,root),"utf8");
test("editorial studio persists drafts and gates publication on verified facts",async()=>{const schema=await read("prisma/schema.prisma");const service=await read("apps/api/src/editorial/editorial.service.ts");assert.match(schema,/model EditorialEntry/);assert.match(service,/Facts must be verified before publication/);assert.match(service,/status: "PUBLISHED"/);});
test("AI-assisted drafting is source-fact constrained and remains editable",async()=>{const service=await read("apps/api/src/editorial/editorial.service.ts");const page=await read("apps/admin/app/editorial/page.tsx");assert.match(service,/sourceFactsOnly: true/);assert.match(service,/khlim-editorial-assist-v1/);assert.match(page,/Generate AI-assisted draft/);assert.match(page,/Facts and photo rights verified/);});
test("public website consumes published editorial API data",async()=>{const controller=await read("apps/api/src/editorial/editorial.controller.ts");const helper=await read("apps/web/lib/editorial-api.ts");assert.match(controller,/editorial\/achievements/);assert.match(controller,/editorial\/player-spotlights/);assert.match(helper,/cache:"no-store"/);});
test("Admin navigation exposes Editorial Studio",async()=>{const nav=await read("apps/admin/components/layout/AdminSidebar.tsx");assert.match(nav,/\/editorial/);assert.match(nav,/Editorial Studio/);});
''')
