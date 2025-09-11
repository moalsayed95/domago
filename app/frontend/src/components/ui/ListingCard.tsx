import { Listing } from "@/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./card";
import { Home, Bed, Ruler, Calendar, Phone, Euro, MapPin, Heart } from "lucide-react";

interface ListingCardProps {
    listing: Listing;
    highlight?: boolean;
    isFavorite?: boolean;
}

export default function ListingCard({ listing, highlight = false, isFavorite = false }: ListingCardProps) {
    const getAvailabilityColor = (availability: string) => {
        if (availability.toLowerCase() === 'available') return 'text-green-600 bg-green-50';
        if (availability.toLowerCase() === 'pending') return 'text-orange-600 bg-orange-50';
        return 'text-red-600 bg-red-50';
    };

    return (
        <Card className={`mx-4 my-2 w-full max-w-lg overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-white rounded-xl ${highlight ? "ring-2 ring-purple-500 ring-opacity-50" : ""}`}>
            <CardHeader className="p-6 pb-4">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <CardTitle className="text-xl font-bold text-gray-900 mb-2 leading-tight pr-4">{listing.title}</CardTitle>
                        <CardDescription className="flex items-center text-gray-600 text-sm">
                            <MapPin className="mr-1 h-4 w-4 text-gray-500" />
                            {listing.location}
                        </CardDescription>
                    </div>
                    <Heart 
                        className={`h-6 w-6 cursor-pointer transition-all duration-200 hover:scale-110 ${
                            isFavorite 
                                ? "fill-current text-pink-500 hover:text-pink-600" 
                                : "text-gray-400 hover:text-pink-400"
                        }`} 
                    />
                </div>
            </CardHeader>
            <CardContent className="px-6 pb-4">
                {/* Price Emphasis */}
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="flex items-center justify-center">
                        <Euro className="h-5 w-5 text-blue-600 mr-2" />
                        <span className="text-2xl font-bold text-blue-700">€{listing.price.toLocaleString()}</span>
                        <span className="text-sm text-blue-600 ml-1">/month</span>
                    </div>
                </div>

                {/* Property Details Grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center space-x-2 p-2 rounded-md bg-gray-50">
                        <Bed className="h-4 w-4 text-indigo-600" />
                        <span className="text-gray-700 font-medium">{listing.rooms} rooms</span>
                    </div>
                    <div className="flex items-center space-x-2 p-2 rounded-md bg-gray-50">
                        <Ruler className="h-4 w-4 text-indigo-600" />
                        <span className="text-gray-700 font-medium">{listing.size} m²</span>
                    </div>
                    <div className="flex items-center space-x-2 p-2 rounded-md bg-gray-50">
                        <Home className="h-4 w-4 text-indigo-600" />
                        <span className="text-gray-700 font-medium">Floor {listing.floor}</span>
                    </div>
                    <div className="flex items-center space-x-2 p-2 rounded-md">
                        <Calendar className="h-4 w-4 text-indigo-600" />
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAvailabilityColor(listing.availability)}`}>
                            {listing.availability}
                        </span>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                <div className="flex items-center space-x-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">Contact:</span>
                    <span className="text-gray-800 font-medium">{listing.contact}</span>
                </div>
            </CardFooter>
        </Card>
    );
}
