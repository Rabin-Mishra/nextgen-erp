import { Pool } from "pg";
import { parse } from "pg-connection-string";

async function main() {
  const connectionString = "postgresql://postgres.scddvnmiamtepzdxnhwy:NextGenERP%23%40%24%252026@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true";
  
  // Test 1: Parsed config without modifications
  console.log("Parsed raw URL:", parse(connectionString));
  
  // Test 2: Parsed config with appendSslMode modifications
  function appendSslMode(url: string | undefined): string | undefined {
    if (!url) return url;
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}sslmode=no-verify&sslaccept=accept_invalid_certs`;
  }
  
  const modifiedUrl = appendSslMode(connectionString) || "";
  console.log("Modified URL:", modifiedUrl);
  console.log("Parsed modified URL:", parse(modifiedUrl));
}

main();
