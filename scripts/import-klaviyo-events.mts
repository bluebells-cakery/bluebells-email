import { importKlaviyoEvents } from "../src/lib/sync/klaviyo-events";
const since = new Date(Date.now() - 180 * 86400000).toISOString();
const log = (s: string) => process.stdout.write(new Date().toISOString().slice(11, 19) + " " + s);
for (const m of ["Thwsvq", "WfmaTK", "Y8qiKC"]) console.log(m, await importKlaviyoEvents(m, since, { log }));
