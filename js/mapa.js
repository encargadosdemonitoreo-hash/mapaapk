/* =========================================================
   INICIALIZACIÓN DEL MAPA Y MANEJO DE CAPAS BASE
========================================================= */
window.map = null;
window.capasBase = {};
window.zonas = null;
window.capaMarcadores = null;

(function() {
  "use strict";

  try {
    // Inicialización del objeto mapa de Leaflet
    window.map = L.map("map", { 
      center: [-34.6486, -58.6198], 
      zoom: 11, 
      zoomControl: false 
    });

    // Panel exclusivo para marcadores con mayor Z-Index
    window.map.createPane('panelMarcadores');
    window.map.getPane('panelMarcadores').style.zIndex = 650;

    // Definición de capas cartográficas
    const satelitalFoto = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19 });
    const satelitalRutas = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19 });
    const satelitalLugares = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19 });

    const oscuroFondo = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png", { maxZoom: 19 });
    const oscuroTexto = L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png", { maxZoom: 19 });

    window.capasBase = {
      esriStreet: L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "&copy; Esri Street Map" }),
      satelitalHibrido: L.layerGroup([satelitalFoto, satelitalRutas, satelitalLugares]),
      calles: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap" }),
      oscuroLabels: L.layerGroup([oscuroFondo, oscuroTexto])
    };

    // Agregar capa predeterminada
    window.capasBase.esriStreet.addTo(window.map);

    // Controles de zoom abajo a la izquierda
    L.control.zoom({ position: 'bottomleft' }).addTo(window.map);

    // Grupos de capas
    window.zonas = new L.FeatureGroup();
    window.map.addLayer(window.zonas);

    window.capaMarcadores = new L.FeatureGroup();
    window.map.addLayer(window.capaMarcadores);

    setTimeout(() => { window.map.invalidateSize(); }, 300);

    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => { window.map.invalidateSize(); });
      ro.observe(document.getElementById("map"));
    }
  } catch(e) {
    console.error("Error al iniciar el mapa:", e);
  }
})();
