import { shopifyGraphql } from "@/lib/shopify";

type Staged = { stagedUploadsCreate: { stagedTargets: { url: string; resourceUrl: string; parameters: { name: string; value: string }[] }[]; userErrors: { message: string }[] } };
type Created = { fileCreate: { files: { id: string }[]; userErrors: { message: string }[] } };
type FileNode = { id: string; fileStatus: string; alt: string | null; image?: { url: string; width: number; height: number } | null; preview?: { image?: { url: string } | null } | null; url?: string; originalSource?: { url: string } | null };

/** Uploads bytes to Shopify Files and returns the Shopify file id + CDN url (polls until READY). */
export async function uploadToShopifyFiles(buf: Buffer, filename: string, mime: string, alt = "") {
  const staged = await shopifyGraphql<Staged>(`
    mutation($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) { stagedTargets { url resourceUrl parameters { name value } } userErrors { message } } }`,
    { input: [{ filename, mimeType: mime, resource: mime.startsWith("image/") ? "IMAGE" : "FILE", httpMethod: "POST", fileSize: String(buf.length) }] });
  if (staged.stagedUploadsCreate.userErrors.length) throw new Error(staged.stagedUploadsCreate.userErrors[0].message);
  const t = staged.stagedUploadsCreate.stagedTargets[0];
  const form = new FormData();
  for (const p of t.parameters) form.append(p.name, p.value);
  form.append("file", new Blob([new Uint8Array(buf)], { type: mime }), filename);
  const up = await fetch(t.url, { method: "POST", body: form });
  if (!up.ok) throw new Error(`staged upload failed ${up.status}: ${await up.text()}`);

  const created = await shopifyGraphql<Created>(`
    mutation($files: [FileCreateInput!]!) { fileCreate(files: $files) { files { id } userErrors { message } } }`,
    { files: [{ originalSource: t.resourceUrl, contentType: mime.startsWith("image/") ? "IMAGE" : "FILE", alt, filename }] });
  if (created.fileCreate.userErrors.length) throw new Error(created.fileCreate.userErrors[0].message);
  const id = created.fileCreate.files[0].id;

  for (let i = 0; i < 20; i++) {
    const f = await getShopifyFile(id);
    if (f?.fileStatus === "READY") return { id, url: f.image?.url ?? f.url ?? f.preview?.image?.url ?? "", width: f.image?.width, height: f.image?.height };
    if (f?.fileStatus === "FAILED") throw new Error("Shopify file processing failed");
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error("Shopify file not ready in time");
}

export async function getShopifyFile(id: string): Promise<FileNode | null> {
  const d = await shopifyGraphql<{ node: FileNode | null }>(`
    query($id: ID!) { node(id: $id) { ... on MediaImage { id fileStatus alt image { url width height } }
                                     ... on GenericFile { id fileStatus alt url } } }`, { id });
  return d.node;
}
