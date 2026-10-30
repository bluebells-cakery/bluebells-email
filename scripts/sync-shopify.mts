import { syncShopifyCustomers, syncShopifyOrders } from "../src/lib/sync/shopify";
const since = process.argv[2];
const log = (s: string) => console.log(new Date().toISOString().slice(11, 19), s);
console.log("customers:", await syncShopifyCustomers({ since, log }));
console.log("orders:", await syncShopifyOrders({ since, log }));
