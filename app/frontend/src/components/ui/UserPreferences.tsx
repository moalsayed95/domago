import { Card, CardHeader, CardTitle, CardContent } from "./card";
import { Home, MapPin, Euro, Bed } from "lucide-react";

export default function UserPreferences() {
    // This would typically be connected to your state management
    // These are example preferences - you would need to implement the actual state management
    const preferences = {
        location: "City Center",
        priceRange: "€1,000 - €2,000",
        rooms: "2 bedrooms",
        features: ["Balcony", "Modern Kitchen"]
    };

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="text-xl">Your Preferences</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-purple-500" />
                        <div>
                            <p className="font-semibold">Desired Location</p>
                            <p className="text-sm text-gray-600">{preferences.location}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Euro className="h-5 w-5 text-purple-500" />
                        <div>
                            <p className="font-semibold">Price Range</p>
                            <p className="text-sm text-gray-600">{preferences.priceRange}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Bed className="h-5 w-5 text-purple-500" />
                        <div>
                            <p className="font-semibold">Room Requirements</p>
                            <p className="text-sm text-gray-600">{preferences.rooms}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Home className="h-5 w-5 text-purple-500" />
                        <div>
                            <p className="font-semibold">Desired Features</p>
                            <div className="mt-1 flex flex-wrap gap-2">
                                {preferences.features.map(feature => (
                                    <span key={feature} className="rounded-full bg-purple-100 px-3 py-1 text-xs text-purple-700">
                                        {feature}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
