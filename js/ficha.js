// ============================================================
// FICHA / MARCADOR
// ============================================================

/* ============================================================
   MESA DE CONSULTA — TOCAR PARA EXPANDIR / MINIMIZAR
   ============================================================ */

document.addEventListener("DOMContentLoaded", function () {

    const ficha = document.getElementById("mesaFicha");
    const cerrar = document.getElementById("cerrarMesaFicha");

    if (!ficha) return;

    /*
     * Estado interno:
     * si el usuario cierra la ficha, queda cerrada hasta
     * que una nueva búsqueda vuelva a mostrar datos.
     */
    ficha.dataset.cerrada = "false";

    function alternarFicha() {

        if (ficha.dataset.cerrada === "true") {
            return;
        }

        ficha.classList.toggle("expandida");
    }

    ficha.querySelectorAll(".mesa-ficha-toggle").forEach(function (elemento) {

        elemento.addEventListener("click", function (evento) {

            if (
                evento.target.closest(".mesa-ficha-cerrar")
            ) {
                return;
            }

            alternarFicha();
        });

    });

    if (cerrar) {

        cerrar.addEventListener("click", function (evento) {

            evento.preventDefault();
            evento.stopPropagation();

            ficha.dataset.cerrada = "true";

            ficha.classList.remove("visible");
            ficha.classList.remove("expandida");

        });

    }

    /*
     * Acciones visuales por ahora.
     */

    const googleMaps =
        document.getElementById("accionGoogleMaps");

    const waze =
        document.getElementById("accionWaze");

    const whatsapp =
        document.getElementById("accionWhatsApp");

    const pdf =
        document.getElementById("accionPDF");

    [googleMaps, waze, whatsapp, pdf]
        .filter(Boolean)
        .forEach(function (boton) {

            boton.addEventListener("click", function (e) {
                e.stopPropagation();
            });

        });

});


/* ============================================================
   MARCADOR — EVITAR REFERENCIAS DE TEXTO SOBRE EL PUNTO
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

            document
                .querySelectorAll(selector)
                .forEach(function (elemento) {

                    elemento.style.display = "none";

                });

        });
    }

    limpiarTextoMarcador();

    const observador =
        new MutationObserver(function () {
            limpiarTextoMarcador();
        });

    observador.observe(document.body, {
        childList: true,
        subtree: true
    });

});


/* ============================================================
   COLOR DE LA FICHA SEGÚN COBERTURA
   ============================================================ */

function actualizarColorFichaCobertura(dentroCobertura) {

    const ficha =
        document.getElementById("mesaFicha");

    if (!ficha) return;

    ficha.classList.remove(
        "cobertura-ok",
        "cobertura-fuera"
    );

    if (dentroCobertura === true) {

        ficha.classList.add(
            "cobertura-ok"
        );

    } else {

        ficha.classList.add(
            "cobertura-fuera"
        );

    }
}


/* ============================================================
   FUNCIÓN PARA MOSTRAR UNA NUEVA BÚSQUEDA
   ============================================================ */

function mostrarFichaNuevaBusqueda() {

    const ficha =
        document.getElementById("mesaFicha");

    if (!ficha) return;

    ficha.dataset.cerrada = "false";

    ficha.classList.remove("expandida");

    ficha.classList.add("visible");
}
