import { useTranslation } from "react-i18next";

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

    return (
        <div className="rounded-lg border p-4">
            <h2 className="mb-4 text-lg font-semibold">{t("Your Preferences")}</h2>

            {preferences.budget && (
                <div className="mb-3">
                    <h3 className="text-sm font-medium text-gray-700">{t("Budget")}</h3>
                    <p className="text-sm text-gray-600">
                        €{preferences.budget.min.toLocaleString()} - €{preferences.budget.max.toLocaleString()}
                    </p>
                </div>
            )}

            {preferences.size && (
                <div className="mb-3">
                    <h3 className="text-sm font-medium text-gray-700">{t("Size")}</h3>
                    <p className="text-sm text-gray-600">
                        {preferences.size.min}m² - {preferences.size.max}m²
                    </p>
                </div>
            )}

            {preferences.rooms && (
                <div className="mb-3">
                    <h3 className="text-sm font-medium text-gray-700">{t("Rooms")}</h3>
                    <p className="text-sm text-gray-600">{preferences.rooms}</p>
                </div>
            )}

            {preferences.location && (
                <div className="mb-3">
                    <h3 className="text-sm font-medium text-gray-700">{t("Location")}</h3>
                    <p className="text-sm text-gray-600">{preferences.location}</p>
                </div>
            )}

            {preferences.features && preferences.features.length > 0 && (
                <div className="mb-3">
                    <h3 className="text-sm font-medium text-gray-700">{t("Features")}</h3>
                    <div className="mt-1 flex flex-wrap gap-1">
                        {preferences.features.map(feature => (
                            <span key={feature} className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">
                                {feature}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
