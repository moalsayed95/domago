import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
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

function App() {
    const [isRecording, setIsRecording] = useState(false);
    const [listings, setListings] = useState<Listing[]>([]);
    const [darkMode, setDarkMode] = useState(() => {
        return localStorage.getItem("theme") === "dark";
    });
    const [highlightedListingId, setHighlightedListingId] = useState<string | null>(null);

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

            // If we have new listings, update them and highlight the first one
            if (result.listings) {
                const newListings = result.listings;
                if (!isEqual(listings, newListings)) {
                    setListings(newListings);
                    // Highlight the first listing by default
                    if (newListings.length > 0) {
                        setHighlightedListingId(newListings[0].id);
                    } else {
                        setHighlightedListingId(null);
                    }
                }
            } else if (result.id) {
                // If we only received an id, change highlight to that listing
                setHighlightedListingId(result.id);
            }
        }
    });

    const { reset: resetAudioPlayer, play: playAudio, stop: stopAudioPlayer } = useAudioPlayer();
    const { start: startAudioRecording, stop: stopAudioRecording } = useAudioRecorder({ onAudioRecorded: addUserAudio });

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
    }, [darkMode]);

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

    const toggleDarkMode = () => setDarkMode(!darkMode);

    const { t } = useTranslation();

    const defaultCenter: [number, number] = [16.3738, 48.2082]; // Coordinates of Vienna
    const mapCenter: [number, number] = listings.length > 0 ? [listings[0].lng, listings[0].lat] : defaultCenter;

    return (
        <div className="flex min-h-screen flex-col bg-background text-foreground transition-colors dark:bg-foreground dark:text-background">
            <header className="w-full border-b bg-white py-4 transition-colors dark:bg-gray-900">
                <div className="container mx-auto flex flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <img src={logo} alt="Azure logo" className="h-12 w-12" />
                        <h1 className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-center text-3xl font-bold text-transparent sm:text-left md:text-5xl">
                            {t("app.title")}
                        </h1>
                    </div>
                    <button onClick={toggleDarkMode} aria-label="Toggle Dark Mode" className="rounded-full bg-gray-200 p-2 transition-colors dark:bg-gray-700">
                        {darkMode ? <Sun className="text-yellow-400" /> : <Moon className="text-gray-800 dark:text-gray-300" />}
                    </button>
                </div>
            </header>

            <main className="flex flex-grow flex-col">
                <div className="container mx-auto flex flex-col items-center justify-center px-4">
                    <div className="mb-8 flex w-full">
                        <div className="flex w-1/2 flex-col items-center justify-center space-y-5">
                            <div
                                className={`record-button ${isRecording ? "recording" : ""}`}
                                onClick={onToggleListening}
                                aria-label={isRecording ? t("app.stopRecording") : t("app.startRecording")}
                            ></div>
                            <StatusMessage isRecording={isRecording} />
                        </div>
                        <div className="mt-5 w-1/2">
                            <div className="overflow-hidden rounded-lg">
                                <MapView listings={listings} center={mapCenter} highlightedListingId={highlightedListingId} />
                            </div>
                        </div>
                    </div>

                    {listings.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-4">
                            {listings.map(l => (
                                <ListingCard key={l.id} listing={l} highlight={highlightedListingId === l.id} />
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default App;
