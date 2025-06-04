// src/App.js
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import AppRoutes from "./Routes";
import "./App.css";
import { socket } from './socket';

const API_URL = "https://wheel-game.azurewebsites.net";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return document.cookie.includes("isAuthenticated=true");
  });
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected to the server");
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from the server");
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
    };
  }
  , []);


  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
  };

  const handlePasswordSubmit = async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(`${API_URL}/auth/verify-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsAuthenticated(true);
        localStorage.setItem("token", data.token);

        var now = new Date();
        var time = now.getTime();
         // dans 10 heures
        var expireTime = time  + 10*3600*1000;
        now.setTime(expireTime);
        document.cookie = "isAuthenticated=true;expires=" + now.toUTCString() + ";path=/";
        document.cookie = "role=" + data.role + ";expires=" + now.toUTCString() + ";path=/";

        
      } else {
        setErrorMessage("Incorrect Password!");
      }
    } catch (error) {
      setErrorMessage("Error.");
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="Password-popup">
        <h2>Enter the password to access the page</h2>
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={handlePasswordChange}
        />
        <button onClick={handlePasswordSubmit} disabled={loading}>
          {loading ? "Verification..." : "Confirm"}
        </button>
        {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
      </div>
    );
  }

  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;