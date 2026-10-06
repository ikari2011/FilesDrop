# 🔒 Política de Privacidad — FileDrop

**Última actualización:** 6 de octubre de 2026

## Resumen corto

**FileDrop NO recopila ningún dato.** Punto. Todo funciona en tu red WiFi local.

## 1. Información que recopilamos

**Ninguna.**

FileDrop no recopila, almacena, transmite ni comparte:
- ❌ Datos personales (nombre, email, teléfono…)
- ❌ Direcciones IP
- ❌ Ubicación geográfica
- ❌ Metadatos de archivos
- ❌ Estadísticas de uso
- ❌ Telemetría o analytics
- ❌ Cookies de seguimiento
- ❌ Identificadores de dispositivo

## 2. Cómo funcionan las transferencias

1. El servidor (normalmente tu laptop) se ejecuta **únicamente en tu red WiFi local**.
2. Los dispositivos se conectan directamente entre sí mediante HTTP dentro de la red local.
3. Los archivos se transfieren de dispositivo a dispositivo, sin pasar por ningún servidor externo.
4. Una vez transferidos, los archivos se guardan únicamente en el disco del dispositivo receptor.

## 3. Almacenamiento local

Los archivos subidos se almacenan temporalmente en la carpeta `uploads/` del dispositivo que actúa como servidor. El Usuario puede:

- Eliminarlos manualmente en cualquier momento desde la interfaz.
- Borrar la carpeta `uploads/` directamente.
- Desinstalar FileDrop eliminando simplemente su carpeta.

**Nada de esto se sincroniza con la nube.**

## 4. Terceros

FileDrop **no utiliza servicios de terceros**. No hay Google Analytics, no hay Firebase, no hay servidores remotos, no hay CDNs.

Las únicas dependencias del proyecto son librerías de código abierto (Express, Multer, QRCode) que se ejecutan localmente.

## 5. Seguridad

- Todas las comunicaciones son **HTTP sobre red local**.
- Se recomienda usar FileDrop únicamente en redes WiFi de confianza.
- Para uso en redes públicas, se recomienda configurar HTTPS (ver README).
- No se envían datos a Internet en ningún momento.

## 6. Menores de edad

FileDrop no está dirigido específicamente a menores, pero al no recopilar ningún dato, puede ser usado por cualquier persona bajo la supervisión de un adulto responsable.

## 7. Cambios en esta política

Cualquier cambio será publicado en:

👉 https://github.com/ikari2011/FilesDrop

## 8. Contacto

Para dudas sobre privacidad:

- **Issues:** https://github.com/ikari2011/FilesDrop/issues

---

**FileDrop respeta tu privacidad por diseño. Tu información nunca sale de tu red.**