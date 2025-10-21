// next.config.js

const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development", // Deshabilitar en desarrollo
});

module.exports = withPWA({
  // Otras configuraciones de Next.js
});
