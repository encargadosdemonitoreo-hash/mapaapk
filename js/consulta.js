/* =========================================================
   MÓDULO MESA DE CONSULTA Y BÚSQUEDA DE COBERTURA
========================================================= */
(function() {
  "use strict";

  let historialBusquedas = [];
  let modoConsultaClic = false;
  let markerConsulta = null;
  let abonadosLocal = [];
  let marcadoresAutos = [];
  let elementosGeo = [];
  let capasGeo = [];
  let reconocimientoActivo = null;

  const inputAB = document.getElementById("buscarABInput");
  const sugAB = document.getElementById("sugerenciasAB");
  const inputCalle = document.getElementById("direccion");
  const sugConsulta = document.getElementById("sugerenciasConsulta");
  const btnClicMapa = document.getElementById("btnClicMapa");
  const selectZonaConsulta = document.getElementById("selectZonaConsulta");
  const listaHistorialBusquedas = document.getElementById("listaHistorialBusquedas");

  // 1. RECONOCIMIENTO POR VOZ (DICTADO MICRÓFONO CORREGIDO)
  function detenerMicrofonoGlobal() {
    if (reconocimientoActivo) {
      try { reconocimientoActivo.stop(); } catch(e) {}
      reconocimientoActivo = null;
    }
    document.querySelectorAll(".btn-mic").forEach(btn => btn.classList.remove("escuchando"));
  }

  function alternarDictadoVoz(inputId, btnMic) {
    if (btnMic.classList.contains("escuchando")) {
      detenerMicrofonoGlobal();
      return;
    }

    detenerMicrofonoGlobal();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("El reconocimiento de voz no está disponible en este dispositivo.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "es-AR";
    recognition.continuous = false;
    recognition.interimResults = false;

    btnMic.classList.add("escuchando");
    reconocimientoActivo = recognition;

    recognition.onresult = function(event) {
      detenerMicrofonoGlobal();
      if (event.results && event.results[0] && event.results[0][0]) {
        const texto = event.results[0][0].transcript;
        const el = document.getElementById(inputId);
        if (el) {
          el.value = texto;
          el.dispatchEvent(new Event("input"));
        }
      }
    };

    recognition.onerror = function() { detenerMicrofonoGlobal(); };
    recognition.onend = function() { detenerMicrofonoGlobal(); };

    try { recognition.start(); } catch(e) { detenerMicrofonoGlobal(); }
  }

  document.getElementById("btnMicAB")?.addEventListener("click", function(e) {
    e.preventDefault(); alternarDictadoVoz("buscarABInput", this);
  });

  document.getElementById("btnMicCalle")?.addEventListener("click", function(e) {
    e.preventDefault(); alternarDictadoVoz("direccion", this);
  });

  // Apagar micrófono al hacer clic en cualquier botón de buscar
  document.getElementById("btnBuscarAB")?.addEventListener("click", detenerMicrofonoGlobal);
  document.getElementById("buscar")?.addEventListener("click", detenerMicrofonoGlobal);

  // 2. HISTORIAL DE BÚSQUEDAS
  function cargarHistorialLocal() {
    const data = localStorage.getItem("historialConsultaApp");
    if (data) { try { historialBusquedas = JSON.parse(data); } catch(e) { historialBusquedas = []; } }
    renderizarHistorial();
  }

  function agregarAlHistorial(nombre, lat, lon, entreCalles = "", comoLlegar = "", datosAB = null) {
    historialBusquedas = historialBusquedas.filter(h => h.nombre !== nombre);
    historialBusquedas.unshift({
      nombre, lat, lon, entreCalles, comoLlegar, datosAB,
      fecha: new Date().toLocaleTimeString("es-AR", {hour:'2-digit', minute:'2-digit'})
    });
    if (historialBusquedas.length > 10) historialBusquedas.pop();
    localStorage.setItem("historialConsultaApp", JSON.stringify(historialBusquedas));
    renderizarHistorial();
  }

  function renderizarHistorial() {
    if (!listaHistorialBusquedas) return;
    listaHistorialBusquedas.innerHTML = "";
    if (historialBusquedas.length === 0) {
      listaHistorialBusquedas.innerHTML = "<div style='padding:8px; font-size:10px; color:#888; text-align:center;'>Sin búsquedas recientes</div>";
      return;
    }
    historialBusquedas.forEach(h => {
      const div = document.createElement("div");
      div.className = "zona-item";
      div.innerHTML = "<div><b>" + escaparHTML(h.nombre) + "</b><br><small style='color:#1a73e8;'>(" + h.fecha + ")</small></div>";
      div.onclick = () => { verificarPunto(h.lat, h.lon, h.nombre, h.entreCalles, h.comoLlegar, h.datosAB); };
      listaHistorialBusquedas.appendChild(div);
    });
  }

  document.getElementById("btnBorrarHistorial")?.addEventListener("click", function() {
    historialBusquedas = []; localStorage.removeItem("historialConsultaApp"); renderizarHistorial();
  });

  // 3. CAMBIO DE TEMAS
  document.getElementById("selectorTemaConsulta")?.addEventListener("change", function() {
    document.body.classList.remove("modo-dark", "modo-tactico");
    if (this.value === "dark") document.body.classList.add("modo-dark");
    if (this.value === "tactico") document.body.classList.add("modo-tactico");
  });

  document.getElementById("mapaEstiloConsulta")?.addEventListener("change", function() {
    if (!window.map || !window.capasBase) return;
    Object.values(window.capasBase).forEach(c => window.map.removeLayer(c));
    if (window.capasBase[this.value]) window.capasBase[this.value].addTo(window.map);
  });

  // 4. CLIC EN MAPA Y GPS
  btnClicMapa?.addEventListener("click", function(e) {
    e.preventDefault();
    modoConsultaClic = !modoConsultaClic;
    btnClicMapa.classList.toggle("activo", modoConsultaClic);
    btnClicMapa.textContent = modoConsultaClic ? "🎯 Clic en el mapa..." : "🎯 Clic en Mapa";
  });

  function VincularEventoMapaClic() {
    if (!window.map) return setTimeout(VincularEventoMapaClic, 300);
    window.map.on("click", async function(e) {
      if (modoConsultaClic) {
        modoConsultaClic = false;
        btnClicMapa.classList.remove("activo");
        btnClicMapa.textContent = "🎯 Clic en Mapa";
        const resData = await resolverDireccionYAltura(e.latlng.lat, e.latlng.lng);
        if (inputCalle) inputCalle.value = "";
        verificarPunto(e.latlng.lat, e.latlng.lng, resData.direccion, resData.entreCalles);
      }
    });
  }
  VincularEventoMapaClic();

  document.getElementById("btnGPSConsulta")?.addEventListener("click", function(e) {
    e.preventDefault();
    if (!navigator.geolocation) return alert("Geolocalización no soportada.");
    navigator.geolocation.getCurrentPosition(async pos => {
      const resData = await resolverDireccionYAltura(pos.coords.latitude, pos.coords.longitude);
      if (inputCalle) inputCalle.value = "";
      verificarPunto(pos.coords.latitude, pos.coords.longitude, resData.direccion, resData.entreCalles);
    }, err => { alert("No se pudo obtener la posición GPS."); }, { enableHighAccuracy: true, timeout: 10000 });
  });

  // 5. BÚSQUEDAS DE AB Y CALLE
  inputAB?.addEventListener("input", function() {
    const q = inputAB.value.trim().toUpperCase();
    if (q.length < 1) { if(sugAB) sugAB.style.display = "none"; return; }
    if (!sugAB) return; sugAB.innerHTML = "";
    abonadosLocal.forEach(ab => {
      if (ab.ab.toUpperCase().includes(q) || (ab.direccion && ab.direccion.toUpperCase().includes(q))) {
        const div = document.createElement("div");
        div.className = "sugerencia-item";
        div.textContent = "🏢 AB " + ab.ab + " - " + (ab.direccion || "");
        div.onclick = () => {
          inputAB.value = ""; sugAB.style.display = "none";
          verificarPunto(ab.lat, ab.lon, "AB " + ab.ab + " - " + (ab.direccion || ""), ab.entreCalles || "", ab.comoLlegar || "", ab);
        };
        sugAB.appendChild(div);
      }
    });
    sugAB.style.display = sugAB.children.length ? "block" : "none";
  });

  async function resolverDireccionYAltura(lat, lon) {
    try {
      const r = await fetch("https://nominatim.openstreetmap.org/reverse?lat=" + lat + "&lon=" + lon + "&format=json&accept-language=es");
      const d = await r.json();
      if (!d || !d.address) return { direccion: lat.toFixed(5) + ", " + lon.toFixed(5), entreCalles: "" };
      const a = d.address, calle = a.road || "Ubicación táctica", num = a.house_number || "s/n";
      return { direccion: calle + " " + num, entreCalles: a.neighbourhood || a.suburb || "" };
    } catch(err) { return { direccion: lat.toFixed(5) + ", " + lon.toFixed(5), entreCalles: "" }; }
  }

  function rayCasting(pt, ring) {
    let inPoly = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      if (((ring[i].lng > pt.lng) !== (ring[j].lng > pt.lng)) && (pt.lat < (ring[j].lat - ring[i].lat) * (pt.lng - ring[i].lng) / (ring[j].lng - ring[i].lng) + ring[i].lat)) {
        inPoly = !inPoly;
      }
    }
    return inPoly;
  }

  function verificarPunto(lat, lon, nombre, entreCalles = "", comoLlegar = "", datosAB = null) {
    if (!window.map) return;
    const pt = L.latLng(lat, lon);
    if (markerConsulta) window.map.removeLayer(markerConsulta);
    agregarAlHistorial(nombre, lat, lon, entreCalles, comoLlegar, datosAB);

    const peligrosas = [], nomoviles = [], alertas = [], coberturas = [];
    capasGeo.forEach(l => {
      let raw = l.getLatLngs();
      if (Array.isArray(raw) && raw.length > 0) {
        let ring = Array.isArray(raw[0]) && !Array.isArray(raw[0][0]) ? raw[0] : raw;
        if (rayCasting(pt, ring)) {
          const p = l._zona.properties || {}, t = p.tipoZona || "cobertura", n = p.nombre || "Zona";
          if (t === "peligrosa") peligrosas.push(n);
          else if (t === "nomovil" || t === "sin_acceso_movil") nomoviles.push(n);
          else if (t === "alerta") alertas.push(n);
          else coberturas.push(n);
        }
      }
    });

    let estadoTexto = "DENTRO DE COBERTURA", claseBurbuja = "burbuja-cobertura", icono = "🛡️";
    if (nomoviles.length) { estadoTexto = "⛔ SIN ACCESO DE MÓVIL"; claseBurbuja = "burbuja-nomovil"; icono = "⛔"; }
    else if (peligrosas.length) { estadoTexto = "🚨 ZONA PELIGROSA"; claseBurbuja = "burbuja-peligrosa"; icono = "🚨"; }
    else if (alertas.length) { estadoTexto = "⚠️ ZONA DE ALERTA"; claseBurbuja = "burbuja-alerta"; icono = "⚠️"; }
    else if (!coberturas.length) { estadoTexto = "🚫 FUERA DE COBERTURA"; claseBurbuja = "burbuja-fuera"; icono = "🚫"; }

    const html = '<div class="burbuja-marcacion">' +
      '<div><b>' + icono + ' ' + estadoTexto + '</b></div>' +
      '<div>' + nombre + '</div></div>';

    markerConsulta = L.marker(pt).addTo(window.map);
    markerConsulta.bindPopup(html).openPopup();
    window.map.setView(pt, 16);
  }

  window.actualizarConsultaDatos = function(dataFB) {
    if (!dataFB) return;
    if (dataFB.abonados) abonadosLocal = dataFB.abonados;
    if (dataFB.zonas) {
      elementosGeo = dataFB.zonas;
      renderizarCapasConsulta(elementosGeo);
    }
  };

  function renderizarCapasConsulta(datosGeo) {
    if (!window.map) return;
    capasGeo.forEach(l => window.map.removeLayer(l));
    capasGeo = [];
    datosGeo.forEach((f) => {
      const p = f.properties || {};
      if (p.esMarcador) return;
      const grupo = L.geoJSON(f, { style: { color: p.color || "#2E7D32", weight: 3, fillOpacity: p.opacidad ?? 0.25 } });
      grupo.eachLayer(l => { l._zona = f; l.addTo(window.map); capasGeo.push(l); });
    });
  }

  document.getElementById("btnOcultarPanelConsulta")?.addEventListener("click", function() {
    document.body.classList.toggle("panel-consulta-oculto");
    setTimeout(() => { if (window.map) window.map.invalidateSize(); }, 200);
  });

  cargarHistorialLocal();
})();
