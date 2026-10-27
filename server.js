/**
 * Back in Time — Local Server & AI Proxy
 * Uses only Node.js built-in modules. No external dependencies.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');

// Ensure local uploads directory exists on disk
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// In-memory runtime configuration for LM Studio endpoint
let lmStudioBaseUrl = process.env.LM_STUDIO_URL || 'http://127.0.0.1:1234/v1';

// Supported MIME types for static assets & uploaded media
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8'
};

const MIME_EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
  'audio/mpeg': '.mp3',
  'audio/mp3': '.mp3',
  'audio/wav': '.wav',
  'audio/x-wav': '.wav',
  'audio/ogg': '.ogg',
  'audio/mp4': '.m4a',
  'audio/x-m4a': '.m4a',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
  'application/pdf': '.pdf',
  'text/plain': '.txt'
};

/**
 * Validates that an endpoint URL belongs strictly to a local loopback address.
 * Prevents memory transmission to external or cloud servers.
 */
function isLoopbackUrl(targetUrl) {
  try {
    const parsed = new URL(targetUrl);
    const hostname = parsed.hostname.toLowerCase();
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '[::1]' ||
      hostname === '0.0.0.0'
    );
  } catch {
    return false;
  }
}

/**
 * Sends a structured JSON response
 */
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(data));
}

/**
 * Reads JSON payload from an incoming HTTP request
 */
function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      // Protect against unreasonably large payloads (>5MB)
      if (body.length > 5 * 1024 * 1024) {
        req.destroy();
        reject(new Error('Request payload too large'));
      }
    });
    req.on('end', () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON format'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Reads media upload payload (supports up to 100MB for video/audio/photo files)
 */
function parseUploadBody(req, maxBytes = 100 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > maxBytes) {
        req.destroy();
        reject(new Error('Media file exceeds maximum upload size (100MB limit).'));
      }
    });
    req.on('end', () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid upload payload format'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Queries the LM Studio models endpoint to check status and fetch available models
 */
async function checkLmStudioConnection(baseUrl) {
  const modelsUrl = `${baseUrl.replace(/\/+$/, '')}/models`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(modelsUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      return {
        online: true,
        models: (data.data || []).map(m => m.id),
        url: baseUrl
      };
    } else {
      return {
        online: false,
        models: [],
        url: baseUrl,
        error: `LM Studio returned HTTP ${response.status}: ${response.statusText}`
      };
    }
  } catch (err) {
    let message = 'Unable to connect to LM Studio.';
    if (err.name === 'AbortError') {
      message = 'Connection to LM Studio timed out. The local server may be unresponsive or busy loading a model.';
    } else if (err.cause && (err.cause.code === 'ECONNREFUSED' || err.message.includes('ECONNREFUSED'))) {
      message = 'LM Studio local server is offline. Please launch LM Studio and start the local server on port 1234.';
    } else {
      message = `Connection failed: ${err.message || 'Server unreachable'}`;
    }
    return {
      online: false,
      models: [],
      url: baseUrl,
      error: message
    };
  }
}

/**
 * Main HTTP Server Request Handler
 */
