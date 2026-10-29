import { Route, Routes } from "react-router";
import Home from "@/pages/Home";
import Editor from "@/pages/Editor";
import Settings from "@/pages/Settings";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/editor" element={<Editor />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  );
}
