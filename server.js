const express = require('express');
const multer = require('multer');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');

const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();

/* ============================================================
   Obtener la IP local REAL (ignora adaptadores virtuales)
   ============================================================ */
function getLocalIP() {
  const nets = os.networkInterfaces();
  const candidates = [];

  // Nombres que suelen ser adaptadores virtuales -> descartar
  const blacklist = /(virtual|vmware|vbox|hyper-v|loopback|docker|wsl|tailscale|zerotier|radmin|hamachi|tap|tun)/i;

  for (const name of Object.keys(nets)) {
    if (blacklist.test(name)) continue;
    for (const net of nets[name]) {
      if (net.family !== 'IPv4') continue;
      if (net.internal) continue;
      // Solo rangos de red local típicos
      if (
        net.address.startsWith('192.168.') ||
        net.address.startsWith('10.') ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(net.address)
      ) {
        candidates.push({ name, address: net.address });
      }
    }
  }

  // Preferir WiFi sobre Ethernet si ambos existen
  const wifi = candidates.find(c => /wi-?fi|wlan|wireless/i.test(c.name));
  if (wifi) return wifi.address;
  if (candidates.length) return candidates[0].address;
  return '127.0.0.1';
}

/* ============================================================
   Almacenamiento en disco (streaming, sin límite)
   ============================================================ */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const original = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const ext = path.extname(original);
    const base = path.basename(original, ext);
    let name = original;
    let i = 1;
    while (fs.existsSync(path.join(UPLOAD_DIR, name))) {
      name = `${base}_${i}${ext}`;
      i++;
    }
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: Infinity }
});

app.use(express.static(path.join(__dirname, 'public')));

/* ---------- QR ---------- */
app.get('/api/qr', async (req, res) => {
  const ip = getLocalIP();
  const url = `http://${ip}:${PORT}`;
  const qr = await QRCode.toDataURL(url, {
    width: 320,
    margin: 1,
    color: { dark: '#0b1020', light: '#ffffff' }
  });
  res.json({ url, qr });
});

/* ---------- Subir ---------- */
app.post('/api/upload', upload.array('files'), (req, res) => {
  res.json({ ok: true, count: req.files.length });
});

/* ---------- Listar ---------- */
app.get('/api/files', (req, res) => {
  try {
    const files = fs.readdirSync(UPLOAD_DIR).map(name => {
      const stat = fs.statSync(path.join(UPLOAD_DIR, name));
      return { name, size: stat.size, mtime: stat.mtimeMs };
    }).sort((a, b) => b.mtime - a.mtime);
    res.json(files);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ---------- Descargar con Range (acelerador) ---------- */
app.get('/api/download/:name', (req, res) => {
  const name = decodeURIComponent(req.params.name);
  const filePath = path.join(UPLOAD_DIR, name);
  if (!fs.existsSync(filePath)) return res.status(404).end();

  const stat = fs.statSync(filePath);
  const range = req.headers.range;
  const inline = req.query.inline === '1';

  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', guessMime(name));
  res.setHeader(
    'Content-Disposition',
    `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(name)}`
  );

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    if (start >= stat.size) {
      res.status(416).setHeader('Content-Range', `bytes */${stat.size}`);
      return res.end();
    }
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
    res.setHeader('Content-Length', end - start + 1);
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.setHeader('Content-Length', stat.size);
    fs.createReadStream(filePath).pipe(res);
  }
});

/* ---------- Eliminar ---------- */
app.delete('/api/files/:name', (req, res) => {
  const name = decodeURIComponent(req.params.name);
  const filePath = path.join(UPLOAD_DIR, name);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  res.json({ ok: true });
});

function guessMime(name) {
  const ext = path.extname(name).toLowerCase();
  const map = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg',
    '.pdf': 'application/pdf', '.txt': 'text/plain; charset=utf-8',
    '.json': 'application/json', '.zip': 'application/zip'
  };
  return map[ext] || 'application/octet-stream';
}

/* ============================================================
   Abrir el navegador automáticamente
   ============================================================ */
function openBrowser(url) {
  const platform = process.platform;
  let cmd;
  if (platform === 'win32')      cmd = `start "" "${url}"`;
  else if (platform === 'darwin') cmd = `open "${url}"`;
  else                            cmd = `xdg-open "${url}"`;

  exec(cmd, (err) => {
    if (err) console.log('  (No se pudo abrir el navegador automáticamente)');
  });
}

/* ============================================================
   Arranque
   ============================================================ */
app.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log('\n  ⚡ FileDrop iniciado\n');
  console.log(`  Local:  http://localhost:${PORT}`);
  console.log(`  Red:    http://${ip}:${PORT}`);
  console.log('\n  Escanea el QR desde el móvil (misma WiFi).');
  console.log('  Si el móvil no conecta -> revisa el Firewall de Windows.\n');

  // Abrir navegador automáticamente tras 800ms
  setTimeout(() => openBrowser(`http://localhost:${PORT}`), 800);
});