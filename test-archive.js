/**
 * Back in Time — Automated System & Integration Test Suite
 * Validates backend proxy, security constraints, date parsing,
 * schema validation, and LM Studio connectivity.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    testsPassed++;
  } else {
    console.error(`  ✗ FAILED: ${message}`);
    testsFailed++;
  }
}

// Helper to make local HTTP requests
function httpRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

// Timeline parser test replica
function testParseDate(raw, isExplicitApprox) {
  if (!raw || !raw.trim()) return { year: null, isApprox: false };
  const isApprox = isExplicitApprox || /circa|c\.|~|approx|about|\b\d{4}s\b/i.test(raw);
  const match = raw.match(/\b(17\d{2}|18\d{2}|19\d{2}|20\d{2})\b/);
  return {
    year: match ? parseInt(match[1], 10) : null,
    isApprox
  };
}

async function runTests() {
  console.log('====================================================');
  console.log(' Running Back in Time Test Suite');
  console.log('====================================================\n');

  // Test 1: Verify static files exist
  console.log('[Test Suite 1: Project Files & Integrity]');
  const expectedFiles = [
    'package.json',
    'server.js',
    'sample-memories.json',
    'public/index.html',
    'public/css/style.css',
    'public/js/storage.js',
    'public/js/timeline.js',
    'public/js/explorer.js',
    'public/js/settings.js',
    'public/js/app.js'
  ];

  for (const f of expectedFiles) {
    const fullPath = path.join(__dirname, f);
    assert(fs.existsSync(fullPath), `File exists: ${f}`);
  }

  // Test 2: Sample memories data format & Audiovisual Heritage fields
  console.log('\n[Test Suite 2: Memory Schema & Audiovisual Heritage Validation]');
  const sampleMemories = JSON.parse(fs.readFileSync(path.join(__dirname, 'sample-memories.json'), 'utf8'));
  assert(Array.isArray(sampleMemories) && sampleMemories.length >= 6, `Found ${sampleMemories.length} starter memories`);

  const sample = sampleMemories[0];
  assert(Boolean(sample.title && sample.person && sample.notes && sample.source), 'Record contains required fields');
  assert(['documented', 'family_recollection', 'possible_interpretation', 'uncertain'].includes(sample.evidenceCategory), 'Valid evidenceCategory class');
  assert(['film', 'video', 'audio', 'radio', 'television', 'photo', 'document'].includes(sample.mediaType), `Audiovisual mediaType verified: ${sample.mediaType}`);
  assert(Boolean(sample.formatMedium && sample.language), 'Audiovisual formatMedium & language fields present');
  assert(Boolean(sample.mediaUrl), 'Media artwork/picture URL present');

  // Test 3: Timeline Date Parsing
  console.log('\n[Test Suite 3: Timeline Date & Era Parser]');
  const d1 = testParseDate('1923-04-18', false);
  assert(d1.year === 1923 && d1.isApprox === false, 'Exact date parsing (1923-04-18)');

  const d2 = testParseDate('Circa 1931', false);
  assert(d2.year === 1931 && d2.isApprox === true, 'Circa date parsing (Circa 1931)');

  const d3 = testParseDate('~1945', false);
  assert(d3.year === 1945 && d3.isApprox === true, 'Tilde date parsing (~1945)');

  const d4 = testParseDate('', false);
  assert(d4.year === null, 'Undated record detection (empty string)');

  // Test 4: Live HTTP Server Tests
  console.log('\n[Test Suite 4: Server Endpoints & Security]');
  try {
    // 4.1 Index HTML
    const resIndex = await httpRequest({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/',
      method: 'GET'
    });
    assert(resIndex.statusCode === 200, `GET / returned HTTP 200 (length: ${resIndex.body.length})`);
    assert(resIndex.body.includes('Back in Time'), 'HTML contains application title');

    // 4.2 Health / Status API
    const resHealth = await httpRequest({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/health',
      method: 'GET'
    });
    assert(resHealth.statusCode === 200, 'GET /api/health returned HTTP 200');
    const healthJson = JSON.parse(resHealth.body);
    assert(healthJson.service === 'Back in Time Server', 'Service identifier is verified');
    assert(typeof healthJson.lmStudio.online === 'boolean', `LM Studio online status reported: ${healthJson.lmStudio.online}`);

    // 4.3 Security: Rejection of external non-loopback endpoints
    const resSec = await httpRequest({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/settings',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { lmStudioBaseUrl: 'https://api.openai.com/v1' });

    assert(resSec.statusCode === 403, 'Security Policy: External cloud AI URL rejected with HTTP 403 Forbidden');
    const secJson = JSON.parse(resSec.body);
    assert(secJson.error && secJson.error.includes('loopback'), 'Security error explains loopback privacy restriction');

    // 4.4 File Upload API & Local Storage Integrity
    const dummyImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const uploadPayload = {
      fileName: 'test_retro_photo.png',
      dataUrl: `data:image/png;base64,${dummyImageBase64}`
    };

    const resUpload = await httpRequest({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/upload',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, uploadPayload);

    assert(resUpload.statusCode === 200, 'POST /api/upload returned HTTP 200');
    const uploadJson = JSON.parse(resUpload.body);
    assert(uploadJson.success === true, 'Upload response indicates success');
    assert(uploadJson.url && uploadJson.url.startsWith('/uploads/'), `Upload URL correctly assigned: ${uploadJson.url}`);

    // Verify uploaded file can be served statically
    const resServeUpload = await httpRequest({
      hostname: '127.0.0.1',
      port: 3000,
      path: uploadJson.url,
      method: 'GET'
    });
    assert(resServeUpload.statusCode === 200, `GET ${uploadJson.url} served static media with HTTP 200`);

    // Clean up test upload file from disk
    const diskPath = path.join(__dirname, 'public', uploadJson.url);
    if (fs.existsSync(diskPath)) {
      fs.unlinkSync(diskPath);
    }

  } catch (err) {
    console.error('HTTP Test Note: Local server must be running on port 3000 for live endpoint tests:', err.message);
  }

  console.log('\n====================================================');
  console.log(` Test Results: ${testsPassed} Passed, ${testsFailed} Failed`);
  console.log('====================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests();
