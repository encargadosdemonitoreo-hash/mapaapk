// ============================================================
// FICHA / MARCADOR
// ============================================================

/* Mostrar ficha de prueba */
document.addEventListener("DOMContentLoaded", function () {
    const ficha = document.getElementById("mesaFicha");

    if (ficha) {
        setTimeout(function () {
            ficha.classList.add("visible");
        }, 500);
    }
});

/* ============================================================
   MARCADOR — evitar referencias de texto sobre el punto
   ============================================================ */

document.addEventListener("DOMContentLoaded", function () {

    function limpiarTextoMarcador() {

        const selectores = [
            ".marker-label",
            ".marker-info",
            ".marker-popup",
            ".marker-tooltip",
            ".marker-text",
            ".marker-caption",
            ".marcador-info",
            ".marcador-label"
        ];

        selectores.forEach(function (selector) {

            document.querySelectorAll(selector).forEach(function (elemento) {
                elemento.style.display = "none";
            });

        });
    }

    limpiarTextoMarcador();

    // Por si el marcador se vuelve a crear dinámicamente.
    const observador = new MutationObserver(function () {
        limpiarTextoMarcador();
    });

    observador.observe(document.body, {
        childList: true,
        subtree: true
    });

});

/* ============================================================
   MESA DE CONSULTA — TOCAR PARA EXPANDIR / MINIMIZAR
   ============================================================ */

document.addEventListener("DOMContentLoaded", function () {

    const ficha = document.getElementById("mesaFicha");
    const cerrar = document.getElementById("cerrarMesaFicha");

    if (!ficha) return;

    function alternarFicha() {
        ficha.classList.toggle("expandida");
    }

    /*
     * La ficha se puede tocar en la cabecera o en los datos.
     * Los botones internos no provocan el cierre/expansión.
     */

    ficha.querySelectorAll(".mesa-ficha-toggle").forEach(function (elemento) {

        elemento.addEventListener("click", function () {
            alternarFicha();
        });

    });

    if (cerrar) {

        cerrar.addEventListener("click", function (evento) {

            evento.stopPropagation();

            ficha.classList.remove("visible");
            ficha.classList.remove("expandida");

        });

    }

    /*
     * Acciones visuales por ahora.
     * Las funciones reales se conectarán posteriormente.
     */

    const googleMaps = document.getElementById("accionGoogleMaps");
    const waze = document.getElementById("accionWaze");
    const whatsapp = document.getElementById("accionWhatsApp");
    const pdf = document.getElementById("accionPDF");

    if (googleMaps) {
        googleMaps.addEventListener("click", function (e) {
            e.stopPropagation();
        });
    }

    if (waze) {
        waze.addEventListener("click", function (e) {
            e.stopPropagation();
        });
    }

    if (whatsapp) {
        whatsapp.addEventListener("click", function (e) {
            e.stopPropagation();
        });
    }

    if (pdf) {
        pdf.addEventListener("click", function (e) {
            e.stopPropagation();
        });
    }

});

/* ============================================================
   COLOR DE LA FICHA SEGÚN COBERTURA
   ============================================================ */

function actualizarColorFichaCobertura(dentroCobertura) {
    const ficha = document.getElementById("mesaFicha");

    if (!ficha) return;

    ficha.classList.remove("cobertura-ok", "cobertura-fuera");

    if (dentroCobertura === true) {
        ficha.classList.add("cobertura-ok");
    } else {
        ficha.classList.add("cobertura-fuera");
    }
}
