// ============================================================
// NAVEGACIÓN
// ============================================================

const overlay =
    document.getElementById("overlay");

const panel =
    document.getElementById("panel");

const panelTitulo =
    document.getElementById("panelTitulo");

const panelContenido =
    document.getElementById("panelContenido");

const icons = {

    search:
    '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="10.8" cy="10.8" r="6.5"></circle><path d="m16 16 5 5"></path></svg>',

    card:
    '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"></rect><path d="M7 10h5"></path><path d="M7 14h3"></path></svg>',

    pin:
    '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"></path><circle cx="12" cy="10" r="2.5"></circle></svg>',

    whatsapp:
    '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4A8 8 0 1 1 20 11.5Z"></path><path d="M9 8.5c.3-.6.6-.6 1-.5l1 .9c.3.3.3.6.1.9l-.5.7c.8 1.3 1.5 1.8 2.9 2.3l.7-.7c.3-.3.6-.3.9-.1l1.1.7c.4.3.4.6.2 1-.4.8-1 1.2-1.7 1.2-2.3 0-4.8-2.7-6.1-4.4-.8-1.1-1-1.8-.6-2.3Z"></path></svg>',

    pdf:
    '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l4 4v14H6z"></path><path d="M14 3v5h5"></path><path d="M8.5 16h1.2a1.7 1.7 0 0 0 0-3.4H8.5V18"></path></svg>',

    photo:
    '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="14" rx="2.5"></rect><path d="m8 6 1.5-2h5L16 6"></path><circle cx="12" cy="13" r="3"></circle></svg>',

    copy:
    '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="11" height="12" rx="2"></rect><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2"></path></svg>',

    appearance:
    '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.9 4.9 1.4 1.4"></path><path d="m17.7 17.7 1.4 1.4"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m4.9 19.1 1.4-1.4"></path><path d="m17.7 6.3 1.4-1.4"></path></svg>',

    text:
    '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 5h14"></path><path d="M12 5v14"></path><path d="M8 19h8"></path></svg>',

    map:
    '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18-6 3V6l6-3 6 3 6-3v15l-6 3-6-3Z"></path><path d="M9 3v15"></path><path d="M15 6v15"></path></svg>'
};

const menus = {

    abonado: {

        titulo: "Abonado",

        opciones: [
            ["search", "Buscar abonado", "Buscar por número de AB"],
            ["card", "Datos del abonado", "Consultar información"],
            ["pin", "Ubicar en mapa", "Mostrar ubicación"]
        ]

    },

    compartir: {

        titulo: "Compartir",

        opciones: [
            ["whatsapp", "WhatsApp", "Compartir datos"],
            ["pdf", "PDF", "Generar ficha PDF"],
            ["photo", "Foto + datos", "Compartir fotografía"],
            ["copy", "Copiar", "Copiar información"]
        ]

    },

    ajustes: {

        titulo: "Ajustes",

        opciones: [
            ["appearance", "Apariencia", "Tema de la aplicación"],
            ["text", "Tamaño de texto", "Normal · Grande · Extra grande"],
            ["map", "Mapa", "Tipo de mapa y zoom"]
        ]

    }

};

function abrirMenu(nombre) {

    const menu = menus[nombre];

    if (!menu) {
        return;
    }

    panelTitulo.textContent =
        menu.titulo;

    panelContenido.innerHTML =
        menu.opciones.map(opcion => {

            return `
                <button
                    class="opcion"
                    type="button">

                    <span class="opcion-icono">
                        ${icons[opcion[0]]}
                    </span>

                    <span class="opcion-texto">

                        <strong>
                            ${opcion[1]}
                        </strong>

                        <small>
                            ${opcion[2]}
                        </small>

                    </span>

                </button>
            `;

        }).join("");

    document
        .querySelectorAll(".nav")
        .forEach(btn => {

            btn.classList.toggle(
                "activo",
                btn.dataset.menu === nombre
            );

        });

    overlay.classList.add("visible");

    panel.classList.add("visible");
}

function cerrarMenu() {

    overlay.classList.remove("visible");

    panel.classList.remove("visible");

    document
        .querySelectorAll(".nav")
        .forEach(btn => {

            btn.classList.remove("activo");

        });
}

document
    .querySelectorAll(".nav")
    .forEach(btn => {

        btn.addEventListener(
            "click",
            () => {

                const nombre =
                    btn.dataset.menu;

                if (
                    panel.classList.contains("visible") &&
                    btn.classList.contains("activo")
                ) {

                    cerrarMenu();

                } else {

                    abrirMenu(nombre);

                }

            }
        );

    });

overlay.addEventListener(
    "click",
    cerrarMenu
);

document
    .getElementById("cerrarFicha")
    .addEventListener(
        "click",
        () => {

            document
                .getElementById("ficha")
                .style.display = "none";

        }
    );

document
    .getElementById("btnBuscar")
    .addEventListener(
        "click",
        () => {

            console.log(
                "Buscar:",
                document
                    .getElementById("buscarDireccion")
                    .value
                    .trim()
            );

        }
    );

document
    .getElementById("btnVoz")
    .addEventListener(
        "click",
        () => {

            alert(
                "La búsqueda por voz se conectará en la siguiente etapa."
            );

        }
    );

/* V4 — cierre del menú al tocar nuevamente el botón activo */

(function () {

    function configurarCierreMenu() {

        const botones = document.querySelectorAll('.bottom-btn');

        if (!botones.length) return;

        botones.forEach(function (boton) {

            if (boton.dataset.cierreConfigurado === "1") return;

            boton.dataset.cierreConfigurado = "1";

            boton.addEventListener("click", function (evento) {

                const menu = boton.getAttribute("data-menu");

                if (!menu) return;

                const panel = document.querySelector(
                    '[data-panel="' + menu + '"], #' + menu + ', .' + menu
                );

                const yaActivo =
                    boton.classList.contains("active") ||
                    boton.classList.contains("selected");

                if (yaActivo) {

                    // Dejamos que el código original procese primero
                    setTimeout(function () {

                        // Intentar cerrar mediante las variables/clases
                        // que ya utiliza la interfaz.
                        document
                            .querySelectorAll(".bottom-btn.active, .bottom-btn.selected")
                            .forEach(function (b) {
                                b.classList.remove("active");
                                b.classList.remove("selected");
                            });

                    }, 0);
                }

            });

        });

    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", configurarCierreMenu);
    } else {
        configurarCierreMenu();
    }

})();
