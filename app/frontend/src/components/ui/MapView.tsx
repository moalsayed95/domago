import { useEffect, useRef } from "react";
import * as atlas from "azure-maps-control";
import { Listing } from "@/types";

type MapProps = {
    listings: (Listing & { isBest?: boolean })[];
    center: [number, number];
};

export default function MapView({ listings, center }: MapProps) {
    const mapRef = useRef<atlas.Map | null>(null);
    const dataSourceRef = useRef<atlas.source.DataSource | null>(null);
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

            // Create custom icons with desired colors
            Promise.all([
                map.imageSprite.createFromTemplate("marker-purple", "marker", "#ff00c8", "#FFFFFF"),
                map.imageSprite.createFromTemplate("marker-blue", "marker", "#0000FF", "#FFFFFF")
            ]).then(() => {
                // Create a symbol layer using the custom icons
                const symbolLayer = new atlas.layer.SymbolLayer(datasource, undefined, {
                    iconOptions: {
                        image: ["case", ["==", ["get", "isBest"], true], "marker-purple", "marker-blue"],
                        allowOverlap: true
                    }
                });
                map.layers.add(symbolLayer);

                // Add initial listings
                listings.forEach(l => {
                    const feature = new atlas.data.Feature(new atlas.data.Point([l.lng, l.lat]), { title: l.title, isBest: !!l.isBest });
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

    useEffect(() => {
        const map = mapRef.current;
        const datasource = dataSourceRef.current;

        if (map && datasource) {
            datasource.clear();
            listings.forEach(l => {
                const feature = new atlas.data.Feature(new atlas.data.Point([l.lng, l.lat]), { title: l.title, isBest: !!l.isBest });
                datasource.add(feature);
            });
        }
    }, [listings, center]);

    return <div ref={mapContainerRef} style={{ width: "100%", height: "500px" }} />;
}
