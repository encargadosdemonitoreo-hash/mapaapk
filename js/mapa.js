/* ============================================================
   MAPA REAL
   ============================================================ */

(function() {

    function iniciarMapaReal() {

        const contenedor = document.getElementById("mapa");

        if (!contenedor) {
            console.error("No existe #mapa");
            return;
        }

        if (typeof L === "undefined") {
            console.error("Leaflet no pudo cargarse");
            return;
        }

        if (window._mapaReal) {
            setTimeout(function() {
                window._mapaReal.invalidateSize();
            }, 200);
            return;
        }

        /*
         * Centro inicial:
         * Lomas de Zamora / zona sur.
         * Después lo reemplazamos por la posición real.
         */

        const mapa = L.map(contenedor, {
            zoomControl: true,
            attributionControl: true
        }).setView([-34.761, -58.405], 14);

        window._mapaReal = mapa;

        /*
         * OpenStreetMap
         */

        L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
                maxZoom: 19,
                attribution: '&copy; OpenStreetMap contributors'
            }
        ).addTo(mapa);

        /*
         * Permitir desplazamiento y zoom.
         */

        mapa.dragging.enable();
        mapa.scrollWheelZoom.enable();
        mapa.doubleClickZoom.enable();
        mapa.touchZoom.enable();
        mapa.boxZoom.enable();
        mapa.keyboard.enable();

        /*
         * Ajuste inicial después de renderizar.
         */

        setTimeout(function() {
            mapa.invalidateSize(true);
        }, 300);

        window.addEventListener("resize", function() {
            setTimeout(function() {
                mapa.invalidateSize(true);
            }, 100);
        });

        console.log("Mapa real iniciado correctamente");
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            iniciarMapaReal
        );
    } else {
        iniciarMapaReal();
    }

})();
