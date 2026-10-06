const $ = (s) => document.querySelector(s);

/* ---------------- Toast ---------------- */
function toast(msg, isError = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'show' + (isError ? ' error' : '');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.className = ''; }, 2600);
}

/* ---------------- Utilidades ---------------- */
function formatBytes(b) {
  if (!b) return '0 B';
  const k = 1024, u = ['B','KB','MB','GB','TB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return (b / Math.pow(k, i)).toFixed(i ? 2 : 0) + ' ' + u[i];
}

function formatSpeed(bps) {
  return formatBytes(bps) + '/s';
}

function fileEmoji(name) {
  const e = name.split('.').pop().toLowerCase();
  if (/^(jpg|jpeg|png|gif|webp|bmp|svg|avif)$/.test(e)) return '🖼️';
  if (/^(mp4|mov|avi|mkv|webm)$/.test(e)) return '🎬';
  if (/^(mp3|wav|flac|ogg|m4a)$/.test(e)) return '🎵';
  if (/^(zip|rar|7z|tar|gz)$/.test(e)) return '📦';
  if (/^(pdf)$/.test(e)) return '📕';
  if (/^(doc|docx)$/.test(e)) return '📘';
  if (/^(xls|xlsx|csv)$/.test(e)) return '📗';
  if (/^(ppt|pptx)$/.test(e)) return '📙';
  if (/^(apk)$/.test(e)) return '🤖';
  if (/^(exe|msi)$/.test(e)) return '⚙️';
  if (/^(txt|md)$/.test(e)) return '📄';
  return '📁';
}

/* ---------------- QR ---------------- */
async function loadQR() {
  try {
    const res = await fetch('/api/qr');
    const data = await res.json();
    $('#qr-img').src = data.qr;
    $('#server-url').textContent = data.url;
  } catch (e) { console.error(e); }
}

/* ---------------- Lista de archivos ---------------- */
async function loadFiles() {
  try {
    const res = await fetch('/api/files');
    const files = await res.json();
    const list = $('#file-list');
    list.innerHTML = '';

    if (!files.length) {
      const li = document.createElement('li');
      li.className = 'empty';
      li.textContent = 'No hay archivos todavía';
      list.appendChild(li);
      return;
    }

    for (const f of files) {
      const li = document.createElement('li');
      li.className = 'file-item';

      const isImg = /\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i.test(f.name);

      // Icono
      const icon = document.createElement('div');
      icon.className = 'file-icon';
      if (isImg) {
        const img = document.createElement('img');
        img.loading = 'lazy';
        img.src = '/api/download/' + encodeURIComponent(f.name) + '?inline=1';
        icon.appendChild(img);
      } else {
        icon.textContent = fileEmoji(f.name);
      }

      // Info
      const info = document.createElement('div');
      info.className = 'file-info';
      const nameEl = document.createElement('div');
      nameEl.className = 'file-name';
      nameEl.textContent = f.name;
      nameEl.title = f.name;
      const metaEl = document.createElement('div');
      metaEl.className = 'file-meta';
      metaEl.textContent = formatBytes(f.size);
      info.appendChild(nameEl);
      info.appendChild(metaEl);

      // Acciones
      const actions = document.createElement('div');
      actions.className = 'file-actions';

      const dlBtn = document.createElement('button');
      dlBtn.className = 'btn-icon dl';
      dlBtn.title = 'Descargar (acelerado)';
      dlBtn.textContent = '↓';
      dlBtn.onclick = () => startDownload(f);

      const delBtn = document.createElement('button');
      delBtn.className = 'btn-icon del';
      delBtn.title = 'Eliminar';
      delBtn.textContent = '✕';
      delBtn.onclick = async () => {
        if (!confirm(`¿Eliminar "${f.name}"?`)) return;
        await fetch('/api/files/' + encodeURIComponent(f.name), { method: 'DELETE' });
        toast('Eliminado');
        loadFiles();
      };

      actions.appendChild(dlBtn);
      actions.appendChild(delBtn);

      li.appendChild(icon);
      li.appendChild(info);
      li.appendChild(actions);
      list.appendChild(li);
    }
  } catch (e) {
    console.error(e);
    toast('Error al cargar archivos', true);
  }
}

/* ============================================================
   ACELERADOR DE DESCARGA
   Divide el archivo en N trozos y los descarga en paralelo
   usando peticiones HTTP Range. Luego los une.
   ============================================================ */
async function acceleratedDownload(name, size, onProgress) {
  const url = '/api/download/' + encodeURIComponent(name);

  // Archivos pequeños -> descarga normal
  if (size < 1024 * 1024) {
    const res = await fetch(url);
    const blob = await res.blob();
    onProgress(1, size, 0);
    return blob;
  }

  // Número de conexiones paralelas (el navegador limita a ~6 por host en HTTP/1.1)
  const CONCURRENCY = 6;
  const chunkSize = Math.ceil(size / CONCURRENCY);
  const chunks = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    const from = i * chunkSize;
    const to = Math.min(from + chunkSize - 1, size - 1);
    if (from > to) break;
    chunks.push({ from, to, index: i });
  }

  const buffers = new Array(chunks.length);
  let loaded = 0;
  const t0 = performance.now();

  async function downloadChunk(chunk) {
    const res = await fetch(url, {
      headers: { Range: `bytes=${chunk.from}-${chunk.to}` }
    });
    if (!res.ok && res.status !== 206) throw new Error('HTTP ' + res.status);

    const reader = res.body.getReader();
    const parts = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value);
      loaded += value.length;
      const elapsed = (performance.now() - t0) / 1000;
      onProgress(loaded / size, loaded, loaded / Math.max(elapsed, 0.001));
    }
    buffers[chunk.index] = new Blob(parts);
  }

  await Promise.all(chunks.map(downloadChunk));
  return new Blob(buffers);
}

