/* ============================================================
   FIREBASE / SINCRONIZACIÓN
   APP COMO LLEGAR
   ============================================================ */

const VERSION_BASE = "1.1.2";
let VERSION_LOCAL = localStorage.getItem("versionGuardadaLocal") || VERSION_BASE;
let ultimaVersionDetectada = VERSION_LOCAL;
let usuariosLocal = [];
let elementos = [], abonadosLocal = [], capas = [], marcadoresInstanciados = [], marcadoresAutos = [], marker = null;
let currentController = null;
const statusSync = document.getElementById("indicadorSyncStatus");
const urlParams = new URLSearchParams(window.location.search);
let endpointGuardado = urlParams.get("db") || localStorage.getItem("fbUrlAdmin") || "https://mapa-ef4d1-default-rtdb.firebaseio.com/";

function formatearUrlFirebase(urlOriginal) {
  if (!urlOriginal) return "";
  let url = urlOriginal.trim();
  if (url.endsWith("/")) url = url.slice(0, -1);
  if (!url.endsWith(".json")) {
    url += url.endsWith("/mapa") ? ".json" : "/mapa.json";
  }
  return url;
}

function cargarCopiaRespaldoOffline() {
  const offlineData = localStorage.getItem("cacheMapaOfflineData");
  if (offlineData) {
    try {
      const dataFB = JSON.parse(offlineData);
      if (dataFB.zonas) { elementos = dataFB.zonas; renderizarDatosMapa(elementos); }
      if (dataFB.abonados) {
        abonadosLocal = Array.isArray(dataFB.abonados) ? dataFB.abonados : Object.values(dataFB.abonados);
        renderizarClusterAbonados(abonadosLocal);
      }
      if (dataFB.usuarios) usuariosLocal = dataFB.usuarios;
      if (statusSync) {
        statusSync.textContent = "🟠 Offline — usando copia local";
        statusSync.style.color = "#e65100";
      }
      ocultarSplashScreen();
      return true;
    } catch (err) {
      console.warn("Cache offline corrupto:", err);
      return false;
    }
  }
  if (statusSync) {
    statusSync.textContent = "🔴 Sin datos offline";
    statusSync.style.color = "#d93025";
  }
  return false;
}

function autoCargarConfiguracionRemotaIndex() {

  try {

    const res = await fetch("./config.txt?nocache=" + Date.now(), {
      cache: "no-store"
    });

    if (!res.ok) {
      throw new Error("HTTP " + res.status);
    }

    const textoConfig = await res.text();

    const mapaConfig = {};

    textoConfig.split(/\r?\n/).forEach(function(linea) {

      const lineaLimpia = linea.trim();

      if (!lineaLimpia || lineaLimpia.startsWith("#")) {
        return;
      }

      const pos = lineaLimpia.indexOf("=");

      if (pos === -1) {
        return;
      }

      const clave = lineaLimpia.slice(0, pos).trim();
      const valor = lineaLimpia.slice(pos + 1).trim();

      if (clave && valor) {
        mapaConfig[clave] = valor;
      }
    });

    if (mapaConfig.url_firebase) {

      endpointGuardado = mapaConfig.url_firebase;

      try {
        localStorage.setItem(
          "fbUrlAdmin",
          mapaConfig.url_firebase
        );
      } catch (e) {}

      console.log(
        "✅ Firebase obtenido desde config.txt:",
        endpointGuardado
      );
    }

    if (mapaConfig.version_app) {

      ultimaVersionDetectada = mapaConfig.version_app;

      console.log(
        "ℹ️ version_app obtenida desde config.txt:",
        mapaConfig.version_app
      );
    }

    return true;

  } catch (error) {

    console.warn(
      "⚠️ No se pudo cargar config.txt. Se utilizará la configuración existente.",
      error
    );

    return false;
  }
}

function actualizarDesdeFirebase() {
  const urlBruta = endpointGuardado;
  const fetchUrl = formatearUrlFirebase(urlBruta);

  if (!fetchUrl) {
    if (!cargarCopiaRespaldoOffline() && statusSync) {
      statusSync.textContent = "🔴 Sin URL Base";
      statusSync.style.color = "#d93025";
    }
    ocultarSplashScreen();
    return;
  }

  if (!estaOnline()) {
    cargarCopiaRespaldoOffline();
    ocultarSplashScreen();
    return;
  }

  if (currentController) currentController.abort();
  currentController = new AbortController();

  if (statusSync && elementos.length === 0) {
    statusSync.textContent = "🟡 Sincronizando...";
    statusSync.style.color = "#f29900";
  }

  try {
    const res = await fetch(fetchUrl, { cache: "no-store", signal: currentController.signal });
    if (!res.ok) throw new Error("Error HTTP " + res.status);
    const dataFB = await res.json();

    console.log("Firebase recibido:", {
        zonas: dataFB.zonas ? dataFB.zonas.length : 0,
        abonados: dataFB.abonados ? dataFB.abonados.length : 0,
        version: dataFB.version_app
    });
    if (dataFB) {
      if (dataFB.zonas) { elementos = dataFB.zonas; renderizarDatosMapa(elementos); }
      if (dataFB.abonados) {
        abonadosLocal = Array.isArray(dataFB.abonados) ? dataFB.abonados : Object.values(dataFB.abonados);
        renderizarClusterAbonados(abonadosLocal);
      }
      if (dataFB.usuarios) usuariosLocal = dataFB.usuarios;
      try {
        localStorage.setItem("cacheMapaOfflineData", JSON.stringify(dataFB));
      } catch (e) {
        console.warn("No se pudo guardar cache offline:", e);
      }
      if (dataFB.version_app) {
        ultimaVersionDetectada = dataFB.version_app;
        if (dataFB.version_app !== VERSION_LOCAL) {
          const lblVer = document.getElementById("lblNuevaVersion");
          if (lblVer) lblVer.textContent = dataFB.version_app;
          document.getElementById("avisoUpdateCyber")?.classList.add("visible");
        } else {
          document.getElementById("avisoUpdateCyber")?.classList.remove("visible");
        }
      }
      if (statusSync) {
        statusSync.textContent = "🟢 Sincronizado";
        statusSync.style.color = "#2e7d32";
      }
      ocultarSplashScreen();
    }
  } catch (e) {
    if (e.name === "AbortError") return;
    const usoCopia = cargarCopiaRespaldoOffline();
    if (!usoCopia && statusSync && elementos.length === 0) {
      statusSync.textContent = "🔴 Sin conexión y sin cache";
      statusSync.style.color = "#d93025";
    }
    ocultarSplashScreen();
  }
}
