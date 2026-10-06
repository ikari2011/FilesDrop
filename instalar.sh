#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "================================"
echo "   FileDrop - Instalación"
echo "================================"

if ! command -v node &> /dev/null; then
    echo "[X] Node.js no está instalado. Descárgalo de https://nodejs.org"
    exit 1
fi

echo "[1/3] Node.js: $(node -v)"
echo "[2/3] Instalando dependencias..."
npm install

echo "[3/3] Configurando firewall..."
if command -v ufw &> /dev/null; then
    sudo ufw allow 3000/tcp 2>/dev/null && echo "  ufw: puerto 3000 abierto" || echo "  (ufw no configurado)"
else
    echo "  (ufw no encontrado, probablemente no hace falta)"
fi

echo ""
echo "✅ Instalación completada"
echo "Ejecuta: ./iniciar.sh"