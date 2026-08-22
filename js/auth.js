/* =========================================================
   SISTEMA DE AUTENTICACIÓN Y CONTROL DE PERMISOS
========================================================= */
(function() {
  "use strict";

  const loginOverlay = document.getElementById("loginOverlay");
  const formLoginUnificado = document.getElementById("formLoginUnificado");
  const loginUser = document.getElementById("loginUser");
  const loginPass = document.getElementById("loginPass");
  const loginErrorMsg = document.getElementById("loginErrorMsg");
  const selectorModoIonray = document.getElementById("selectorModoIonray");
  const btnLoginSubmit = document.getElementById("btnLoginSubmit");
  const txtUserSesion = document.getElementById("txtUserSesion");
  const txtEstadoSesionUser = document.getElementById("txtEstadoSesionUser");

  formLoginUnificado?.addEventListener("submit", function(e) {
    e.preventDefault();
    const u = loginUser.value.trim().toUpperCase();
    const p = loginPass.value.trim();

    if (u === "IONRAY" && p === "IONRAY") {
      loginErrorMsg.style.display = "none";
      btnLoginSubmit.style.display = "none";
      selectorModoIonray.style.display = "block";
      sessionStorage.setItem("usuarioSesion", JSON.stringify({ usuario: "IONRAY", rol: "SUPER_ADMIN" }));
    } else if (u.length > 0 && p.length > 0) {
      const usrObj = { usuario: u, rol: "OPERADOR_CONSULTA" };
      sessionStorage.setItem("usuarioSesion", JSON.stringify(usrObj));
      window.entrarModo('consulta');
    } else {
      loginErrorMsg.style.display = "block";
    }
  });

  document.getElementById("btnModoConsultaIonray")?.addEventListener("click", function() {
    window.entrarModo('consulta');
  });

  document.getElementById("btnModoAdminIonray")?.addEventListener("click", function() {
    window.entrarModo('admin');
  });

  window.entrarModo = function(modo) {
    loginOverlay.classList.add("oculto");
    document.body.classList.remove("vista-admin", "vista-consulta");
    
    if (modo === "admin") {
      document.body.classList.add("vista-admin");
      if (txtEstadoSesionUser) txtEstadoSesionUser.textContent = "IONRAY (Cerrar)";
    } else {
      document.body.classList.add("vista-consulta");
      const sesionRaw = sessionStorage.getItem("usuarioSesion");
      const uObj = sesionRaw ? JSON.parse(sesionRaw) : { usuario: "Invitado" };
      if (txtUserSesion) txtUserSesion.textContent = uObj.usuario;
    }

    if (window.map) {
      setTimeout(() => window.map.invalidateSize(), 300);
    }
  };

  window.cerrarSesion = function() {
    sessionStorage.removeItem("usuarioSesion");
    if (loginUser) loginUser.value = "";
    if (loginPass) loginPass.value = "";
    if (btnLoginSubmit) btnLoginSubmit.style.display = "block";
    if (selectorModoIonray) selectorModoIonray.style.display = "none";
    if (loginErrorMsg) loginErrorMsg.style.display = "none";
    loginOverlay.classList.remove("oculto");
  };

  document.getElementById("btnToggleAuth")?.addEventListener("click", window.cerrarSesion);
  document.getElementById("btnToggleAuthUserAdmin")?.addEventListener("click", window.cerrarSesion);
})();
