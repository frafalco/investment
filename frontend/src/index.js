import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { DataProvider } from "./context/DataContext";
import "./index.css";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <BrowserRouter>
    <AuthProvider>
      <DataProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#141414",
              color: "#fff",
              border: "1px solid #262626",
              fontFamily: "IBM Plex Sans, sans-serif",
              fontSize: "14px",
            },
          }}
        />
      </DataProvider>
    </AuthProvider>
  </BrowserRouter>
);
