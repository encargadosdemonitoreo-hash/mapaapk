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

  // Elementos DOM
  const inputAB = document.getElementById("buscarABInput");
  const sugAB = document.getElementById("sugerenciasAB");
  const inputCalle = document.getElementById("direccion");
  const sugConsulta = document.getElementById("sugerenciasConsulta");
  const btnClicMapa = document.getElementById("btnClicMapa");
  const selectZonaConsulta = document.getElementById("selectZonaConsulta");
  const listaHistorialBusquedas = document.getElementById("listaHistorialBusquedas");

  // 1. RECONOCIMIENTO POR VOZ (DICTADO MICRÓFONO)
  function iniciarDictadoVoz(inputId, btnMic) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("El micrófono no está soportado en este navegador o requiere permisos HTTPS/App.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "es-AR";
    recognition.continuous = false;
    recognition.interimResults = false;

    btnMic.classList.add("escuchando");

    recognition.onresult = function(event) {
      btnMic.classList.remove("escuchando");
      if (event.results && event.results[0] && event.results[0][0]) {
        const texto = event.results[0][0].transcript;
        const el = document.getElementById(inputId);
        if (el) {
          el.value = texto;
          el.dispatchEvent(new Event("input"));
        }
      }
    };

    recognition.onerror = function(err) {
      btnMic.classList.remove("escuchando");
      console.warn("Error reconocimiento voz:", err);
      alert("Por favor permita el acceso al micrófono en la configuración de su celular.");
    };

    recognition.onend = function() {
      btnMic.classList.remove("escuchando");
    };

    try { recognition.start(); } catch(e) { btnMic.classList.remove("escuchando"); }
  }

  document.getElementById("btnMicAB")?.addEventListener("click", function(e) {
    e.preventDefault();
    iniciarDictadoVoz("buscarABInput", this);
  });

  document.getElementById("btnMicCalle")?.addEventListener("click", function(e) {
    e.preventDefault();
    iniciarDictadoVoz("direccion", this);
  });

  // 2. HISTORIAL DE BÚSQUEDAS RECIENTES
  function cargarHistorialLocal() {
    const data = localStorage.getItem("historialConsultaApp");
    if (data) {
      try { historialBusquedas = JSON.parse(data); } catch(e) { historialBusquedas = []; }
    }
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
      div.onclick = () => {
        verificarPunto(h.lat, h.lon, h.nombre, h.entreCalles, h.comoLlegar, h.datosAB);
      };
      listaHistorialBusquedas.appendChild(div);
    });
  }

  document.getElementById("btnBorrarHistorial")?.addEventListener("click", function() {
    historialBusquedas = [];
    localStorage.removeItem("historialConsultaApp");
    renderizarHistorial();
  });

  // 3. CAMBIO DE TEMA Y ESTILOS DE CONSULTA
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

  // 4. MODO CLIC EN EL MAPA
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

  // 5. GPS DE UBICACIÓN ACTUAL
  document.getElementById("btnGPSConsulta")?.addEventListener("click", function(e) {
    e.preventDefault();
    if (!navigator.geolocation) return alert("Geolocalización no disponible en este dispositivo.");
    
    navigator.geolocation.getCurrentPosition(async pos => {
      const resData = await resolverDireccionYAltura(pos.coords.latitude, pos.coords.longitude);
      if (inputCalle) inputCalle.value = "";
      verificarPunto(pos.coords.latitude, pos.coords.longitude, resData.direccion, resData.entreCalles);
    }, err => {
      alert("No se pudo obtener la ubicación GPS. Verifique que los servicios de ubicación estén activados en su celular.");
    }, { enableHighAccuracy: true, timeout: 10000 });
  });

  // 6. BÚSQUEDA DE ABONADOS (AB)
  inputAB?.addEventListener("input", function() {
    const q = inputAB.value.trim().toUpperCase();
    if (q.length < 1) { if(sugAB) sugAB.style.display = "none"; return; }
    if (!sugAB) return;
    sugAB.innerHTML = "";

    abonadosLocal.forEach(ab => {
      if (ab.ab.toUpperCase().includes(q) || (ab.direccion && ab.direccion.toUpperCase().includes(q))) {
        const div = document.createElement("div");
        div.className = "sugerencia-item";
        div.textContent = "🏢 AB " + ab.ab + " - " + (ab.direccion || "Sin dirección") + (ab.localidad ? " (" + ab.localidad + ")" : "");
        div.onclick = () => {
          const nomAB = "AB " + ab.ab + " - " + (ab.direccion || "");
          inputAB.value = "";
          sugAB.style.display = "none";
          verificarPunto(ab.lat, ab.lon, nomAB, ab.entreCalles || "", ab.comoLlegar || "", ab);
        };
        sugAB.appendChild(div);
      }
    });
    sugAB.style.display = sugAB.children.length ? "block" : "none";
  });

  document.getElementById("btnBuscarAB")?.addEventListener("click", function(e) {
    e.preventDefault();
    const q = inputAB.value.trim().replace("AB", "").trim().toUpperCase();
    if (!q) return;
    const encontrado = abonadosLocal.find(ab => ab.ab.toUpperCase() === q);
    if (encontrado) {
      const nomAB = "AB " + encontrado.ab + " - " + (encontrado.direccion || "");
      inputAB.value = "";
      if (sugAB) sugAB.style.display = "none";
      verificarPunto(encontrado.lat, encontrado.lon, nomAB, encontrado.entreCalles || "", encontrado.comoLlegar || "", encontrado);
    } else {
      alert("Abonado N° " + q + " no encontrado.");
    }
  });

  document.getElementById("btnLimpiarAB")?.addEventListener("click", () => {
    if (inputAB) inputAB.value = "";
    if (sugAB) sugAB.style.display = "none";
    if (markerConsulta && window.map) window.map.removeLayer(markerConsulta);
  });

  // 7. GEOCODIFICACIÓN DE CALLES
  async function resolverDireccionYAltura(lat, lon) {
    try {
      const url = "https://nominatim.openstreetmap.org/reverse?" + new URLSearchParams({
        lat: lat, lon: lon, format: "json", addressdetails: "1", zoom: "18", "accept-language": "es"
      });
      const r = await fetch(url, { headers: { "User-Agent": "MapaConsultaZoneApp/3.0" } });
      const data = await r.json();
      if (!data || !data.address) return { direccion: lat.toFixed(5) + ", " + lon.toFixed(5), entreCalles: "" };
      const a = data.address, calle = a.road || a.pedestrian || "Ubicación táctica", num = a.house_number || "s/n";
      let dirTexto = calle + " " + num;
      if (a.city || a.town) dirTexto += ", " + (a.city || a.town);
      return { direccion: dirTexto, entreCalles: a.neighbourhood || a.suburb || "" };
    } catch(err) { return { direccion: lat.toFixed(5) + ", " + lon.toFixed(5), entreCalles: "" }; }
  }

  inputCalle?.addEventListener("input", function() {
    const q = inputCalle.value.trim().toUpperCase();
    if (q.length < 2) { if (sugConsulta) sugConsulta.style.display = "none"; return; }
    if (!sugConsulta) return;
    sugConsulta.innerHTML = "";

    fetch("https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&singleLine=" + encodeURIComponent(inputCalle.value + ", Buenos Aires") + "&maxLocations=3")
      .then(r => r.json()).then(d => {
        if (d && d.candidates) {
          d.candidates.forEach(c => {
            const div = document.createElement("div");
            div.className = "sugerencia-item";
            div.textContent = c.address;
            div.onclick = async () => {
              const nomDir = c.address;
              inputCalle.value = ""; sugConsulta.style.display = "none";
              const resData = await resolverDireccionYAltura(c.location.y, c.location.x);
              verificarPunto(c.location.y, c.location.x, nomDir, resData.entreCalles);
            };
            sugConsulta.appendChild(div);
          });
          sugConsulta.style.display = "block";
        }
      }).catch(e => {});
  });

  document.getElementById("btnLimpiarInput")?.addEventListener("click", () => {
    if (inputCalle) inputCalle.value = "";
    if (sugConsulta) sugConsulta.style.display = "none";
    if (markerConsulta && window.map) window.map.removeLayer(markerConsulta);
  });

  // 8. ALGORITMO RAY-CASTING Y VERIFICACIÓN DE ZONA
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

    const peligrosas = [], nomoviles = [], alertas = [], coberturas = [], informativas = [], barrioPrivado = [], parqueIndustrial = [];

    capasGeo.forEach(l => {
      let raw = l.getLatLngs();
      if (Array.isArray(raw) && raw.length > 0) {
        let ring = Array.isArray(raw[0]) && !Array.isArray(raw[0][0]) ? raw[0] : raw;
        if (rayCasting(pt, ring)) {
          const p = l._zona.properties || {}, t = p.tipoZona || "cobertura", n = p.nombre || "Zona";
          if (t === "peligrosa") peligrosas.push(n);
          else if (t === "nomovil" || t === "sin_acceso_movil") nomoviles.push(n);
          else if (t === "alerta") alertas.push(n);
          else if (t === "informativa") informativas.push(n);
          else if (t === "barrio_privado") barrioPrivado.push(n);
          else if (t === "parque_industrial") parqueIndustrial.push(n);
          else coberturas.push(n);
        }
      }
    });

    let estadoTexto = "DENTRO DE COBERTURA", claseBurbuja = "burbuja-cobertura", icono = "🛡️";

    if (nomoviles.length) { estadoTexto = "⛔ NO VA MÓVIL / SIN ACCESO (" + nomoviles.join(", ") + ")"; claseBurbuja = "burbuja-nomovil"; icono = "⛔"; }
    else if (peligrosas.length) { estadoTexto = "🚨 ZONA PELIGROSA - NO VA MÓVIL (" + peligrosas.join(", ") + ")"; claseBurbuja = "burbuja-peligrosa"; icono = "🚨"; }
    else if (barrioPrivado.length) { estadoTexto = "🏰 BARRIO PRIVADO - NO VA MÓVIL (" + barrioPrivado.join(", ") + ")"; claseBurbuja = "burbuja-barrio"; icono = "🏰"; }
    else if (parqueIndustrial.length) { estadoTexto = "🏭 PARQUE INDUSTRIAL (" + parqueIndustrial.join(", ") + ")"; claseBurbuja = "burbuja-industrial"; icono = "🏭"; }
    else if (alertas.length) { estadoTexto = "⚠️ ZONA DE ALERTA (" + alertas.join(", ") + ")"; claseBurbuja = "burbuja-alerta"; icono = "⚠️"; }
    else if (informativas.length) { estadoTexto = "ℹ️ ZONA INFORMATIVA (" + informativas.join(", ") + ")"; claseBurbuja = "burbuja-informativa"; icono = "ℹ️"; }
    else if (!coberturas.length) { estadoTexto = "🚫 FUERA DE COBERTURA (NO VA MÓVIL)"; claseBurbuja = "burbuja-fuera"; icono = "🚫"; }

    let etaTxt = "";
    if (marcadoresAutos.length) {
      let masCercano = null, minDist = Infinity;
      marcadoresAutos.forEach(a => {
        let d = pt.distanceTo(a.latlng);
        if (d < minDist) { minDist = d; masCercano = a; }
      });
      if (masCercano) {
        let km = (minDist / 1000).toFixed(1);
        let minEst = Math.round((minDist / 1000) / 35 * 60);
        etaTxt = '<div class="card-eta">🚘 <b>Móvil más cercano:</b> ' + masCercano.nombre + '<br>📐 Distancia: ' + km + ' km | ⏱️ ETA: ~' + (minEst < 1 ? 1 : minEst) + ' min</div>';
      }
    }

    let entreTxt = entreCalles ? '<div class="burbuja-entre">📍 ' + entreCalles + '</div>' : '';
    let comoLlegarHtml = comoLlegar && comoLlegar.trim() !== "" ? '<div class="burbuja-como-llegar con-datos"><b>🗺️ Cómo Llegar:</b><br>' + comoLlegar.trim() + '</div>' : '<div class="burbuja-como-llegar sin-datos">❌ Sin datos de cómo llegar</div>';

    let propiedadHtml = datosAB ? '<div class="card-propiedad"><div class="card-propiedad-titulo">🏢 DATOS DE LA PROPIEDAD</div><div><b>AB:</b> ' + datosAB.ab + '</div><div><b>Dirección:</b> ' + datosAB.direccion + '</div></div>' : '<div class="card-propiedad"><div class="card-propiedad-titulo">📍 DATOS DE LA UBICACIÓN</div><div><b>Coords:</b> ' + lat.toFixed(5) + ', ' + lon.toFixed(5) + '</div></div>';

    const urlWaze = "https://waze.com/ul?ll=" + lat + "," + lon + "&navigate=yes";
    const urlGmaps = "https://www.google.com/maps/search/?api=1&query=" + lat + "," + lon;

    const html = '<div class="burbuja-marcacion ' + claseBurbuja + '" onclick="this.classList.toggle(\'expandida\')">' +
      '<div class="burbuja-cabecera"><span>' + icono + '</span> <span>' + estadoTexto + '</span></div>' +
      '<div class="burbuja-sub">' + nombre + '</div>' + entreTxt + comoLlegarHtml +
      '<div class="burbuja-indicador"><span>Tocá para ver opciones</span> <span>▼</span></div>' +
      '<div class="burbuja-cuerpo">' + propiedadHtml + etaTxt +
      '<div class="grupo-botones-nav">' +
      '<a href="' + urlWaze + '" target="_blank" onclick="event.stopPropagation();" class="btn-nav btn-waze">🚙 Waze</a>' +
      '<a href="' + urlGmaps + '" target="_blank" onclick="event.stopPropagation();" class="btn-nav btn-gmaps">🗺️ Maps</a>' +
      '</div></div></div>';

    markerConsulta = L.marker(pt).addTo(window.map);
    markerConsulta.bindPopup(html, { closeButton: false }).openPopup();
    window.map.setView(pt, 16);
  }

  // 9. SINCRONIZACIÓN AUTOMÁTICA
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
    capasGeo = []; marcadoresAutos = [];
    if (selectZonaConsulta) selectZonaConsulta.innerHTML = '<option value="">--Ir a zona--</option>';

    datosGeo.forEach((f, idx) => {
      const p = f.properties || {};
      if (p.esMarcador) {
        const c = f.geometry.coordinates;
        if (p.icono === "🚗" || p.icono === "🏍️") {
          marcadoresAutos.push({ nombre: p.nombre, latlng: L.latLng(c[1], c[0]) });
        }
        return;
      }

      const grupo = L.geoJSON(f, {
        style: { color: p.color || "#2E7D32", weight: 3, fillOpacity: p.opacidad ?? 0.25 }
      });
      grupo.eachLayer(l => {
        l._zona = f;
        l.addTo(window.map);
        capasGeo.push(l);
      });

      if (selectZonaConsulta) {
        const opt = document.createElement("option");
        opt.value = idx;
        opt.textContent = p.nombre || "Zona";
        selectZonaConsulta.appendChild(opt);
      }
    });
  }

  selectZonaConsulta?.addEventListener("change", function() {
    const idx = this.value;
    if (idx === "" || !elementosGeo[idx] || !window.map) return;
    try { window.map.fitBounds(L.geoJSON(elementosGeo[idx]).getBounds(), { padding: [40, 40] }); } catch(e){}
  });

  document.getElementById("btnOcultarPanelConsulta")?.addEventListener("click", function(e) {
    e.preventDefault();
    document.body.classList.toggle("panel-consulta-oculto");
    setTimeout(() => { if (window.map) window.map.invalidateSize(); }, 200);
  });

  cargarHistorialLocal();
})();
