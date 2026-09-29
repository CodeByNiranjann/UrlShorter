function AnalyticsCard({ label, value }) {
    return (
        <div className="min-w-0 rounded-xl bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="mt-1 truncate text-lg font-semibold text-gray-900" title={String(value)}>
                {value}
            </p>
        </div>
    );
}

export default AnalyticsCard;