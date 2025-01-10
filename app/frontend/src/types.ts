export type SessionUpdateCommand = {
    type: "session.update";
    session: {
        turn_detection?: {
            type: "server_vad" | "none";
        };
        input_audio_transcription?: {
            model: "whisper-1";
        };
    };
};

export type InputAudioBufferAppendCommand = {
    type: "input_audio_buffer.append";
    audio: string;
};

export type InputAudioBufferClearCommand = {
    type: "input_audio_buffer.clear";
};

export type Message = {
    type: string;
};

export type ResponseAudioDelta = {
    type: "response.audio.delta";
    delta: string;
};

export type ResponseAudioTranscriptDelta = {
    type: "response.audio_transcript.delta";
    delta: string;
};

export type ResponseInputAudioTranscriptionCompleted = {
    type: "conversation.item.input_audio_transcription.completed";
    event_id: string;
    item_id: string;
    content_index: number;
    transcript: string;
};

export type ResponseDone = {
    type: "response.done";
    event_id: string;
    response: {
        id: string;
        output: { id: string; content?: { transcript: string; type: string }[] }[];
    };
};

export type ExtensionMiddleTierToolResponse = {
    type: "extension.middle_tier_tool.response";
    previous_item_id: string;
    tool_name: string;
    tool_result: string; // JSON string that needs to be parsed into ToolResult
};

export type Listing = {
    id: string;
    title: string;
    description: string;
    location: string;
    contact: string;
    price: number;
    rooms: number;
    size: number;
    floor: number;
    availability: string;
    lat: number;
    lng: number;
};

export interface PreferenceFeature {
    id: string;
    label: string;
    icon: string; // Lucide icon name
    enabled: boolean;
}

export interface Preferences {
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
    features: PreferenceFeature[];
}

// Predefined features
export const AVAILABLE_FEATURES: PreferenceFeature[] = [
    { id: "balcony", label: "Balcony", icon: "Sun", enabled: false },
    { id: "parking", label: "Parking", icon: "Car", enabled: false },
    { id: "elevator", label: "Elevator", icon: "ArrowUpDown", enabled: false },
    { id: "furnished", label: "Furnished", icon: "Sofa", enabled: false },
    { id: "pets", label: "Pet Friendly", icon: "Dog", enabled: false },
    { id: "garden", label: "Garden", icon: "Flower", enabled: false },
    { id: "storage", label: "Storage Room", icon: "Package", enabled: false },
    { id: "laundry", label: "Laundry Room", icon: "Washing", enabled: false }
];
