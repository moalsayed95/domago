import { Listing } from "@/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./card";

interface ListingCardProps {
    listing: Listing;
    highlight?: boolean;
}

export default function ListingCard({ listing, highlight = false }: ListingCardProps) {
    return (
        <Card className={`m-4 w-full max-w-md overflow-hidden rounded-lg border shadow-md ${highlight ? "best-listing-card" : ""}`}>
            <CardHeader className="p-4">
                <CardTitle className="text-lg font-bold">{listing.title}</CardTitle>
                <CardDescription>{listing.location}</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
                <p className="mb-4">{listing.description}</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="font-semibold">Price:</p>
                        <p>€{listing.price.toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="font-semibold">Rooms:</p>
                        <p>{listing.rooms}</p>
                    </div>
                    <div>
                        <p className="font-semibold">Size:</p>
                        <p>{listing.size} m²</p>
                    </div>
                    <div>
                        <p className="font-semibold">Floor:</p>
                        <p>{listing.floor}</p>
                    </div>
                    <div>
                        <p className="font-semibold">Availability:</p>
                        <p>{listing.availability}</p>
                    </div>
                    <div>
                        <p className="font-semibold">Contact:</p>
                        <p>{listing.contact}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