const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Add CORS headers for local usage and security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  // --- API ROUTES ---

  // Dedicated media storage endpoint for films, audio recordings, broadcasts, and photos
  if (method === 'POST' && pathname === '/api/upload') {
    try {
      const body = await parseUploadBody(req);
      if (!body.dataUrl) {
        return sendJson(res, 400, { error: 'No media file data received.' });
      }

      // Extract Base64 binary payload from data URI: data:[mime];base64,[data]
      const matches = body.dataUrl.match(/^data:([A-Za-z-+\/0-9]+);base64,(.+)$/);
      let buffer;
      let extension = '.bin';

      if (matches && matches.length === 3) {
        const mime = matches[1].toLowerCase();
        buffer = Buffer.from(matches[2], 'base64');
        extension = MIME_EXTENSIONS[mime] || path.extname(body.fileName || '').toLowerCase() || '.bin';
      } else {
        buffer = Buffer.from(body.dataUrl, 'base64');
        extension = path.extname(body.fileName || '').toLowerCase() || '.bin';
      }

      // Sanitize filename to prevent directory traversal or invalid characters
      const rawBase = path.basename(body.fileName || 'media', path.extname(body.fileName || ''));
      const safeBase = rawBase.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 32);
      const uniqueName = `media_${Date.now()}_${Math.random().toString(36).substring(2, 6)}_${safeBase}${extension}`;
      const targetFilePath = path.join(UPLOADS_DIR, uniqueName);

      await fs.promises.writeFile(targetFilePath, buffer);

      return sendJson(res, 200, {
        success: true,
        url: `/uploads/${uniqueName}`,
        fileName: uniqueName,
        originalName: body.fileName || uniqueName,
        size: buffer.length,
        mimeType: matches ? matches[1] : 'application/octet-stream'
      });
    } catch (uploadErr) {
      return sendJson(res, 500, {
        error: `Media upload storage failed: ${uploadErr.message}`
      });
    }
  }

  // Health check and LM Studio status
  if (method === 'GET' && (pathname === '/api/health' || pathname === '/api/status')) {
    const status = await checkLmStudioConnection(lmStudioBaseUrl);
    return sendJson(res, 200, {
      service: 'Back in Time Server',
      status: 'active',
      lmStudio: status
    });
  }

  // List available models from LM Studio
  if (method === 'GET' && pathname === '/api/models') {
    const status = await checkLmStudioConnection(lmStudioBaseUrl);
    if (!status.online) {
      return sendJson(res, 503, {
        error: status.error,
        code: 'LM_STUDIO_OFFLINE',
        url: lmStudioBaseUrl,
        models: []
      });
    }
    return sendJson(res, 200, {
      models: status.models,
      url: lmStudioBaseUrl
    });
  }

  // Get or update server-side LM Studio settings
  if (pathname === '/api/settings') {
    if (method === 'GET') {
      const status = await checkLmStudioConnection(lmStudioBaseUrl);
      return sendJson(res, 200, {
        lmStudioBaseUrl,
        isLoopback: isLoopbackUrl(lmStudioBaseUrl),
        connection: status
      });
    }

    if (method === 'POST') {
      try {
        const body = await parseRequestBody(req);
        if (!body.lmStudioBaseUrl) {
          return sendJson(res, 400, { error: 'lmStudioBaseUrl is required' });
        }

        // Strict loopback safety check
        if (!isLoopbackUrl(body.lmStudioBaseUrl)) {
          return sendJson(res, 403, {
            error: 'Security Policy: Back in Time only permits local loopback endpoints (e.g. http://127.0.0.1:1234/v1). Cloud or external AI addresses are prohibited to protect personal memory privacy.'
          });
        }

        lmStudioBaseUrl = body.lmStudioBaseUrl.trim().replace(/\/+$/, '');
        const status = await checkLmStudioConnection(lmStudioBaseUrl);

        return sendJson(res, 200, {
          success: true,
          lmStudioBaseUrl,
          connection: status
        });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }
  }

  // Chat completion proxy to LM Studio
  if (method === 'POST' && pathname === '/api/chat') {
    try {
      const body = await parseRequestBody(req);

      if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
        return sendJson(res, 400, { error: 'A messages array is required.' });
      }

      // Ensure target server is strictly loopback
      const targetUrl = (body.baseUrl || lmStudioBaseUrl).trim().replace(/\/+$/, '');
      if (!isLoopbackUrl(targetUrl)) {
        return sendJson(res, 403, {
          error: 'Security restriction: AI requests cannot be sent to external hosts. Loopback connection required.'
        });
      }

      const completionsUrl = `${targetUrl}/chat/completions`;

      const payload = {
        model: body.model || 'local-model',
        messages: body.messages,
        temperature: typeof body.temperature === 'number' ? body.temperature : 0.4,
        max_tokens: typeof body.max_tokens === 'number' ? body.max_tokens : 1000,
        stream: false
      };

      const controller = new AbortController();
      // Generous timeout for local inference on CPU/GPU
      const timeout = setTimeout(() => controller.abort(), 120000);

      let response;
      try {
        response = await fetch(completionsUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
      } catch (networkErr) {
        clearTimeout(timeout);
        let errorMsg = 'Could not reach LM Studio.';
        if (networkErr.name === 'AbortError') {
          errorMsg = 'LM Studio took longer than 120 seconds to respond. The model may be generating very slowly or frozen.';
        } else if (networkErr.cause && networkErr.cause.code === 'ECONNREFUSED') {
          errorMsg = `Connection refused at ${targetUrl}. Is LM Studio Local Inference Server running?`;
        } else {
          errorMsg = `Connection error: ${networkErr.message}`;
        }
        return sendJson(res, 503, {
          error: errorMsg,
          code: 'LM_STUDIO_UNREACHABLE',
          details: networkErr.message
        });
      }
      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        return sendJson(res, response.status, {
          error: `LM Studio returned status ${response.status}: ${errorText || response.statusText}`,
          code: 'LM_STUDIO_ERROR'
        });
      }

      const data = await response.json();
      return sendJson(res, 200, data);

    } catch (err) {
      return sendJson(res, 500, {
        error: 'An internal error occurred while processing the memory exploration query.',
        details: err.message
      });
    }
  }

  // --- STATIC FILE SERVING ---
  if (method === 'GET') {
    let safePath = pathname === '/' ? '/index.html' : pathname;
    // Normalize and prevent path traversal
    safePath = path.normalize(safePath).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.join(PUBLIC_DIR, safePath);

    // Verify file stays within PUBLIC_DIR
    if (!filePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Access Denied');
      return;
    }

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        // Fall back to index.html for single-page routing if file doesn't exist
        const indexPath = path.join(PUBLIC_DIR, 'index.html');
        fs.readFile(indexPath, (indexErr, content) => {
          if (indexErr) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('404 Not Found');
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(content);
        });
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      fs.readFile(filePath, (readErr, content) => {
        if (readErr) {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Internal Server Error');
          return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      });
    });
    return;
  }

  // Method not allowed
  res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Method Not Allowed');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`=======================================================`);
  console.log(` Back in Time — Personal Memory & History Archive`);
  console.log(` Web Server running at: http://127.0.0.1:${PORT}`);
  console.log(` LM Studio Target URL: ${lmStudioBaseUrl}`);
  console.log(` Loopback Security Protection: ACTIVE`);
  console.log(`=======================================================`);
});
