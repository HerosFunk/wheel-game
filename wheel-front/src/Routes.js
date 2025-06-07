import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./components/Home";
import CreateWheel from "./components/CreateWheel";
import Footer from "./components/Footer";
import WheelDetails from "./components/WheelDetails";
import EditWheel from "./components/EditWheel";
import MyWheels from "./components/MyWheels";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<><Home /><Footer/></>} />
      <Route path="/create-wheel" element={<><CreateWheel /><Footer></Footer></>} />
      <Route path="/wheel/:wheelId" element={<><WheelDetails /><Footer></Footer></>} />
      <Route path="/edit-wheel/:wheelId" element={<><EditWheel /><Footer/></>} />
      <Route path="/my-wheels" element={<><MyWheels /><Footer/></>} />
    </Routes>
  );
};

export default AppRoutes;
