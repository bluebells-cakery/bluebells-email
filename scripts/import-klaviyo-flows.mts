import { importKlaviyoFlows, importKlaviyoSegments } from "../src/lib/sync/klaviyo-flows";
const log = (s: string) => process.stdout.write(s);
console.log(await importKlaviyoSegments({ log }));
console.log(await importKlaviyoFlows({ log }));
