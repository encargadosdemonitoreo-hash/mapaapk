/* =========================================================
   MÓDULO ADMINISTRADOR: GEOFENCING, DIBUJO, HEATMAP Y FIREBASE
========================================================= */
(function() {
  "use strict";

  // Variables de Estado
  let dibujandoZona = false;
  let colocandoMarcador = false;
  let puntosDibujo = [];
  let marcadoresDibujo = [];
  let lineaDibujo = null;
  let poligonoPrevisualizacion = null;
  let procesandoFinalizacion = false;
  let modoEdicionBloqueado = false;
  let capaHeatmap = null;
  let puntosHeatmap = [];
  let abonadosApp = [];

  // Elementos DOM Admin
  const nombreZona = document.getElementById("nombreZona");
  const tipoZona = document.getElementById("tipoZona");
  const colorInput = document.getElementById("colorInput");
  const tipoLinea = document.getElementById("tipoLinea");
  const relleno = document.getElementById("relleno");
  const opacidad = document.getElementById("opacidad");
  const listaZonas = document.getElementById("listaZonas");
  const contador = document.getElementById("contador");
  const estado = document.getElementById("estado");
  const btnDeshacerPunto = document.getElementById("btnDeshacerPunto");
  const btnCancelarDibujo = document.getElementById("btnCancelarDibujo");

  const nombreMarcador = document.getElementById("nombreMarcador");
  const tipoIconoMarcador = document.getElementById("tipoIconoMarcador");
  const colorMarcador = document.getElementById("colorMarcador");
  const listaMarcadores = document.getElementById("listaMarcadores");

  const heatRadius = document.getElementById("heatRadius");
  const heatBlur = document.getElementById("heatBlur");
  const heatMax = document.getElementById("heatMax");
  const cfgFirebaseUrl = document.getElementById("cfgFirebaseUrl");

  // 1. MANEJADOR GLOBAL DE ACORDEONES Y OCULTAR PANEL
  document.addEventListener("click", function(e) {
    const header = e.target.closest(".menu-header");
    if (header) {
      e.preventDefault();
      const menu = header.closest(".menu");
      if (menu) menu.classList.toggle("abierto");
      return;
    }

    const btnOcultar = e.target.closest("#btnOcultar");
    if (btnOcultar) {
      e.preventDefault();
      document.body.classList.toggle("panel-oculto");
      setTimeout(() => { if (window.map) window.map.invalidateSize(); }, 200);
      return;
    }
  });

  // 2. CÁLCULO DE ÁREA GEODÉSICA
  function desanidarLatLngs(latlngs) {
    let pts = latlngs;
    while (Array.isArray(pts) && pts.length > 0 && Array.isArray(pts[0])) {
      pts = pts[0];
    }
    return pts;
  }

  function calcularAreaGeodesica(latlngs) {
    let pts = desanidarLatLngs(latlngs);
    if (!pts || pts.length < 3) return 0;
    const R = 6378137;
    let area = 0;
    for (let i = 0; i < pts.length; i++) {
      let p1 = pts[i];
      let p2 = pts[(i + 1) % pts.length];
      let rad1Lat = p1.lat * Math.PI / 180;
      let rad2Lat = p2.lat * Math.PI / 180;
      let rad1Lng = p1.lng * Math.PI / 180;
      let rad2Lng = p2.lng * Math.PI / 180;
      area += (rad2Lng - rad1Lng) * (2 + Math.sin(rad1Lat) + Math.sin(rad2Lat));
    }
    return Math.abs(area * R * R / 2);
  }

  function formatearArea(m2) {
    if (m2 >= 1000000) return (m2 / 1000000).toFixed(2) + " km²";
    if (m2 >= 10000) return (m2 / 10000).toFixed(2) + " ha";
    return Math.round(m2) + " m²";
  }

  // 3. ESTILOS Y ETIQUETAS
  function crearEstilo(color, linea, rellenoVal, opacity) {
    let estilo = {
      color: color || "#2E7D32",
      weight: 3,
      opacity: 1,
      fillColor: color || "#2E7D32",
      fillOpacity: opacity === undefined ? 0.25 : opacity,
      className: ""
    };
    if (linea === "puntos") estilo.dashArray = "2,7";
    if (linea === "rayas") estilo.dashArray = "12,8";
    if (linea === "animada") estilo.className = "linea-animada";
    if (linea === "glow") estilo.className = "linea-glow";
    if (linea === "pulso") estilo.className = "linea-pulso";
    if (linea === "alerta") estilo.className = "linea-alerta";
    if (linea === "contorno" || rellenoVal === "sin") estilo.fillOpacity = 0;
    return estilo;
  }

  function etiquetaTipo(tipo) {
    if (tipo === "peligrosa") return "🚨 Zona Peligrosa";
    if (tipo === "alerta") return "⚠️ Zona de Alerta";
    if (tipo === "informativa") return "ℹ️ Zona Informativa";
    if (tipo === "nomovil" || tipo === "sin_acceso_movil") return "⛔ Sin Acceso de Móvil";
    if (tipo === "barrio_privado") return "🏰 Barrio Privado";
    if (tipo === "parque_industrial") return "🏭 Parque Industrial";
    if (tipo === "localidad") return "🏙️ Localidad";
    return "🛡️ Cobertura";
  }

  function vinculoTooltip(layer) {
    const area = calcularAreaGeodesica(layer.getLatLngs());
    const areaTxt = area > 0 ? `<br><small>📏 Sup: ${formatearArea(area)}</small>` : "";
    const txt = `<b>${escaparHTML(layer.options.nombre)}</b><br><span style="opacity:0.85">${etiquetaTipo(layer.options.tipoZona)}</span>${areaTxt}`;
    layer.unbindTooltip().bindTooltip(txt, { permanent: false, direction: 'auto' });
  }

  // 4. CAPTURA Y ALMACENAMIENTO DE ESTADO
  function capturarEstado() {
    const lista = [];
    if (window.zonas) {
      window.zonas.eachLayer(layer => {
        const geo = layer.toGeoJSON();
        geo.properties = {
          nombre: layer.options.nombre || "Zona",
          tipoZona: layer.options.tipoZona || "cobertura",
          color: layer.options.color || "#2E7D32",
          tipoLinea: layer.options.tipoLinea || "solida",
          relleno: layer.options.relleno || "normal",
          opacidad: layer.options.opacidad ?? 0.25
        };
        lista.push(geo);
      });
    }
    if (window.capaMarcadores) {
      window.capaMarcadores.eachLayer(m => {
        const geo = m.toGeoJSON();
        geo.properties = {
          esMarcador: true,
          idUnico: m.options.idUnico,
          nombre: m.options.nombre,
          icono: m.options.icono,
          color: m.options.color
        };
        lista.push(geo);
      });
    }
    return lista;
  }

  function guardarLocal() {
    try {
      const lista = capturarEstado();
      localStorage.setItem("zonasAdmin", JSON.stringify(lista));
      localStorage.setItem("abonadosGPSAdmin", JSON.stringify(abonadosApp));
      localStorage.setItem("puntosHeatmapAdmin", JSON.stringify(puntosHeatmap));
      actualizarContadores();
    } catch(e) {}
  }

  function actualizarContadores() {
    const cant = window.zonas ? window.zonas.getLayers().length : 0;
    if (contador) contador.textContent = cant;
    const lblBuscar = document.getElementById("lblCantBuscarZonas");
    if (lblBuscar) lblBuscar.textContent = cant + " zonas";
  }

  // 5. DIBUJO MANUAL Y DESHACER (CTRL+Z)
  document.getElementById("btnDibujar")?.addEventListener("click", function(e) {
    if (modoEdicionBloqueado) return alert("Modo solo lectura activo.");
    e.stopPropagation();
    if (dibujandoZona) { finalizarDibujoManual(); return; }
    const nom = nombreZona.value.trim();
    if (!nom) return alert("Ingresá un nombre para la zona.");
    iniciarDibujoManual();
  });

  function iniciarDibujoManual() {
    limpiarDibujoManual();
    dibujandoZona = true;
    document.body.classList.add("modo-dibujo");
    if (btnDeshacerPunto) btnDeshacerPunto.style.display = "block";
    if (btnCancelarDibujo) btnCancelarDibujo.style.display = "block";
    document.getElementById("btnDibujar").textContent = "✓ Finalizar zona";
    if (estado) estado.textContent = "🔵 Clic en el mapa para marcar puntos";
  }

  function limpiarDibujoManual() {
    if (!window.map) return;
    if (lineaDibujo) window.map.removeLayer(lineaDibujo);
    if (poligonoPrevisualizacion) window.map.removeLayer(poligonoPrevisualizacion);
    marcadoresDibujo.forEach(m => window.map.removeLayer(m));
    marcadoresDibujo = []; puntosDibujo = [];
    dibujandoZona = false;
    document.body.classList.remove("modo-dibujo");
    if (btnDeshacerPunto) btnDeshacerPunto.style.display = "none";
    if (btnCancelarDibujo) btnCancelarDibujo.style.display = "none";
  }

  btnCancelarDibujo?.addEventListener("click", function() {
    limpiarDibujoManual();
    document.getElementById("btnDibujar").textContent = "✏️ Dibujar nueva zona";
    if (estado) estado.textContent = "✖ Dibujo cancelado";
  });

  btnDeshacerPunto?.addEventListener("click", deshacerUltimoPunto);

  document.addEventListener("keydown", function(e) {
    if (dibujandoZona && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      deshacerUltimoPunto();
    }
  });

  function deshacerUltimoPunto() {
    if (!dibujandoZona || puntosDibujo.length === 0 || !window.map) return;
    puntosDibujo.pop();
    const m = marcadoresDibujo.pop();
    if (m) window.map.removeLayer(m);
    actualizarPrevisualizacion();
  }

  function agregarPuntoDibujo(latlng) {
    if (!dibujandoZona || procesandoFinalizacion || !window.map) return;
    puntosDibujo.push(latlng);
    const esPrimero = puntosDibujo.length === 1;
    const m = L.circleMarker(latlng, {
      radius: esPrimero ? 8 : 5, weight: 2,
      color: esPrimero ? "#d93025" : "#1a73e8", fillColor: "#fff", fillOpacity: 1
    }).addTo(window.map);
    marcadoresDibujo.push(m);
    if (esPrimero) {
      m.on("click", (e) => { e.stopPropagation(); finalizarDibujoManual(); });
    }
    actualizarPrevisualizacion();
  }

  function actualizarPrevisualizacion() {
    if (!window.map) return;
    if (lineaDibujo) window.map.removeLayer(lineaDibujo);
    if (poligonoPrevisualizacion) window.map.removeLayer(poligonoPrevisualizacion);
    if (puntosDibujo.length < 2) return;
    if (puntosDibujo.length >= 3) {
      poligonoPrevisualizacion = L.polygon(puntosDibujo, crearEstilo(colorInput.value, tipoLinea.value, relleno.value, parseInt(opacidad.value,10)/100)).addTo(window.map);
    } else {
      lineaDibujo = L.polyline(puntosDibujo, { color: colorInput.value, weight: 3, dashArray: "6,6" }).addTo(window.map);
    }
  }

  function finalizarDibujoManual() {
    if (!dibujandoZona || procesandoFinalizacion || !window.map) return;
    if (puntosDibujo.length < 3) return alert("La zona requiere al menos 3 puntos.");
    procesandoFinalizacion = true;

    const datosNuevos = {
      nombre: nombreZona.value.trim(),
      tipoZona: tipoZona.value,
      color: colorInput.value,
      tipoLinea: tipoLinea.value,
      relleno: relleno.value,
      opacidad: parseInt(opacidad.value, 10) / 100
    };

    const layer = L.polygon(puntosDibujo, crearEstilo(datosNuevos.color, datosNuevos.tipoLinea, datosNuevos.relleno, datosNuevos.opacidad)).addTo(window.map);
    layer.options = datosNuevos;
    vinculoTooltip(layer);
    if (window.zonas) window.zonas.addLayer(layer);

    limpiarDibujoManual();
    document.getElementById("btnDibujar").textContent = "✏️ Dibujar nueva zona";
    nombreZona.value = "";
    guardarLocal();
    actualizarListaZonas();
    sincronizarFirebaseSilent();
    setTimeout(() => { procesandoFinalizacion = false; }, 100);
  }

  function VincularMapaAdminEventos() {
    if (!window.map) return setTimeout(VincularMapaAdminEventos, 300);
    window.map.on("click", (e) => {
      if (colocandoMarcador) {
        crearMarcadorEstrategico(e.latlng, nombreMarcador.value.trim(), tipoIconoMarcador.value, colorMarcador.value, null, true);
        colocandoMarcador = false;
        document.body.classList.remove("modo-marcador");
        nombreMarcador.value = "";
        return;
      }
      if (dibujandoZona && !procesandoFinalizacion) agregarPuntoDibujo(e.latlng);
    });
  }
  VincularMapaAdminEventos();

  // 6. MARCACIONES ESTRATÉGICAS
  document.getElementById("btnAgregarMarcador")?.addEventListener("click", function(e) {
    if (modoEdicionBloqueado) return alert("Modo solo lectura activo.");
    e.stopPropagation();
    const nom = nombreMarcador.value.trim();
    if (!nom) return alert("Ingresá un nombre para la marcación.");
    colocandoMarcador = true;
    document.body.classList.add("modo-marcador");
    if (estado) estado.textContent = "📍 Clic en el mapa para colocar el marcador";
  });

  function crearMarcadorEstrategico(latlng, nombre, icono, color, idExistente = null, guardarAuto = true) {
    if (!window.map) return;
    const idUnico = idExistente || ("m_" + Date.now());
    const htmlIcono = `<div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:${color};color:#fff;font-size:16px;border:2px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,0.35);">${icono}</div>`;
    const mIcon = L.divIcon({ className: "", html: htmlIcono, iconSize: [32, 32], iconAnchor: [16, 16] });

    const m = L.marker(latlng, { icon: mIcon, draggable: true, pane: 'panelMarcadores' });
    m.options = { idUnico, nombre, icono, color };

    m.on("dragend", function() { guardarLocal(); sincronizarFirebaseSilent(); });
    if (window.capaMarcadores) window.capaMarcadores.addLayer(m);

    if (guardarAuto) {
      guardarLocal();
      actualizarListaMarcadores();
      sincronizarFirebaseSilent();
    }
  }

  function actualizarListaMarcadores() {
    if (!listaMarcadores) return;
    listaMarcadores.innerHTML = "";
    let cant = 0;
    if (window.capaMarcadores) {
      window.capaMarcadores.eachLayer(m => {
        cant++;
        const div = document.createElement("div");
        div.className = "zona-item";
        div.innerHTML = `<div><b>${m.options.icono} ${escaparHTML(m.options.nombre)}</b></div>`;
        const btnDel = document.createElement("button");
        btnDel.className = "btn-borrar-item";
        btnDel.textContent = "🗑️";
        btnDel.onclick = () => {
          window.capaMarcadores.removeLayer(m);
          guardarLocal();
          actualizarListaMarcadores();
          sincronizarFirebaseSilent();
        };
        div.appendChild(btnDel);
        listaMarcadores.appendChild(div);
      });
    }
    const lbl = document.getElementById("lblCantMarcaciones");
    if (lbl) lbl.textContent = cant + " puntos";
  }

  // 7. MAPA DE CALOR
  function renderizarHeatmap() {
    if (!window.map) return;
    if (capaHeatmap) { window.map.removeLayer(capaHeatmap); capaHeatmap = null; }
    if (!puntosHeatmap.length) return;
    const r = parseInt(heatRadius.value, 10);
    const b = parseInt(heatBlur.value, 10);
    const m = parseFloat(heatMax.value);

    if (typeof L.heatLayer === "function") {
      capaHeatmap = L.heatLayer(puntosHeatmap, { radius: r, blur: b, max: m, maxZoom: 17 }).addTo(window.map);
    }
  }

  document.getElementById("btnCargarHeatmap")?.addEventListener("click", function() {
    const raw = document.getElementById("inputHeatmapCoords").value.trim();
    if (!raw) return alert("Ingresá coordenadas.");
    const pts = [];
    raw.split("\n").forEach(l => {
      const p = l.split(",");
      if (p.length >= 2) {
        const lat = parseFloat(p[0]), lon = parseFloat(p[1]);
        if (!isNaN(lat) && !isNaN(lon)) pts.push([lat, lon, 0.8]);
      }
    });
    puntosHeatmap = pts;
    renderizarHeatmap();
    guardarLocal();
  });

  document.getElementById("btnBorrarHeatmap")?.addEventListener("click", function() {
    if (capaHeatmap && window.map) window.map.removeLayer(capaHeatmap);
    capaHeatmap = null;
    puntosHeatmap = [];
    document.getElementById("inputHeatmapCoords").value = "";
    guardarLocal();
  });

  // 8. GESTIÓN DE ABONADOS GPS
  function cargarAbonadosLocal() {
    const d = localStorage.getItem("abonadosGPSAdmin");
    if (d) { try { abonadosApp = JSON.parse(d); } catch(e) { abonadosApp = []; } }
    renderizarListaAbonados();
  }

  function renderizarListaAbonados() {
    const lista = document.getElementById("listaAbonadosRegistrados");
    if (!lista) return;
    lista.innerHTML = "";
    const filtro = document.getElementById("buscarABAdminLista")?.value.trim().toUpperCase() || "";

    abonadosApp.forEach(ab => {
      if (filtro && !ab.ab.toUpperCase().includes(filtro) && !ab.direccion.toUpperCase().includes(filtro)) return;
      const div = document.createElement("div");
      div.className = "zona-item";
      div.innerHTML = `<div><b>AB ${escaparHTML(ab.ab)}</b> - ${escaparHTML(ab.direccion)}</div>`;
      
      const btnDel = document.createElement("button");
      btnDel.className = "btn-borrar-item";
      btnDel.textContent = "🗑️";
      btnDel.onclick = () => {
        abonadosApp = abonadosApp.filter(x => x.ab !== ab.ab);
        guardarLocal();
        renderizarListaAbonados();
        sincronizarFirebaseSilent();
      };
      div.appendChild(btnDel);
      lista.appendChild(div);
    });

    const lbl = document.getElementById("lblCantAbonados");
    if (lbl) lbl.textContent = abonadosApp.length + " abonados";
  }

  document.getElementById("btnGuardarABManual")?.addEventListener("click", function() {
    const ab = document.getElementById("abNumero").value.trim();
    const dir = document.getElementById("abDireccion").value.trim();
    const loc = document.getElementById("abLocalidad").value.trim();
    const como = document.getElementById("abComoLlegar").value.trim();
    const lat = parseFloat(document.getElementById("abLat").value);
    const lon = parseFloat(document.getElementById("abLon").value);

    if (!ab || !dir || isNaN(lat) || isNaN(lon)) return alert("Completá AB, Dirección, Latitud y Longitud.");

    const item = { ab, direccion: dir, localidad: loc, comoLlegar: como, lat, lon };
    const idx = abonadosApp.findIndex(x => x.ab.toUpperCase() === ab.toUpperCase());
    if (idx !== -1) abonadosApp[idx] = item;
    else abonadosApp.push(item);

    guardarLocal();
    renderizarListaAbonados();
    sincronizarFirebaseSilent();
    alert("✅ Abonado AB " + ab + " guardado.");
  });

  document.getElementById("btnProcesarMasivo")?.addEventListener("click", function() {
    const txt = document.getElementById("txtMasivoExcel").value.trim();
    if (!txt) return;
    let cant = 0;
    txt.split("\n").forEach(l => {
      const col = l.split(/\t|,|;/);
      if (col.length >= 6) {
        const ab = col[0].trim(), dir = col[1].trim(), loc = col[2].trim(), como = col[3].trim();
        const lat = parseFloat(col[4]), lon = parseFloat(col[5]);
        if (ab && !isNaN(lat) && !isNaN(lon)) {
          const idx = abonadosApp.findIndex(x => x.ab.toUpperCase() === ab.toUpperCase());
          const item = { ab, direccion: dir, localidad: loc, comoLlegar: como, lat, lon };
          if (idx !== -1) abonadosApp[idx] = item;
          else abonadosApp.push(item);
          cant++;
        }
      }
    });
    guardarLocal();
    renderizarListaAbonados();
    sincronizarFirebaseSilent();
    alert("✅ Procesados " + cant + " abonados.");
  });

  // 9. LISTA DE ZONAS Y EDITORES
  function actualizarListaZonas() {
    if (!listaZonas) return;
    listaZonas.innerHTML = "";
    if (window.zonas) {
      window.zonas.eachLayer(layer => {
        const div = document.createElement("div");
        div.className = "zona-item";
        div.innerHTML = `<div><b>${escaparHTML(layer.options.nombre)}</b><br><small>${etiquetaTipo(layer.options.tipoZona)}</small></div>`;
        div.onclick = () => {
          if (layer.getBounds && window.map) window.map.fitBounds(layer.getBounds(), { padding: [40, 40] });
        };
        listaZonas.appendChild(div);
      });
    }
    actualizarContadores();
  }

  // 10. PUBLICACIÓN / SINCRONIZACIÓN CON FIREBASE
  function sincronizarFirebaseSilent() {
    const fbUrlRaw = cfgFirebaseUrl?.value.trim() || localStorage.getItem("fbUrlAdmin") || "";
    if (!fbUrlRaw) return;
    const endpoint = formatearUrlFirebase(fbUrlRaw);
    const payload = {
      fecha: new Date().toISOString(),
      zonas: capturarEstado(),
      abonados: abonadosApp
    };
    fetch(endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(() => {
      if (window.actualizarConsultaDatos) window.actualizarConsultaDatos(payload);
    }).catch(() => {});
  }

  document.getElementById("btnPublicarMultiples")?.addEventListener("click", async function() {
    const urlRaw = cfgFirebaseUrl?.value.trim();
    if (!urlRaw) return alert("Ingresá la URL de Firebase Realtime Database.");
    localStorage.setItem("fbUrlAdmin", urlRaw);
    sincronizarFirebaseSilent();
    alert("🚀 Datos sincronizados con éxito en Firebase.");
  });

  document.getElementById("btnBorrar")?.addEventListener("click", function() {
    if (!confirm("¿Borrar TODAS las zonas y marcaciones?")) return;
    if (window.zonas) window.zonas.clearLayers();
    if (window.capaMarcadores) window.capaMarcadores.clearLayers();
    guardarLocal();
    actualizarListaZonas();
    actualizarListaMarcadores();
    sincronizarFirebaseSilent();
  });

  // Carga inicial de datos
  cargarAbonadosLocal();
  actualizarListaZonas();
  actualizarListaMarcadores();
})();
