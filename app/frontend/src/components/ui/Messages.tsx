import { useState } from "react";
import ChatInterface from "./ChatInterface";

interface Contact {
    listingId: string;
    email: string;
    lastMessage?: string;
    timestamp?: Date;
    initialMessage?: string;
}

interface MessagesProps {
    activeContact?: Contact;
}

export default function Messages({ activeContact }: MessagesProps) {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

    // When we receive a new activeContact, add it to our contacts list if it's not already there
    if (activeContact && !contacts.some(c => c.listingId === activeContact.listingId)) {
        setContacts(prev => [...prev, activeContact]);
        // If there's an initial message, automatically select this contact
        if (activeContact.initialMessage) {
            setSelectedContact(activeContact);
        }
    }

    if (selectedContact) {
        return <ChatInterface contact={selectedContact} onBack={() => setSelectedContact(null)} initialMessage={selectedContact.initialMessage} />;
    }

    return (
        <div className="flex h-full flex-col">
            <div className="border-b p-4">
                <h2 className="text-lg font-semibold">Messages</h2>
                <p className="text-sm text-gray-500">Your conversations with listing owners</p>
            </div>

            <div className="flex-1 overflow-y-auto">
                {contacts.length > 0 ? (
                    <div className="divide-y">
                        {contacts.map(contact => (
                            <button
                                key={contact.listingId}
                                onClick={() => setSelectedContact(contact)}
                                className="w-full p-4 text-left transition-colors hover:bg-gray-50"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-medium">Listing #{contact.listingId}</h3>
                                        <p className="text-sm text-gray-500">{contact.email}</p>
                                        {contact.lastMessage && <p className="mt-1 text-sm text-gray-600">{contact.lastMessage}</p>}
                                    </div>
                                    {contact.timestamp && <span className="text-xs text-gray-400">{contact.timestamp.toLocaleDateString()}</span>}
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="flex h-full items-center justify-center">
                        <p className="text-gray-500">No conversations yet</p>
                    </div>
                )}
            </div>
        </div>
    );
}
