import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import isEqual from "lodash.isequal";

import useRealTime from "@/hooks/useRealtime";
import useAudioRecorder from "@/hooks/useAudioRecorder";
import useAudioPlayer from "@/hooks/useAudioPlayer";
import { Listing } from "./types";

import logo from "./assets/logo.svg";
import ListingCard from "./components/ui/ListingCard";
import MapView from "./components/ui/MapView";
import StatusMessage from "@/components/ui/status-message";
import { Mic, MicOff } from "lucide-react";

function App() {
    const { t } = useTranslation();
    const [isRecording, setIsRecording] = useState(false);
    const [listings, setListings] = useState<Listing[]>([]);
    const [highlightedListingId, setHighlightedListingId] = useState<string | null>(null);
    const [zoomDelta, setZoomDelta] = useState<number>(0);

    // Favorites + Page
    const [favorites, setFavorites] = useState<string[]>([]);
    const [page, setPage] = useState<"main" | "favorites">("main");

    const { startSession, addUserAudio, inputAudioBufferClear } = useRealTime({
        onWebSocketOpen: () => console.log("WebSocket connection opened"),
        onWebSocketClose: () => console.log("WebSocket connection closed"),
        onWebSocketError: event => console.error("WebSocket error:", event),
        onReceivedError: message => console.error("error", message),
        onReceivedResponseAudioDelta: message => {
            isRecording && playAudio(message.delta);
        },
        onReceivedInputAudioBufferSpeechStarted: () => {
            stopAudioPlayer();
        },
        onReceivedExtensionMiddleTierToolResponse: message => {
            console.log("Received tool response", message);
            const result = JSON.parse(message.tool_result);

            // If we have new listings, update them
            if (result.listings) {
                const newListings = result.listings;
                if (!isEqual(listings, newListings)) {
                    setListings(newListings);
                    // Highlight first listing by default
                    if (newListings.length > 0) {
                        setHighlightedListingId(newListings[0].id);
                    } else {
                        setHighlightedListingId(null);
                    }
                }
            } else if (typeof result.id === "string") {
                // Highlight the listing
                setHighlightedListingId(result.id);
            } else if (typeof result.zoom === "number") {
                setZoomDelta(result.zoom);
            } else if (typeof result.favorite_id === "string") {
                // Add or remove from favorites
                setFavorites(prev => {
                    if (prev.includes(result.favorite_id)) {
                        return prev.filter(item => item !== result.favorite_id);
                    }
                    return [...prev, result.favorite_id];
                });
            } else if (typeof result.navigate_to === "string") {
                const destination = result.navigate_to as "main" | "favorites";
                setPage(destination);
            }
        }
    });

    const { reset: resetAudioPlayer, play: playAudio, stop: stopAudioPlayer } = useAudioPlayer();
    const { start: startAudioRecording, stop: stopAudioRecording } = useAudioRecorder({ onAudioRecorded: addUserAudio });

    const onToggleListening = async () => {
        if (!isRecording) {
            startSession();
            await startAudioRecording();
            resetAudioPlayer();
            setIsRecording(true);
        } else {
            await stopAudioRecording();
            stopAudioPlayer();
            inputAudioBufferClear();
            setIsRecording(false);
        }
    };

    // Whenever the page changes (manually or via AI), reset zoomDelta so the map doesn't keep zooming
    useEffect(() => {
        setZoomDelta(0);
    }, [page]);

    // If no listings, default to Vienna center
    const defaultCenter: [number, number] = [16.3738, 48.2082];
    const mapCenter: [number, number] = listings.length > 0 ? [listings[0].lng, listings[0].lat] : defaultCenter;

    // Which listings to display
    const displayedListings = page === "favorites" ? listings.filter(l => favorites.includes(l.id)) : listings;

    return (
        <div className="flex min-h-screen flex-col bg-background text-foreground transition-colors dark:bg-foreground dark:text-background">
            {/* Fixed Header */}
            <header className="sticky top-0 z-50 border-b bg-white py-3 dark:bg-gray-900">
                <div className="container mx-auto flex flex-wrap items-center justify-between px-4">
                    {/* Logo + Title */}
                    <div className="flex items-center gap-3">
                        <img src={logo} alt="Azure logo" className="h-10 w-10" />
                        <h1 className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-xl font-extrabold text-transparent sm:text-3xl">
                            {t("app.title")}
                        </h1>
                    </div>
                    {/* Recording Section */}
                    <div className="flex items-center gap-4">
                        <StatusMessage isRecording={isRecording} />
                        <button
                            onClick={onToggleListening}
                            className={`record-button ${isRecording ? "recording" : ""}`}
                            aria-label={isRecording ? t("app.stopRecording") : t("app.startRecording")}
                        >
                            {isRecording ? <Mic className="icon" /> : <MicOff className="icon" />}
                        </button>
                    </div>
                </div>
                {/* Tabs for switching between Available Listings and Favorites */}
                <div className="border-t bg-gray-50 dark:bg-gray-800">
                    <div className="container mx-auto flex gap-4 px-4 py-2">
                        <button
                            onClick={() => setPage("main")}
                            className={`px-4 py-2 font-semibold transition-colors ${
                                page === "main" ? "bg-white text-purple-600 dark:bg-gray-900" : "text-gray-600 hover:text-purple-600 dark:text-gray-300"
                            } rounded shadow-sm`}
                        >
                            {t("Available Listings")}
                        </button>
                        <button
                            onClick={() => setPage("favorites")}
                            className={`px-4 py-2 font-semibold transition-colors ${
                                page === "favorites" ? "bg-white text-pink-600 dark:bg-gray-900" : "text-gray-600 hover:text-pink-600 dark:text-gray-300"
                            } rounded shadow-sm`}
                        >
                            {t("Your Favorites")}
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex flex-grow flex-row justify-center">
                <div className="container mx-auto flex flex-row">
                    {/* Listings Section */}
                    <div className="w-1/2 overflow-y-auto p-4">
                        {displayedListings.length > 0 ? (
                            <div className="flex flex-wrap justify-center gap-4">
                                {displayedListings.map(l => (
                                    <ListingCard key={l.id} listing={l} highlight={highlightedListingId === l.id} isFavorite={favorites.includes(l.id)} />
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-lg">{page === "favorites" ? t("No favorites yet.") : t("No listings found.")}</p>
                        )}
                    </div>

                    {/* Map Section */}
                    <div className="w-1/2 p-4">
                        <div className="flex w-full items-stretch overflow-hidden rounded-lg">
                            <MapView listings={displayedListings} center={mapCenter} highlightedListingId={highlightedListingId} zoomDelta={zoomDelta} />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default App;
