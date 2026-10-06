# ⚡ FileDrop

Transferencia de archivos **ilimitada** entre móvil y laptop por WiFi, con **acelerador de descarga** y conexión por **código QR**.

![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)
![License: MIT](https://img.shields.io/badge/License-MIT-blue)

## ✨ Características

- 📤 Sin límite de tamaño (streaming directo a disco)
- ⚡ Descarga acelerada (6 conexiones en paralelo con HTTP Range)
- 📱 Conexión instantánea escaneando un QR
- 🖼️ Vista previa de imágenes
- 📲 Instalable como app (PWA)
- 🔒 100% local — nada sale de tu red WiFi

## 🚀 Instalación

### Requisitos
- [Node.js](https://nodejs.org) 18 o superior
- Ambos dispositivos en la **misma red WiFi**

### Windows
1. Doble clic en `instalar.bat` (como administrador la primera vez)
2. Doble clic en `iniciar.bat`
3. Se abre el navegador solo → escanea el QR desde el móvil

### Linux / macOS
```bash
chmod +x instalar.sh iniciar.sh
./instalar.sh
./iniciar.sh