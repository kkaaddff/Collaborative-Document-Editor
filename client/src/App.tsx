import { Route, Routes } from "react-router";
import Home from "@/pages/Home";
import Editor from "@/pages/Editor";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/editor" element={<Editor />} />
    </Routes>
  );
}
