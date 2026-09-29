
import { Routes, Route } from "react-router-dom";

import HomePage from "./pages/HomePage";
import AnalyticsPage from "./pages/AnalyticsPage";

function App() {
    return (
        <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/analytics/:code" element={<AnalyticsPage />} />
        </Routes>
    );
}

export default App;