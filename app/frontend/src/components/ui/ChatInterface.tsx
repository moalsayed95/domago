import { useState, useEffect } from "react";

interface Message {
    id: string;
    from: string;
    to: string;
    content: string;
    timestamp: Date;
}

interface ChatInterfaceProps {
    contact: {
        listingId: string;
        email: string;
    };
    onBack: () => void;
    initialMessage?: string;
}

export default function ChatInterface({ contact, onBack, initialMessage }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");

    useEffect(() => {
        if (initialMessage && messages.length === 0) {
            const message: Message = {
                id: Date.now().toString(),
                from: "user",
                to: contact.email,
                content: initialMessage,
                timestamp: new Date()
            };
            setMessages([message]);
        }
    }, [initialMessage, contact.email]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const message: Message = {
            id: Date.now().toString(),
            from: "user",
            to: contact.email,
            content: newMessage,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, message]);
        setNewMessage("");
    };

    return (
        <div className="flex h-full flex-col">
            <div className="border-b p-4">
                <button onClick={onBack} className="mb-2 text-blue-500 hover:text-blue-600">
                    ← Back to Messages
                </button>
                <h2 className="text-lg font-semibold">Chat with listing owner</h2>
                <p className="text-sm text-gray-500">{contact.email}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {messages.map(message => (
                    <div key={message.id} className={`mb-4 flex ${message.from === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`rounded-lg p-3 ${message.from === "user" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-900"}`}>
                            {message.content}
                        </div>
                    </div>
                ))}
            </div>

            <form onSubmit={handleSendMessage} className="border-t p-4">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 rounded-lg border p-2"
                    />
                    <button type="submit" className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
                        Send
                    </button>
                </div>
            </form>
        </div>
    );
}
