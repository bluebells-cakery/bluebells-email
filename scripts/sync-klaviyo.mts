import { syncKlaviyoProfiles } from "../src/lib/sync/klaviyo";
const log = (s: string) => console.log(new Date().toISOString().slice(11, 19), s);
console.log(await syncKlaviyoProfiles({ log }));
