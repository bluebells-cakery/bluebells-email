export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { FormEditor } from "./editor";
export default async function FormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const [f] = await sql`select * from forms where id = ${id}`; if (!f) notFound();
  return <FormEditor form={JSON.parse(JSON.stringify(f))} appUrl={process.env.APP_URL ?? "https://edm.bluebellscakery.co.nz"} />;
}
