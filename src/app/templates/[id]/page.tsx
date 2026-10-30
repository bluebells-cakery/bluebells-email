import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { TemplateEditor } from "./editor";

export default async function TemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [t] = await sql`select id, name, design from templates where id = ${id}`;
  if (!t) notFound();
  return <TemplateEditor id={String(t.id)} name={t.name} design={t.design} />;
}
