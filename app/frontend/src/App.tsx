import { useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { useTranslation } from "react-i18next";

import StatusMessage from "@/components/ui/status-message";
import useRealTime from "@/hooks/useRealtime";
import useAudioRecorder from "@/hooks/useAudioRecorder";
import useAudioPlayer from "@/hooks/useAudioPlayer";
import { Listing } from "./types";
import isEqual from "lodash.isequal";
import logo from "./assets/logo.svg";
import ListingCard from "./components/ui/ListingCard";
import MapView from "./components/ui/MapView";

function App() {
    const [isRecording, setIsRecording] = useState(false);
    const [listings, setListings] = useState<Listing[]>([]);

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
            const result = JSON.parse(message.tool_result);
            const newListings = result.listings || [];
            if (!isEqual(listings, newListings)) {
                setListings(newListings);
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

    const { t } = useTranslation();
    const mapCenter: [number, number] = listings.length > 0 ? [listings[0].lng, listings[0].lat] : [16.3738, 48.2082];

    // Mark the first listing as the "best"
    const enhancedListings = listings.map((l, idx) => ({
        ...l,
        isBest: idx === 0
    }));

    return (
        <div className="flex min-h-screen flex-col bg-gray-100 text-gray-900">
            {/* Header Section */}
            <header className="w-full border-b bg-white py-4">
                <div className="container mx-auto flex flex-col items-center gap-4 px-4 sm:flex-row sm:items-center sm:justify-start">
                    <img src={logo} alt="Azure logo" className="h-16 w-16" />
                    <h1 className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-center text-3xl font-bold text-transparent sm:text-left md:text-5xl">
                        {t("app.title")}
                    </h1>
                </div>
            </header>

            <main className="flex flex-grow flex-col">
                <div className="container mx-auto flex flex-col items-center justify-center px-4 py-8">
                    {/* Recording Section */}
                    <div className="mb-8 flex flex-col items-center justify-center">
                        <div
                            className={`record-button ${isRecording ? "recording" : ""}`}
                            onClick={onToggleListening}
                            aria-label={isRecording ? t("app.stopRecording") : t("app.startRecording")}
                        >
                            {isRecording ? <MicOff className="icon" /> : <Mic className="icon" />}
                        </div>
                        <StatusMessage isRecording={isRecording} />
                    </div>

                    {/* Map Section */}
                    {enhancedListings.length > 0 && (
                        <div className="mb-8 w-full">
                            <MapView listings={enhancedListings} center={mapCenter} />
                        </div>
                    )}

                    {/* Listings Section */}
                    {enhancedListings.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-4">
                            {enhancedListings.map((l, idx) => (
                                <ListingCard key={idx} listing={l} isBest={l.isBest} />
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <footer className="w-full border-t bg-white py-4">
                <div className="container mx-auto px-4 text-center">
                    <p>{t("app.footer")}</p>
                </div>
            </footer>
        </div>
    );
}

export default App;