async function startDownload(file) {
  // Overlay de progreso
  const overlay = document.createElement('div');
  overlay.className = 'dl-progress';
  overlay.innerHTML = `
    <div class="title">${escapeHtml(file.name)}</div>
    <div class="bar"><div></div></div>
    <div class="stats"><span class="pct">0%</span><span class="spd"></span></div>
  `;
  document.body.appendChild(overlay);

  const bar = overlay.querySelector('.bar > div');
  const pct = overlay.querySelector('.pct');
  const spd = overlay.querySelector('.spd');

  const onProgress = (ratio, loaded, speed) => {
    bar.style.width = (ratio * 100).toFixed(1) + '%';
    pct.textContent = (ratio * 100).toFixed(0) + '% · ' + formatBytes(loaded);
    spd.textContent = speed ? '⚡ ' + formatSpeed(speed) : '';
  };

  try {
    const blob = await acceleratedDownload(file.name, file.size, onProgress);

    // Guardar
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);

    toast('✅ Descarga completada');
  } catch (e) {
    console.error(e);
    toast('Error en la descarga: ' + e.message, true);
  } finally {
    setTimeout(() => overlay.remove(), 800);
  }
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[c]);
}

/* ---------------- Subida ---------------- */
function uploadFiles(files) {
  if (!files.length) return;

  const formData = new FormData();
  for (const f of files) formData.append('files', f);

  // Contenedor de progreso
  const wrap = document.createElement('div');
  wrap.className = 'upload-item';
  wrap.innerHTML = `
    <div class="name">${files.length} archivo(s) · ${formatBytes([...files].reduce((a,f)=>a+f.size,0))}</div>
    <div class="bar"><div></div></div>
    <div class="meta"><span class="st">Subiendo…</span><span class="pct">0%</span></div>
  `;
  $('#upload-list').appendChild(wrap);

  const bar = wrap.querySelector('.bar > div');
  const st  = wrap.querySelector('.st');
  const pct = wrap.querySelector('.pct');

  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/upload');

  const t0 = performance.now();
  xhr.upload.onprogress = (e) => {
    if (!e.lengthComputable) return;
    const ratio = e.loaded / e.total;
    bar.style.width = (ratio * 100) + '%';
    pct.textContent = (ratio * 100).toFixed(0) + '%';
    const secs = (performance.now() - t0) / 1000;
    st.textContent = '⚡ ' + formatSpeed(e.loaded / Math.max(secs, 0.001));
  };

  xhr.onload = () => {
    if (xhr.status === 200) {
      bar.style.width = '100%';
      st.textContent = '✅ Completado';
      pct.textContent = '100%';
      toast('✅ Subida completada');
      setTimeout(() => wrap.remove(), 1500);
      loadFiles();
    } else {
      st.textContent = '❌ Error';
      toast('Error en la subida', true);
    }
  };

  xhr.onerror = () => {
    st.textContent = '❌ Error de red';
    toast('Error de red', true);
  };

  xhr.send(formData);
}

/* ---------------- Eventos ---------------- */
function setupDropZone() {
  const zone = $('#drop-zone');
  const input = $('#file-input');

  zone.addEventListener('click', (e) => {
    if (e.target.tagName !== 'BUTTON') input.click();
  });
  $('#browse-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    input.click();
  });

  input.addEventListener('change', () => {
    uploadFiles(input.files);
    input.value = '';
  });

  ['dragenter', 'dragover'].forEach(ev =>
    zone.addEventListener(ev, (e) => {
      e.preventDefault();
      zone.classList.add('drag');
    })
  );
  ['dragleave', 'drop'].forEach(ev =>
    zone.addEventListener(ev, (e) => {
      e.preventDefault();
      zone.classList.remove('drag');
    })
  );
  zone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
  });
}

/* ---------------- Init ---------------- */
loadQR();
loadFiles();
setupDropZone();
$('#refresh-btn').addEventListener('click', loadFiles);
setInterval(loadFiles, 8000); // refresco automático