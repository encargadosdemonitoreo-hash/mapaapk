// ============================================================
// BUSCADOR DE DIRECCIONES
// ============================================================

/* ============================================================
   BUSCADOR DE CALLE Y ALTURA — PRUEBA
   ============================================================ */

(function () {

    const input = document.getElementById("buscarDireccion");
    const boton = document.getElementById("btnBuscar");
    const ficha = document.getElementById("mesaFicha");

    if (!input || !boton) {
        console.warn("Buscador no encontrado.");
        return;
    }

    let marcadorBusqueda = null;

    async function buscarDireccion() {

        const texto = input.value.trim();

        if (!texto) {
            alert("Ingresá una calle y altura.");
            return;
        }

        const mapa = window._mapaReal;

        if (!mapa) {
            alert("El mapa todavía no está listo.");
            return;
        }

        boton.disabled = true;

        try {

            /*
             * Argentina como referencia geográfica.
             */

            const consulta = encodeURIComponent(
                texto + ", Buenos Aires, Argentina"
            );

            const url =
                "https://nominatim.openstreetmap.org/search" +
                "?format=json" +
                "&limit=1" +
                "&countrycodes=ar" +
                "&q=" + consulta;

            const respuesta = await fetch(url, {
                headers: {
                    "Accept": "application/json"
                }
            });

            if (!respuesta.ok) {
                throw new Error(
                    "Error HTTP " + respuesta.status
                );
            }

            const resultados = await respuesta.json();

            if (!resultados.length) {

                alert(
                    "No se encontró la dirección:\n\n" +
                    texto
                );

                return;
            }

            const resultado = resultados[0];

            const lat = parseFloat(resultado.lat);
            const lon = parseFloat(resultado.lon);

            /*
             * Eliminar marcador anterior de búsqueda.
             */

            if (marcadorBusqueda) {
                mapa.removeLayer(marcadorBusqueda);
            }

            /*
             * Crear marcador de la dirección encontrada.
             */

            const icono = L.divIcon({
                className: "",
                html: '<div class="marcador-mapa"></div>',
                iconSize: [24, 24],
                iconAnchor: [12, 24]
            });

            marcadorBusqueda = L.marker(
                [lat, lon],
                {
                    icon: icono
                }
            ).addTo(mapa);

            /*
             * Centrar mapa.
             */

            mapa.setView(
                [lat, lon],
                17,
                {
                    animate: true
                }
            );

            /*
             * Mostrar ficha flotante.
             */

            if (ficha) {

                const titulo =
                    ficha.querySelector(
                        ".mesa-ficha-titulo strong"
                    );

                const direccion =
                    ficha.querySelector(
                        ".mesa-direccion"
                    );

                const localidad =
                    ficha.querySelector(
                        ".mesa-localidad"
                    );

                if (titulo) {
                    titulo.textContent = "UBICACIÓN";
                }

                /*
                 * Datos administrativos devueltos por Nominatim.
                 */
                const direccionCalle =
                    resultado.address?.road || texto;

                const altura =
                    resultado.address?.house_number || "";

                const localidadTexto =
                    resultado.address?.city ||
                    resultado.address?.town ||
                    resultado.address?.village ||
                    "";

                const partidoTexto =
                    resultado.address?.state_district ||
                    "";

                /*
                 * La altura ingresada por el usuario se conserva
                 * aunque Nominatim no devuelva house_number.
                 */
                let direccionMostrada = direccionCalle;

                if (
                    !altura &&
                    texto !== direccionCalle
                ) {
                    direccionMostrada = texto;
                } else if (altura) {
                    direccionMostrada =
                        direccionCalle + " " + altura;
                }

                if (direccion) {
                    direccion.textContent =
                        "Dirección: " +
                        direccionMostrada;
                }

                if (localidad) {
                    localidad.textContent =
                        "Localidad: " +
                        (localidadTexto || "No disponible") +
                        "\n" +
                        "Partido: " +
                        (partidoTexto || "No disponible");
                }

                ficha.style.setProperty(
                    "display",
                    "block",
                    "important"
                );
            }

            console.log(
                "Dirección encontrada:",
                resultado.display_name
            );

        } catch (error) {

            console.error(
                "Error buscando dirección:",
                error
            );

            alert(
                "No se pudo buscar la dirección.\n\n" +
                error.message
            );

        } finally {

            boton.disabled = false;

        }
    }

    boton.addEventListener(
        "click",
        buscarDireccion
    );

    input.addEventListener(
        "keydown",
        function (evento) {

            if (evento.key === "Enter") {
                evento.preventDefault();
                buscarDireccion();
            }

        }
    );

})();
