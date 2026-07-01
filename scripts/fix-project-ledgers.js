require('dotenv').config();
const { Client } = require('pg');
const crypto = require('crypto');
const dns = require('dns');

async function resolveDbUrlHost(url) {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1" || /^[0-9.]+$/.test(hostname)) {
      return url;
    }
    const ips = await dns.promises.resolve4(hostname).catch(() => []);
    if (ips && ips.length > 0) {
      parsed.hostname = ips[0];
      return parsed.toString();
    }
  } catch (err) {
    // ignore
  }
  return url;
}

function cleanConnectionString(url) {
  if (!url) return url;
  try {
    const u = new URL(url);
    u.searchParams.delete("sslmode");
    u.searchParams.delete("sslaccept");
    return u.toString();
  } catch {
    return url;
  }
}

// Custom function to generate cuid-like strings (or just standard UUIDs since Postgres supports string IDs)
function generateId() {
  return crypto.randomUUID();
}

async function main() {
  let rawConnectionString = process.env.DATABASE_URL;
  rawConnectionString = await resolveDbUrlHost(rawConnectionString);
  const isLocalhost = rawConnectionString?.includes("localhost") || rawConnectionString?.includes("127.0.0.1");
  const connectionString = cleanConnectionString(rawConnectionString);

  const client = new Client({
    connectionString,
    ssl: isLocalhost ? false : { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    console.log("Starting customer ledger repair for project-based customers (using raw pg)...");

    // 1. Find all project-based customers
    const resCustomers = await client.query(
      `SELECT id, name, opening_balance FROM customers WHERE customer_type = 'PROJECT'`
    );
    const customers = resCustomers.rows;

    console.log(`Found ${customers.length} project-based customers.`);

    for (const customer of customers) {
      console.log(`\nProcessing Customer: ${customer.name} (ID: ${customer.id})`);

      // 2. Find all projects for this customer
      const resProjects = await client.query(
        `SELECT id, name, project_code, contract_amount, created_by, start_date, created_at FROM projects WHERE client_id = $1`,
        [customer.id]
      );
      const projects = resProjects.rows;

      console.log(`  - Found ${projects.length} projects.`);

      for (const project of projects) {
        // Check if DEBIT ledger entry for project contract amount already exists
        const resExisting = await client.query(
          `SELECT id FROM ledger_entries WHERE party_type = 'CUSTOMER' AND party_id = $1 AND entry_type = 'DEBIT' AND reference_type = 'PROJECT' AND reference_id = $2`,
          [customer.id, project.id]
        );

        const contractVal = parseFloat(project.contract_amount);

        if (resExisting.rows.length === 0 && contractVal > 0) {
          console.log(`  - Creating DEBIT ledger entry for Project ${project.project_code} (Contract Value: ${contractVal})`);
          
          const newId = generateId();
          const entryDate = project.start_date || project.created_at || new Date();

          await client.query(
            `INSERT INTO ledger_entries (id, entry_date, party_type, party_id, entry_type, amount, reference_type, reference_id, description, running_balance, channel_type, created_by, created_at)
             VALUES ($1, $2, 'CUSTOMER', $3, 'DEBIT', $4, 'PROJECT', $5, $6, 0, 'PROJECT', $7, NOW())`,
            [
              newId,
              entryDate,
              customer.id,
              project.contract_amount,
              project.id,
              `Contract value for project: ${project.name} (${project.project_code})`,
              project.created_by
            ]
          );
        }
      }

      // 3. Find all invoices for these projects (invoice_type = PROJECT)
      const resInvoices = await client.query(
        `SELECT id, invoice_number FROM sales_invoices WHERE customer_id = $1 AND invoice_type = 'PROJECT'`,
        [customer.id]
      );
      const projectInvoices = resInvoices.rows;

      console.log(`  - Found ${projectInvoices.length} project invoices.`);
      const invoiceIds = projectInvoices.map(inv => inv.id);

      if (invoiceIds.length > 0) {
        // Delete all DEBIT ledger entries for these invoices
        const deleteDebitsRes = await client.query(
          `DELETE FROM ledger_entries WHERE party_type = 'CUSTOMER' AND party_id = $1 AND entry_type = 'DEBIT' AND reference_type = 'INVOICE' AND reference_id = ANY($2)`,
          [customer.id, invoiceIds]
        );
        console.log(`  - Deleted ${deleteDebitsRes.rowCount} invoice DEBIT ledger entries.`);

        // Delete all CREDIT ledger entries for returns associated with these invoices
        const resReturns = await client.query(
          `SELECT id FROM sales_returns WHERE invoice_id = ANY($1)`,
          [invoiceIds]
        );
        const returnIds = resReturns.rows.map(r => r.id);
        if (returnIds.length > 0) {
          const deleteReturnCreditsRes = await client.query(
            `DELETE FROM ledger_entries WHERE party_type = 'CUSTOMER' AND party_id = $1 AND entry_type = 'CREDIT' AND reference_type = 'SALES_RETURN' AND reference_id = ANY($2)`,
            [customer.id, returnIds]
          );
          console.log(`  - Deleted ${deleteReturnCreditsRes.rowCount} return CREDIT ledger entries.`);
        }
      }

      // 4. Recalculate running balance of all ledger entries for this customer in chronological order
      const resEntries = await client.query(
        `SELECT id, entry_type, amount, description FROM ledger_entries WHERE party_type = 'CUSTOMER' AND party_id = $1 ORDER BY entry_date ASC, created_at ASC`,
        [customer.id]
      );
      const entries = resEntries.rows;

      console.log(`  - Recalculating running balances for ${entries.length} remaining ledger entries...`);
      let balance = parseFloat(customer.opening_balance || 0);

      for (const entry of entries) {
        const amount = parseFloat(entry.amount);
        if (entry.entry_type === 'DEBIT') {
          balance += amount;
        } else {
          balance -= amount;
        }

        await client.query(
          `UPDATE ledger_entries SET running_balance = $1 WHERE id = $2`,
          [balance, entry.id]
        );
      }
      console.log(`  - Recalculation complete. Current customer ledger balance: ${balance}`);
    }

    console.log("\nLedger repair completed successfully!");
  } catch (error) {
    console.error("Error running ledger repair script:", error);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
