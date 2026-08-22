/* =========================================================
   MÓDULO ADMINISTRADOR: DIBUJO, EDICIÓN Y GESTIÓN DE MAPAS
========================================================= */
(function() {
  "use strict";

  let dibujandoZona = false;
  let colocandoMarcador = false;
  let puntosDibujo = [];
  let marcadoresDibujo = [];
  let lineaDibujo = null;
  let poligonoPrevisualizacion = null;
  let zonaSeleccionada = null;
  let editandoVertices = false;
  let marcadoresVertices = [];
  let abonadosApp = [];

  const nombreZona = document.getElementById("nombreZona");
  const tipoZona = document.getElementById("tipoZona");
  const colorInput = document.getElementById("colorInput");
  const tipoLinea = document.getElementById("tipoLinea");
  const relleno = document.getElementById("relleno");
  const opacidad = document.getElementById("opacidad");
  const listaZonas = document.getElementById("listaZonas");

  // 1. TEMA DEL PANEL ADMIN
  document.getElementById("selectorTemaPanel")?.addEventListener("change", function() {
    document.body.classList.remove("modo-dark", "modo-tactico");
    if (this.value === "dark") document.body.classList.add("modo-dark");
    if (this.value === "tactico") document.body.classList.add("modo-tactico");
  });

  // 2. CAMBIO DE SERVIDOR DE MAPA BASE
  document.getElementById("mapaEstilo")?.addEventListener("change", function() {
    if (!window.map || !window.capasBase) return;
    Object.values(window.capasBase).forEach(c => window.map.removeLayer(c));
    if (window.capasBase[this.value]) window.capasBase[this.value].addTo(window.map);
  });

  document.getElementById("btnRefrescarMapa")?.addEventListener("click", function() {
    if (window.map) {
      window.map.invalidateSize();
      alert("🔄 Mapa recargado y vista sincronizada.");
    }
  });

  // 3. MOSTRAR / OCULTAR CAPAS POR SELECCIÓN
  document.querySelectorAll(".filtro-check").forEach(chk => {
    chk.addEventListener("change", aplicarFiltroCapas);
  });

  function aplicarFiltroCapas() {
    if (!window.zonas) return;
    const activos = Array.from(document.querySelectorAll(".filtro-check:checked")).map(c => c.value);
    window.zonas.eachLayer(layer => {
      const tipo = layer.options.tipoZona || "cobertura";
      if (activos.includes(tipo)) {
        if (!window.map.hasLayer(layer)) window.map.addLayer(layer);
      } else {
        if (window.map.hasLayer(layer)) window.map.removeLayer(layer);
      }
    });
  }

  // 4. CREAR ESTILOS Y LÍNEAS
  function crearEstilo(color, linea, rellenoVal, opacity) {
    let estilo = {
      color: color || "#2E7D32",
      weight: 3,
      fillColor: color || "#2E7D32",
      fillOpacity: rellenoVal === "sin" ? 0 : (opacity ?? 0.25)
    };
    if (linea === "puntos") estilo.dashArray = "2,7";
    else if (linea === "rayas") estilo.dashArray = "12,8";
    else estilo.dashArray = null;
    return estilo;
  }

  // 5. EDICIÓN DE ZONA Y CAMBIO DE ESTILO DE LÍNEA
  function seleccionarZonaParaEditar(layer) {
    zonaSeleccionada = layer;
    document.getElementById("editarNombre").value = layer.options.nombre || "";
    document.getElementById("editarTipo").value = layer.options.tipoZona || "cobertura";
    document.getElementById("editarColor").value = layer.options.color || "#2E7D32";
    document.getElementById("editarLinea").value = layer.options.tipoLinea || "solida";
    document.getElementById("editarOpacidad").value = (layer.options.opacidad ?? 0.25) * 100;
    
    // Desplegar menú de edición
    const menuEd = document.getElementById("menuEditar");
    if (menuEd) menuEd.classList.add("abierto");
  }

  document.getElementById("btnGuardarEdicion")?.addEventListener("click", function() {
    if (!zonaSeleccionada) return alert("Seleccioná una zona en el mapa primero.");
    const nom = document.getElementById("editarNombre").value.trim();
    const tipo = document.getElementById("editarTipo").value;
    const color = document.getElementById("editarColor").value;
    const linea = document.getElementById("editarLinea").value;
    const op = parseInt(document.getElementById("editarOpacidad").value, 10) / 100;

    zonaSeleccionada.options.nombre = nom;
    zonaSeleccionada.options.tipoZona = tipo;
    zonaSeleccionada.options.color = color;
    zonaSeleccionada.options.tipoLinea = linea;
    zonaSeleccionada.options.opacidad = op;

    zonaSeleccionada.setStyle(crearEstilo(color, linea, "normal", op));
    desactivarEdicionVertices();
    guardarLocal();
    actualizarListaZonas();
    alert("💾 Cambios guardados con éxito.");
  });

  // 6. EDITAR VÉRTICES DIBUJADOS
  document.getElementById("btnEditarVertices")?.addEventListener("click", function() {
    if (!zonaSeleccionada) return alert("Seleccioná una zona primero.");
    if (editandoVertices) desactivarEdicionVertices();
    else activarEdicionVertices();
  });

  function activarEdicionVertices() {
    desactivarEdicionVertices();
    editandoVertices = true;
    const latlngs = zonaSeleccionada.getLatLngs()[0];
    latlngs.forEach((pt, idx) => {
      const m = L.circleMarker(pt, { radius: 6, color: "#1a73e8", fillColor: "#fff", fillOpacity: 1, draggable: true }).addTo(window.map);
      m.on("drag", function(e) {
        latlngs[idx] = e.latlng;
        zonaSeleccionada.setLatLngs(latlngs);
      });
      marcadoresVertices.push(m);
    });
  }

  function desactivarEdicionVertices() {
    editandoVertices = false;
    marcadoresVertices.forEach(m => window.map.removeLayer(m));
    marcadoresVertices = [];
  }

  // 7. DIBUJO MANUAL
  document.getElementById("btnDibujar")?.addEventListener("click", function(e) {
    e.stopPropagation();
    if (dibujandoZona) { finalizarDibujoManual(); return; }
    if (!nombreZona.value.trim()) return alert("Ingresá un nombre para la zona.");
    iniciarDibujoManual();
  });

  function iniciarDibujoManual() {
    puntosDibujo = []; marcadoresDibujo = []; dibujandoZona = true;
    document.getElementById("btnDibujar").textContent = "✓ Finalizar zona";
  }

  function finalizarDibujoManual() {
    if (puntosDibujo.length < 3) return alert("Se requieren al menos 3 puntos.");
    const layer = L.polygon(puntosDibujo, crearEstilo(colorInput.value, tipoLinea.value, relleno.value, parseInt(opacidad.value, 10)/100)).addTo(window.map);
    layer.options = {
      nombre: nombreZona.value.trim(),
      tipoZona: tipoZona.value,
      color: colorInput.value,
      tipoLinea: tipoLinea.value,
      opacidad: parseInt(opacidad.value, 10)/100
    };
    layer.on("click", () => seleccionarZonaParaEditar(layer));
    if (window.zonas) window.zonas.addLayer(layer);

    puntosDibujo = []; marcadoresDibujo.forEach(m => window.map.removeLayer(m));
    dibujandoZona = false;
    document.getElementById("btnDibujar").textContent = "✏️ Dibujar nueva zona";
    guardarLocal();
    actualizarListaZonas();
  }

  function VincularMapaAdminEventos() {
    if (!window.map) return setTimeout(VincularMapaAdminEventos, 300);
    window.map.on("click", (e) => {
      if (dibujandoZona) {
        puntosDibujo.push(e.latlng);
        const m = L.circleMarker(e.latlng, { radius: 5, color: "#1a73e8" }).addTo(window.map);
        marcadoresDibujo.push(m);
      }
    });
  }
  VincularMapaAdminEventos();

  function capturarEstado() {
    const lista = [];
    if (window.zonas) {
      window.zonas.eachLayer(layer => {
        const geo = layer.toGeoJSON();
        geo.properties = layer.options;
        lista.push(geo);
      });
    }
    return lista;
  }

  function guardarLocal() {
    localStorage.setItem("zonasAdmin", JSON.stringify(capturarEstado()));
  }

  function actualizarListaZonas() {
    if (!listaZonas) return;
    listaZonas.innerHTML = "";
    if (window.zonas) {
      window.zonas.eachLayer(layer => {
        const div = document.createElement("div");
        div.className = "zona-item";
        div.innerHTML = `<div><b>${escaparHTML(layer.options.nombre || "Zona")}</b></div>`;
        div.onclick = () => seleccionarZonaParaEditar(layer);
        listaZonas.appendChild(div);
      });
    }
  }

  actualizarListaZonas();
})();
