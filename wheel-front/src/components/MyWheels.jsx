import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import money_emoji from "../img/money_emoji.png";
import "./MyWheels.css";

const MyWheels = () => {
  const navigate = useNavigate();
  const [wheels, setWheels] = useState([]);

  useEffect(() => {
    const fetchWheels = async () => {
      try {
        const response = await fetch("https://wheel-game.azurewebsites.net/wheels", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        const data = await response.json();
        setWheels(data);
      } catch (error) {
        console.error("Error fetching wheels:", error);
      }
    };

    fetchWheels();
  }, []);

  const handleClone = async (wheelId) => {

    try {
      const cloneResponse = await fetch(`https://wheel-game.azurewebsites.net/wheels/clone/${wheelId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const clonedWheel = await cloneResponse.json();
      setWheels((prevWheels) => [...prevWheels, clonedWheel]);
    } catch (error) {
      console.error("Error cloning wheel:", error);
    }
  };

  const handleDelete = async (wheelId) => {
    try {
      await fetch(`https://wheel-game.azurewebsites.net/wheels/${wheelId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setWheels((prevWheels) => prevWheels.filter((wheel) => wheel.id !== wheelId));
    } catch (error) {
      console.error("Error deleting wheel:", error);
    }
  };

  return (
    <div className="MyWheels">
      <div className="back-button">
        <img
          src={money_emoji}
          alt="Home"
          className="back-button-img"
          onClick={() => navigate("/")}
        />
      </div>
      <h1 className="title">My Wheels</h1>
      <div className="wheels-container">
        {wheels.map((wheel) => (
          <div key={wheel.id} className="wheel-card">
            <h2>{wheel.name}</h2>
            <button onClick={() => navigate(`/wheel/${wheel.id}`)}>View</button>
            <button onClick={() => navigate(`/edit-wheel/${wheel.id}`)}>Edit</button>
            <button onClick={() => handleClone(wheel.id)}>Clone</button>
            <button onClick={() => handleDelete(wheel.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyWheels;
