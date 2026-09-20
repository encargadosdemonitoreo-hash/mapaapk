// ============================================================
// BUSCADOR DE DIRECCIONES
// ============================================================

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

            // ====================================================
            // 1. BUSQUEDA PRINCIPAL — ARC GIS
            // ====================================================

            const consultaArcGIS = encodeURIComponent(
                texto + ", Buenos Aires"
            );

            const urlArcGIS =
                "https://geocode.arcgis.com/arcgis/rest/services/" +
                "World/GeocodeServer/findAddressCandidates" +
                "?f=json" +
                "&singleLine=" + consultaArcGIS +
                "&maxLocations=3";

            const respuestaArcGIS = await fetch(urlArcGIS, {
                headers: {
                    "Accept": "application/json"
                }
            });

            if (!respuestaArcGIS.ok) {
                throw new Error(
                    "Error HTTP ArcGIS " +
                    respuestaArcGIS.status
                );
            }

            const datosArcGIS = await respuestaArcGIS.json();

            if (
                !datosArcGIS.candidates ||
                !datosArcGIS.candidates.length
            ) {
                alert(
                    "No se encontró la dirección:\n\n" +
                    texto
                );
                return;
            }

            const candidato = datosArcGIS.candidates[0];

            const lat = parseFloat(
                candidato.location.y
            );

            const lon = parseFloat(
                candidato.location.x
            );

            if (
                !Number.isFinite(lat) ||
                !Number.isFinite(lon)
            ) {
                throw new Error(
                    "ArcGIS devolvió coordenadas inválidas."
                );
            }

            // ====================================================
            // 2. ALTURA ESCRITA POR EL USUARIO
            // ====================================================

            const coincidenciaAltura =
                texto.match(/\b(\d{1,6})\b/);

            const alturaIngresada =
                coincidenciaAltura
                    ? coincidenciaAltura[1]
                    : "";

            // ====================================================
            // 3. REVERSE GEOCODING — NOMINATIM
            // ====================================================

            let datosReverse = null;

            try {

                const urlReverse =
                    "https://nominatim.openstreetmap.org/reverse?" +
                    new URLSearchParams({
                        lat: lat,
                        lon: lon,
                        format: "json",
                        addressdetails: "1",
                        zoom: "18",
                        "accept-language": "es"
                    });

                const respuestaReverse =
                    await fetch(urlReverse, {
                        headers: {
                            "Accept": "application/json"
                        }
                    });

                if (respuestaReverse.ok) {
                    datosReverse =
                        await respuestaReverse.json();
                }

            } catch (errorReverse) {

                console.warn(
                    "Reverse geocoding no disponible:",
                    errorReverse
                );
            }

            // ====================================================
            // 4. DATOS DE LA DIRECCIÓN
            // ====================================================

            const direccionArcGIS =
                candidato.address ||
                texto;

            const direccionNominatim =
                datosReverse?.address || {};

            const calle =
                direccionNominatim.road ||
                direccionNominatim.pedestrian ||
                "";

            const altura =
                alturaIngresada ||
                direccionNominatim.house_number ||
                "";

            let direccionMostrada = "";

            if (calle && altura) {
                direccionMostrada =
                    calle + " " + altura;
            } else if (calle) {
                direccionMostrada =
                    calle;
            } else {
                direccionMostrada =
                    direccionArcGIS;
            }

            // ====================================================
            // 5. LOCALIDAD
            // ====================================================

            const localidad =
                direccionNominatim.city ||
                direccionNominatim.town ||
                direccionNominatim.village ||
                "";

            // ====================================================
            // 6. PARTIDO
            // ====================================================

            const partido =
                direccionNominatim.state_district ||
                "";

            // ====================================================
            // 7. ELIMINAR MARCADOR ANTERIOR
            // ====================================================

            if (marcadorBusqueda) {
                mapa.removeLayer(marcadorBusqueda);
            }

            // ====================================================
            // 8. CREAR MARCADOR
            // ====================================================

            const icono = L.divIcon({
                className: "",
                html:
                    '<div class="marcador-mapa"></div>',
                iconSize: [24, 24],
                iconAnchor: [12, 24]
            });

            marcadorBusqueda = L.marker(
                [lat, lon],
                {
                    icon: icono
                }
            ).addTo(mapa);

            // ====================================================
            // 9. CENTRAR MAPA
            // ====================================================

            mapa.setView(
                [lat, lon],
                17,
                {
                    animate: true
                }
            );

            // ====================================================
            // 10. ACTUALIZAR FICHA
            // ====================================================

            if (ficha) {

                const titulo =
                    ficha.querySelector(
                        ".mesa-ficha-titulo strong"
                    );

                const direccion =
                    ficha.querySelector(
                        ".mesa-direccion"
                    );

                const localidadElemento =
                    ficha.querySelector(
                        ".mesa-localidad"
                    );

                if (titulo) {
                    titulo.textContent =
                        "UBICACIÓN";
                }

                if (direccion) {
                    direccion.textContent =
                        "Dirección: " +
                        direccionMostrada;
                }

                if (localidadElemento) {

                    localidadElemento.innerHTML =
                        '<span class="dato-localidad">Localidad: ' +
                        (localidad || "No disponible") +
                        '</span>' +
                        '<br>' +
                        '<span class="dato-partido">Partido: ' +
                        (partido || "No disponible") +
                        '</span>';
                }

                if (typeof mostrarFichaNuevaBusqueda === "function") {
                    mostrarFichaNuevaBusqueda();
                } else {
                    ficha.style.setProperty(
                        "display",
                        "block",
                        "important"
                    );
                }
            }

            console.log(
                "Búsqueda ArcGIS:",
                {
                    textoIngresado: texto,
                    direccionArcGIS:
                        direccionArcGIS,
                    lat: lat,
                    lon: lon,
                    alturaIngresada:
                        alturaIngresada,
                    calleNominatim:
                        calle,
                    localidad:
                        localidad,
                    partido:
                        partido
                }
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
