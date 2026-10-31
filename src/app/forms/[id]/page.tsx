export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { FormEditor } from "./editor";
import { FormReport } from "../report";
export default async function FormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const [f] = await sql`select * from forms where id = ${id}`; if (!f) notFound();
  return (<>
    <FormEditor form={JSON.parse(JSON.stringify(f))} appUrl={process.env.APP_URL ?? "https://edm.bluebellscakery.co.nz"} />
    <div className="mx-auto max-w-7xl px-6 pb-12"><h2 className="mb-3 text-lg font-semibold">Performance · last 30 days</h2><FormReport formId={Number(f.id)} days={30} /></div>
  </>);
}
