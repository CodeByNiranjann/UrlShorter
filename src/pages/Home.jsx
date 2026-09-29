import { useState } from "react";

import UrlForm from "../components/UrlForm";
import ShortUrlResult from "../components/ShortUrlResult";
import { createShortUrl } from "../services/api";

function HomePage() {
    const [result, setResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    async function handleShorten(originalUrl) {
        setIsLoading(true);
        setErrorMessage("");

        try {
            const createdLink = await createShortUrl(originalUrl);
            setResult(createdLink);
        } catch (error) {
            setErrorMessage(error.message);
        } finally {
            setIsLoading(false);
        }
    }

    function handleReset() {
        setResult(null);
        setErrorMessage("");
    }

    return (
        <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="w-full max-w-xl bg-white rounded-2xl shadow-md p-8">
                <h1 className="text-3xl font-bold text-gray-900 text-center">
                    Snip<span className="text-indigo-600">Link</span>
                </h1>
                <p className="mt-2 text-center text-gray-500">
                    Paste a long URL and get a short link you can share and track.
                </p>

                <div className="mt-8">
                    {result ? (
                        <ShortUrlResult result={result} onReset={handleReset} />
                    ) : (
                        <UrlForm
                            onSubmit={handleShorten}
                            isLoading={isLoading}
                            errorMessage={errorMessage}
                        />
                    )}
                </div>
            </div>
        </main>
    );
}

export default HomePage;