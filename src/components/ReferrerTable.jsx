function ReferrerTable({ referrers }) {
    return (
        <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Referrers</h2>

            {referrers.length === 0 ? (
                <p className="mt-4 text-sm text-gray-500">No referrer data yet.</p>
            ) : (
                <table className="mt-4 w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-gray-200 text-gray-500">
                            <th className="py-2 font-medium">Source</th>
                            <th className="py-2 text-right font-medium">Clicks</th>
                        </tr>
                    </thead>
                    <tbody>
                        {referrers.map((item) => (
                            <tr key={item.referrer} className="border-b border-gray-100">
                                <td className="max-w-0 truncate py-2 pr-4 text-gray-900" title={item.referrer}>
                                    {item.referrer}
                                </td>
                                <td className="py-2 text-right text-gray-900">{item.count}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </section>
    );
}

export default ReferrerTable;