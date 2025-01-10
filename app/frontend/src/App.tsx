import { useState, useEffect, useRef } from "react";
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
import { Mic, MicOff, Home, Heart, MessageCircle } from "lucide-react";
import UserPreferences from "./components/ui/UserPreferences";
import Messages from "./components/ui/Messages";

interface Preferences {
    budget?: {
        min: number;
        max: number;
    };
    size?: {
        min: number;
        max: number;
    };
    rooms?: number;
    location?: string;
    features?: string[];
}

function App() {
    const { t } = useTranslation();
    const [isRecording, setIsRecording] = useState(false);
    const [listings, setListings] = useState<Listing[]>([]);
    const [highlightedListingId, setHighlightedListingId] = useState<string | null>(null);
    const [zoomDelta, setZoomDelta] = useState<number>(0);

    // Favorites + Page
    const [favorites, setFavorites] = useState<string[]>([]);
    const [page, setPage] = useState<"main" | "favorites" | "messages">("main");

    const [activeContact, setActiveContact] = useState<
        | {
              listingId: string;
              email: string;
              lastMessage?: string;
              timestamp?: Date;
          }
        | undefined
    >();

    const [preferences, setPreferences] = useState<Preferences | undefined>();

    const listingsContainerRef = useRef<HTMLDivElement>(null);

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

            if (result.action === "update_preferences") {
                setPreferences(prev => ({
                    ...prev,
                    ...result.preferences,
                    // Special handling for nested objects
                    budget: result.preferences.budget
                        ? {
                              ...prev?.budget,
                              ...result.preferences.budget
                          }
                        : prev?.budget,
                    size: result.preferences.size
                        ? {
                              ...prev?.size,
                              ...result.preferences.size
                          }
                        : prev?.size,
                    // Special handling for arrays
                    features: result.preferences.features ? [...new Set([...(prev?.features || []), ...result.preferences.features])] : prev?.features
                }));
            } else if (result.listings) {
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
            } else if (result.action === "send_message") {
                setActiveContact({
                    listingId: result.listing_id,
                    email: result.contact,
                    timestamp: new Date()
                });
                setPage("messages");
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

    useEffect(() => {
        if (highlightedListingId && listingsContainerRef.current) {
            const container = listingsContainerRef.current;
            const highlightedCard = container.querySelector(`[data-listing-id="${highlightedListingId}"]`);

            if (highlightedCard) {
                highlightedCard.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                    inline: "center"
                });
            }
        }
    }, [highlightedListingId]);

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
                    <div className="container mx-auto px-4">
                        <div className="flex space-x-8">
                            <button
                                onClick={() => setPage("main")}
                                className={`group inline-flex items-center border-b py-4 text-sm font-medium transition-colors ${
                                    page === "main"
                                        ? "border-purple-600 text-purple-600 dark:border-purple-500 dark:text-purple-500"
                                        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                }`}
                            >
                                <Home
                                    className={`mr-2 h-5 w-5 ${
                                        page === "main"
                                            ? "text-purple-600 dark:text-purple-500"
                                            : "text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300"
                                    }`}
                                />
                                {t("Available Listings")}
                            </button>

                            <button
                                onClick={() => setPage("favorites")}
                                className={`group inline-flex items-center border-b py-4 text-sm font-medium transition-colors ${
                                    page === "favorites"
                                        ? "border-pink-600 text-pink-600 dark:border-pink-500 dark:text-pink-500"
                                        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                }`}
                            >
                                <Heart
                                    className={`mr-2 h-5 w-5 ${
                                        page === "favorites"
                                            ? "text-pink-600 dark:text-pink-500"
                                            : "text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300"
                                    }`}
                                />
                                {t("Your Favorites")}
                            </button>

                            <button
                                onClick={() => setPage("messages")}
                                className={`group inline-flex items-center border-b py-4 text-sm font-medium transition-colors ${
                                    page === "messages"
                                        ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500"
                                        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                }`}
                            >
                                <MessageCircle
                                    className={`mr-2 h-5 w-5 ${
                                        page === "messages"
                                            ? "text-blue-600 dark:text-blue-500"
                                            : "text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300"
                                    }`}
                                />
                                {t("Messages")}
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content - Updated Layout */}
            <main className="flex flex-grow flex-col">
                {page === "messages" ? (
                    <div className="container mx-auto h-[calc(100vh-200px)] p-4">
                        <Messages activeContact={activeContact} />
                    </div>
                ) : (
                    <div className="container mx-auto flex flex-row gap-4 p-4">
                        {/* User Preferences Section */}
                        <div className="w-1/4">
                            <UserPreferences preferences={preferences} />
                        </div>

                        {/* Map Section - Now wider */}
                        <div className="w-3/4">
                            <div className="h-[500px] w-full overflow-hidden rounded-lg">
                                <MapView listings={displayedListings} center={mapCenter} highlightedListingId={highlightedListingId} zoomDelta={zoomDelta} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Listings Section - Now below the map */}
                {page !== "messages" && (
                    <div className="container mx-auto p-4">
                        {displayedListings.length > 0 ? (
                            <div
                                ref={listingsContainerRef}
                                className="flex gap-4 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                            >
                                {displayedListings.map(l => (
                                    <div key={l.id} className="w-[400px] flex-none" data-listing-id={l.id}>
                                        <ListingCard listing={l} highlight={highlightedListingId === l.id} isFavorite={favorites.includes(l.id)} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-lg">{page === "favorites" ? t("No favorites yet.") : t("No listings found.")}</p>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

export default App;
