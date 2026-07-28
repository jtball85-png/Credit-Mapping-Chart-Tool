// Restores ONE program's classes in the live Firestore database from its
// program-maps/<Program>.json snapshot. Deletes that program's current
// class docs and recreates them from the file (new Firestore doc IDs —
// nothing else references the old ones). Never touches any other program.
//
// Usage: node scripts/restore-program-map.js "Bookkeeping"

const fs = require('fs');
const path = require('path');
const https = require('https');

const PROJECT = 'program-schedule-chart';
const MAPS_DIR = path.join(__dirname, '..', 'program-maps');

function request(method, pathName, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;
    const req = https.request({
      hostname: 'firestore.googleapis.com',
      path: pathName,
      method,
      headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}
    }, res => {
      let chunks = '';
      res.on('data', c => chunks += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(JSON.parse(chunks || '{}'));
        else reject(new Error(`HTTP ${res.statusCode}: ${chunks}`));
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function val(f) {
  if (!f) return undefined;
  if (f.integerValue !== undefined) return parseInt(f.integerValue, 10);
  if (f.doubleValue !== undefined) return f.doubleValue;
  if (f.booleanValue !== undefined) return f.booleanValue;
  if (f.stringValue !== undefined) return f.stringValue;
  return undefined;
}

function fields(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') out[k] = { stringValue: v };
    else if (typeof v === 'boolean') out[k] = { booleanValue: v };
    else if (typeof v === 'number') out[k] = { integerValue: String(v) };
  }
  return { fields: out };
}

const BLOCK_SIZE = 15;
const TOTAL_WEEKS = 45;
function blockSummary(rows) {
  const blockCount = Math.ceil(TOTAL_WEEKS / BLOCK_SIZE);
  const totals = new Array(blockCount).fill(0);
  rows.forEach(c => {
    const endWeek = c.startWeek + c.duration - 1;
    const idx = Math.min(blockCount - 1, Math.floor((endWeek - 1) / BLOCK_SIZE));
    totals[idx] += c.credits || 0;
  });
  return totals;
}

async function fetchAllClasses() {
  const docs = [];
  let pageToken = '';
  do {
    const qs = new URLSearchParams({ pageSize: '300' });
    if (pageToken) qs.set('pageToken', pageToken);
    const page = await request('GET', `/v1/projects/${PROJECT}/databases/(default)/documents/classes?${qs}`);
    (page.documents || []).forEach(d => docs.push(d));
    pageToken = page.nextPageToken || '';
  } while (pageToken);
  return docs;
}

(async () => {
  const program = process.argv[2];
  if (!program) {
    console.error('Usage: node scripts/restore-program-map.js "<ProgramName>"');
    process.exit(1);
  }

  const mapFile = path.join(MAPS_DIR, `${program}.json`);
  if (!fs.existsSync(mapFile)) {
    console.error(`No snapshot found at ${mapFile}`);
    process.exit(1);
  }
  const snapshot = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
  if (snapshot.program !== program) {
    console.error(`Snapshot's "program" field ("${snapshot.program}") doesn't match "${program}" — refusing to proceed.`);
    process.exit(1);
  }

  const allClasses = await fetchAllClasses();
  const currentDocs = allClasses.filter(d => val(d.fields.program) === program);
  const currentRows = currentDocs.map(d => ({ credits: val(d.fields.credits), startWeek: val(d.fields.startWeek), duration: val(d.fields.duration) }));

  console.log(`Program: ${program}`);
  console.log(`Snapshot saved at: ${snapshot.savedAt}`);
  console.log(`Current live: ${currentDocs.length} classes, block totals: ${blockSummary(currentRows).map(n => n + 'cr').join(' / ')}`);
  console.log(`Restoring from snapshot: ${snapshot.classes.length} classes, block totals: ${blockSummary(snapshot.classes).map(n => n + 'cr').join(' / ')}`);

  console.log(`\nDeleting ${currentDocs.length} current class doc(s) for "${program}"...`);
  for (const d of currentDocs) {
    const id = d.name.split('/').pop();
    await request('DELETE', `/v1/projects/${PROJECT}/databases/(default)/documents/classes/${id}`);
  }

  console.log(`Creating ${snapshot.classes.length} class doc(s) from snapshot...`);
  for (const c of snapshot.classes) {
    const body = fields({ ...c, program });
    await request('POST', `/v1/projects/${PROJECT}/databases/(default)/documents/classes`, body);
  }

  console.log(`\nDone. "${program}" restored to its ${snapshot.savedAt} snapshot.`);
})().catch(err => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
