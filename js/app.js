/* =========================================================
   CONTROL GENERAL Y REGISTRO PWA
========================================================= */
document.addEventListener("DOMContentLoaded", function() {
  "use strict";

  // 1. BLOQUEO GLOBAL DE PULL-TO-REFRESH EN CELULARES
  document.body.addEventListener('touchmove', function(e) {
    if (e.target.id === 'map' || e.target.closest('#map')) {
      return; // Permite paneo fluido en el canvas del mapa Leaflet
    }
    e.preventDefault();
  }, { passive: false });

  window.addEventListener('scroll', function() { 
    window.scrollTo(0, 0); 
  });

  // 2. MODO PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function(err) {
      console.log('SW Info:', err);
    });
  }
});

// SANITIZADOR DE URLS DE FIREBASE
function formatearUrlFirebase(urlOriginal) {
  if (!urlOriginal) return "";
  let url = urlOriginal.trim();
  if (url.endsWith("/")) url = url.slice(0, -1);
  if (!url.endsWith(".json")) {
    url += url.endsWith("/mapa") ? ".json" : "/mapa.json";
  }
  return url;
}

function escaparHTML(texto) {
  return String(texto).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
