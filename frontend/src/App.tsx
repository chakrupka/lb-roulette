import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Roulette from "./pages/Roulette";
import SignalScore from "./pages/SignalScore";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/roulette" element={<Roulette />} />
        <Route path="/signal-score" element={<SignalScore />} />
      </Routes>
    </BrowserRouter>
  );
}
