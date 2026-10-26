import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import CareerReflectionApp from "../app/components/CareerReflectionApp";
import "../app/globals.css";

createRoot(document.getElementById("root")!).render(<StrictMode><CareerReflectionApp /></StrictMode>);
