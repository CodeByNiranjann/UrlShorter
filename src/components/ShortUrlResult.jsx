```jsx
import { useState } from "react";
import { Link } from "react-router-dom";

function ShortUrlResult({ result, onReset }) {
    const [isCopied, setIsCopied] = useState(false);

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(result.shortUrl);
            setIsCopied(true);

            setTimeout(() => {
                setIsCopied(false);
            }, 2000);
        } catch (error) {
            console.error("Failed to copy short URL:", error);
        }
    }

    return (
        <div>
            <p className="text-sm font-medium text-gray-700">
                Your shortened URL:
            </p>

            <div className="mt-2 flex items-center gap-2">
                <a
                    href={result.shortUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 truncate rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-indigo-600 hover:underline"
                >
                    {result.shortUrl}
                </a>

                <button
                    type="button"
                    onClick={handleCopy}
                    className="rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700"
                >
                    {isCopied ? "Copied!" : "Copy"}
                </button>
            </div>

            <div className="mt-6 flex items-center justify-between text-sm">
                <Link
                    to={`/analytics/${result.code}`}
                    className="font-medium text-indigo-600 hover:underline"
                >
                    View analytics
                </Link>

                <button
                    type="button"
                    onClick={onReset}
                    className="text-gray-500 hover:text-gray-700"
                >
                    Shorten another
                </button>
            </div>
        </div>
    );
}

export default ShortUrlResult;
```
