import { useTranslation } from "react-i18next";
import * as Icons from "lucide-react";
import { Preferences } from "@/types";

interface UserPreferencesProps {
    preferences?: Preferences;
}

export default function UserPreferences({ preferences }: UserPreferencesProps) {
    const { t } = useTranslation();

    if (!preferences) {
        return (
            <div className="rounded-lg border p-4">
                <h2 className="mb-2 text-lg font-semibold">{t("Your Preferences")}</h2>
                <p className="text-sm text-gray-500">{t("Start a conversation to set your preferences")}</p>
            </div>
        );
    }

    // Dynamic icon component rendering
    const IconComponent = (iconName: string) => {
        const Icon = Icons[iconName as keyof typeof Icons] as React.ElementType;
        return Icon ? <Icon className="h-4 w-4" /> : null;
    };

    return (
        <div className="rounded-lg border p-4">
            <h2 className="mb-4 text-lg font-semibold">{t("Your Preferences")}</h2>

            {preferences.budget && (
                <div className="mb-3">
                    <h3 className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <Icons.Wallet className="h-4 w-4" />
                        {t("Budget")}
                    </h3>
                    <p className="text-sm text-gray-600">
                        €{preferences.budget.min.toLocaleString()} - €{preferences.budget.max.toLocaleString()}
                    </p>
                </div>
            )}

            {preferences.size && (
                <div className="mb-3">
                    <h3 className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <Icons.Square className="h-4 w-4" />
                        {t("Size")}
                    </h3>
                    <p className="text-sm text-gray-600">
                        {preferences.size.min}m² - {preferences.size.max}m²
                    </p>
                </div>
            )}

            {preferences.rooms && (
                <div className="mb-3">
                    <h3 className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <Icons.LayoutGrid className="h-4 w-4" />
                        {t("Rooms")}
                    </h3>
                    <p className="text-sm text-gray-600">{preferences.rooms}</p>
                </div>
            )}

            {preferences.location && (
                <div className="mb-3">
                    <h3 className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <Icons.MapPin className="h-4 w-4" />
                        {t("Location")}
                    </h3>
                    <p className="text-sm text-gray-600">{preferences.location}</p>
                </div>
            )}

            {preferences.features.length > 0 && (
                <div className="mb-3">
                    <h3 className="text-sm font-medium text-gray-700">{t("Features")}</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {preferences.features
                            .filter(feature => feature.enabled)
                            .map(feature => (
                                <span key={feature.id} className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">
                                    {IconComponent(feature.icon)}
                                    {feature.label}
                                </span>
                            ))}
                    </div>
                </div>
            )}
        </div>
    );
}
