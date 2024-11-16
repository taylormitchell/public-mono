import { useState } from "react";
import "./App.css";
import MarkdownReader from "./MarkdownReader";

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <MarkdownReader />
    </>
  );
}

export default App;
