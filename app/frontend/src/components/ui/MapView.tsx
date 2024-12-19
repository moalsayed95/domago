import { useEffect, useRef } from "react";
import * as atlas from "azure-maps-control";
import { Listing } from "@/types";

type MapProps = {
    listings: Listing[];
    center: [number, number];
    highlightedListingId: string | null;
};

export default function MapView({ listings, center, highlightedListingId }: MapProps) {
    const mapRef = useRef<atlas.Map | null>(null);
    const dataSourceRef = useRef<atlas.source.DataSource | null>(null);
    const symbolLayerRef = useRef<atlas.layer.SymbolLayer | null>(null);
    const mapContainerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!mapContainerRef.current) return;

        const map = new atlas.Map(mapContainerRef.current, {
            center,
            zoom: 12,
            view: "Auto",
            disableTelemetry: true,
            showFeedbackLink: false,
            showLogo: false,
            authOptions: {
                authType: atlas.AuthenticationType.subscriptionKey,
                subscriptionKey: import.meta.env.VITE_AZURE_MAPS_SUBSCRIPTION_KEY
            }
        });

        map.events.add("ready", () => {
            const datasource = new atlas.source.DataSource();
            map.sources.add(datasource);
            dataSourceRef.current = datasource;

            // Create a custom icon for the highlighted listing
            // This will be a pink-purple marker.
            Promise.all([
                map.imageSprite.createFromTemplate("marker-purple", "marker", "#ff00c8", "#FFFFFF"),
                map.imageSprite.createFromTemplate("marker-blue", "marker", "#0000FF", "#FFFFFF"),
                map.imageSprite.createFromTemplate("marker-highlighted", "marker", "#ff00c8", "#FFFFFF")
            ]).then(() => {
                // Create a symbol layer using the custom icons
                // We use a case expression: if id == highlightedListingId, use marker-highlighted, else marker-blue
                const symbolLayer = new atlas.layer.SymbolLayer(datasource, undefined, {
                    iconOptions: {
                        // We will check if the listing's id matches highlightedListingId
                        // If it does, use "marker-highlighted", else "marker-blue"
                        image: ["case", ["==", ["get", "id"], highlightedListingId || ""], "marker-highlighted", "marker-blue"],
                        allowOverlap: true
                    }
                });
                map.layers.add(symbolLayer);
                symbolLayerRef.current = symbolLayer;

                // Add initial listings
                listings.forEach(l => {
                    const feature = new atlas.data.Feature(new atlas.data.Point([l.lng, l.lat]), { id: l.id, title: l.title });
                    datasource.add(feature);
                });
            });
        });

        mapRef.current = map;

        return () => {
            if (mapRef.current) {
                try {
                    mapRef.current.dispose();
                } catch (err) {
                    console.error("Error disposing map:", err);
                }
                mapRef.current = null;
            }
        };
    }, []);

    // Update listings and highlighted marker when they change
    useEffect(() => {
        const map = mapRef.current;
        const datasource = dataSourceRef.current;

        if (map && datasource) {
            datasource.clear();
            listings.forEach(l => {
                const feature = new atlas.data.Feature(new atlas.data.Point([l.lng, l.lat]), { id: l.id, title: l.title });
                datasource.add(feature);
            });
        }
    }, [listings]);

    // Update highlighted marker icon condition
    useEffect(() => {
        const map = mapRef.current;
        const symbolLayer = symbolLayerRef.current;

        if (map && symbolLayer) {
            symbolLayer.setOptions({
                iconOptions: {
                    image: ["case", ["==", ["get", "id"], highlightedListingId || ""], "marker-highlighted", "marker-blue"],
                    allowOverlap: true
                }
            });
        }
    }, [highlightedListingId]);

    // Zoom to the highlighted listing
    useEffect(() => {
        const map = mapRef.current;
        if (map && highlightedListingId && listings.length > 0) {
            const targetListing = listings.find(l => l.id === highlightedListingId);
            if (targetListing) {
                map.setCamera({
                    center: [targetListing.lng, targetListing.lat],
                    zoom: 14,
                    type: "ease",
                    duration: 1000
                });
            }
        }
    }, [highlightedListingId, listings]);

    return <div ref={mapContainerRef} style={{ width: "100%", height: "500px" }} />;
}
