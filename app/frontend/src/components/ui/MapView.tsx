// C:\Users\moalsayed\workspace\ai-tour\aisearch-openai-rag-audio\app\frontend\src\components\ui\MapView.tsx

import { useEffect, useRef } from "react";
import * as atlas from "azure-maps-control";
import { Listing } from "@/types";

type MapProps = {
    listings: Listing[];
    center: [number, number];
};

export default function MapView({ listings, center }: MapProps) {
    const mapRef = useRef<atlas.Map | null>(null);
    const dataSourceRef = useRef<atlas.source.DataSource | null>(null);
    const mapContainerRef = useRef<HTMLDivElement | null>(null);

    // Initialize the map only once
    useEffect(() => {
        if (!mapContainerRef.current) return;

        const map = new atlas.Map(mapContainerRef.current, {
            center,
            zoom: 12,
            view: "Auto",
            disableTelemetry: true,
            authOptions: {
                authType: atlas.AuthenticationType.subscriptionKey,
                subscriptionKey: import.meta.env.VITE_AZURE_MAPS_SUBSCRIPTION_KEY
            }
        });

        // Handle missing style images by logging or fallback
        map.events.add("styleimagemissing", e => {
            console.warn(`Image "${e}" is missing. Using default marker.`);
        });

        map.events.add("ready", () => {
            // Create a single data source once
            const datasource = new atlas.source.DataSource();
            map.sources.add(datasource);
            dataSourceRef.current = datasource;

            // Create symbol layer with a default built-in icon
            const symbolLayer = new atlas.layer.SymbolLayer(datasource, undefined, {
                iconOptions: {
                    image: "marker-blue",
                    allowOverlap: true
                }
            });
            map.layers.add(symbolLayer);

            // Add initial listings if any
            listings.forEach(l => {
                const feature = new atlas.data.Feature(new atlas.data.Point([l.lng, l.lat]), { title: l.title });
                datasource.add(feature);
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
    }, []); // Empty dependency array so this runs only once

    // Update data source when listings change
    useEffect(() => {
        const map = mapRef.current;
        const datasource = dataSourceRef.current;

        if (map && datasource) {
            // Clear previous features and add the updated listings
            datasource.clear();
            listings.forEach(l => {
                const feature = new atlas.data.Feature(new atlas.data.Point([l.lng, l.lat]), { title: l.title });
                datasource.add(feature);
            });

            // Optionally, re-center the map if needed, but only if listings changed
            // map.setCamera({ center });
        }
    }, [listings, center]);

    return <div ref={mapContainerRef} style={{ width: "100%", height: "400px" }} />;
}
