function ClickChart({ clicksOverTime }) {
    const highestDailyCount = Math.max(...clicksOverTime.map((day) => day.count), 1);

    return (
        <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Clicks over time</h2>

            {clicksOverTime.length === 0 ? (
                <p className="mt-4 text-sm text-gray-500">No clicks recorded yet.</p>
            ) : (
                <div className="mt-6 overflow-x-auto">
                    <div className="flex h-48 items-end gap-2">
                        {clicksOverTime.map((day) => {
                            const barHeightPercent = (day.count / highestDailyCount) * 100;

                            return (
                                <div
                                    key={day.date}
                                    className="flex h-full min-w-10 flex-1 flex-col justify-end items-center"
                                >
                                    <span className="mb-1 text-xs text-gray-600">{day.count}</span>
                                    <div
                                        className="w-full rounded-t bg-indigo-500"
                                        style={{ height: `${barHeightPercent}%` }}
                                        title={`${day.date}: ${day.count} clicks`}
                                    />
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-2 flex gap-2">
                        {clicksOverTime.map((day) => (
                            <span
                                key={day.date}
                                className="min-w-10 flex-1 text-center text-xs text-gray-500"
                            >
                                {day.date.slice(5)}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}

export default ClickChart;