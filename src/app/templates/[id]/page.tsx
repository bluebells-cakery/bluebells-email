import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { TemplateEditor } from "./editor";
import { HtmlPreview } from "./html-preview";

export default async function TemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [t] = await sql`select id, name, design, html, kind, subject from templates where id = ${id}`;
  if (!t) notFound();
  if (t.kind === "html") return <HtmlPreview id={String(t.id)} name={t.name} subject={t.subject} html={t.html ?? ""} />;
  return <TemplateEditor id={String(t.id)} name={t.name} design={t.design} />;
}
