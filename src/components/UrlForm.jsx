import { useState } from "react";

function UrlForm({ onSubmit, isLoading, errorMessage }) {
    const [originalUrl, setOriginalUrl] = useState("");

    function handleSubmit(event) {
        event.preventDefault();
        onSubmit(originalUrl.trim());
    }

    return (
        <form onSubmit={handleSubmit}>
            <label
                htmlFor="original-url"
                className="block text-sm font-medium text-gray-700"
            >
                Enter your long URL
            </label>

            <input
                id="original-url"
                type="text"
                value={originalUrl}
                onChange={(event) => setOriginalUrl(event.target.value)}
                placeholder="https://example.com/very-long-url"
                disabled={isLoading}
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-gray-100"
            />

            {errorMessage && (
                <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
            )}

            <button
                type="submit"
                disabled={isLoading}
                className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
            >
                {isLoading ? "Shortening..." : "Shorten URL"}
            </button>
        </form>
    );
}

export default UrlForm;