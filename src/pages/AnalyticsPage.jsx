import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import AnalyticsCard from "../components/AnalyticsCard";
import ClickChart from "../components/ClickChart";
import ReferrerTable from "../components/ReferrerTable";
import { fetchAnalytics } from "../services/api";

function AnalyticsPage() {
    const { code } = useParams();

    const [analytics, setAnalytics] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        let isCancelled = false;

        async function loadAnalytics() {
            setIsLoading(true);
            setErrorMessage("");

            try {
                const analyticsData = await fetchAnalytics(code);

                if (!isCancelled) {
                    setAnalytics(analyticsData);
                }
            } catch (error) {
                if (!isCancelled) {
                    setErrorMessage(error.message);
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        }

        loadAnalytics();

        return () => {
            isCancelled = true;
        };
    }, [code]);

    function renderContent() {
        if (isLoading) {
            return <p className="text-center text-gray-500">Loading analytics...</p>;
        }

        if (errorMessage) {
            return <p className="text-center text-red-600">{errorMessage}</p>;
        }

        return (
            <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-3">
                    <AnalyticsCard label="Total clicks" value={analytics.totalClicks} />
                    <AnalyticsCard label="Short URL" value={analytics.shortUrl} />
                    <AnalyticsCard label="Original URL" value={analytics.originalUrl} />
                </div>

                <ClickChart clicksOverTime={analytics.clicksOverTime} />
                <ReferrerTable referrers={analytics.referrers} />
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-gray-50 px-4 py-10">
            <div className="mx-auto w-full max-w-4xl">
                <Link to="/" className="text-sm font-medium text-indigo-600 hover:underline">
                    &larr; Back to shortener
                </Link>

                <h1 className="mt-4 mb-6 text-2xl font-bold text-gray-900">
                    Analytics for <span className="text-indigo-600">{code}</span>
                </h1>

                {renderContent()}
            </div>
        </main>
    );
}

export default AnalyticsPage;