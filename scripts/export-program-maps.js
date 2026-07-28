// Snapshots every program currently in the live Firestore database into
// program-maps/<Program>/<YYYY-MM-DD>.json — one dated file per program,
// always all of them, so a specific day's mapping can always be found by
// date rather than by digging through git history.
// Uses the Firestore REST API directly (no SDK/npm dependency), same
// pattern used for the block-mapping updates applied via Claude Code.
//
// Usage: node scripts/export-program-maps.js

const fs = require('fs');
const path = require('path');
const https = require('https');

const PROJECT = 'program-schedule-chart';
const OUT_DIR = path.join(__dirname, '..', 'program-maps');

function get(pathName) {
  return new Promise((resolve, reject) => {
    https.get({ hostname: 'firestore.googleapis.com', path: pathName }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(JSON.parse(data || '{}'));
        else reject(new Error(`HTTP ${res.statusCode}: ${data}`));
      });
    }).on('error', reject);
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

async function fetchAllDocs(collection) {
  const docs = [];
  let pageToken = '';
  do {
    const qs = new URLSearchParams({ pageSize: '300' });
    if (pageToken) qs.set('pageToken', pageToken);
    const page = await get(`/v1/projects/${PROJECT}/databases/(default)/documents/${collection}?${qs}`);
    (page.documents || []).forEach(d => docs.push(d));
    pageToken = page.nextPageToken || '';
  } while (pageToken);
  return docs;
}

(async () => {
  const programDocs = await fetchAllDocs('programs');
  const programs = programDocs.map(d => d.name.split('/').pop()).sort();

  const classDocs = await fetchAllDocs('classes');
  const classes = classDocs.map(d => {
    const f = d.fields;
    return {
      program: val(f.program),
      name: val(f.name),
      credits: val(f.credits),
      hours: val(f.hours),
      hoursManual: val(f.hoursManual) ?? false,
      startWeek: val(f.startWeek),
      duration: val(f.duration),
    };
  });

  const savedAt = new Date().toISOString();
  const date = savedAt.slice(0, 10); // YYYY-MM-DD
  let written = 0;
  for (const program of programs) {
    const rows = classes
      .filter(c => c.program === program)
      .sort((a, b) => a.startWeek - b.startWeek)
      .map(({ program: _drop, ...rest }) => rest); // program is implied by the file

    const programDir = path.join(OUT_DIR, program);
    if (!fs.existsSync(programDir)) fs.mkdirSync(programDir, { recursive: true });

    const outFile = path.join(programDir, `${date}.json`);
    const overwriting = fs.existsSync(outFile);
    const payload = { program, date, savedAt, classes: rows };
    fs.writeFileSync(outFile, JSON.stringify(payload, null, 2) + '\n', 'utf8');
    console.log(`Wrote ${program}/${date}.json (${rows.length} classes)${overwriting ? ' [overwrote existing save from today]' : ''}`);
    written++;
  }

  // Flag any class whose program doesn't match a known program doc (orphaned data).
  const orphans = classes.filter(c => !programs.includes(c.program));
  if (orphans.length) {
    console.warn(`\nWarning: ${orphans.length} class(es) reference a program not in the programs collection:`);
    orphans.forEach(c => console.warn(`  - "${c.name}" (program: "${c.program}")`));
  }

  console.log(`\nDone. ${written} program file(s) written to ${OUT_DIR}`);
})().catch(err => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
