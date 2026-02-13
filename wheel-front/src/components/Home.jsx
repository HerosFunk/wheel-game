import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomButton from "../components/CustomButton";
import Footer from "../components/Footer";
import money_emoji from "../img/money_emoji.png";
import config from "../config/config";
import "./Home.css";

const img_list = [money_emoji];
const random_img_number = Math.floor(Math.random() * img_list.length);

const Home = () => {
	const navigate = useNavigate();
	const [wheels, setWheels] = useState([]);

	useEffect(() => {
		const fetchWheels = async () => {
			try {
				const response = await fetch(`${config.apiUrl}/wheel-game-api/wheels`, {
					headers: {
						Authorization: `Bearer ${localStorage.getItem("token")}`,
					},
				});
				const data = await response.json();
				if (Array.isArray(data)) {
					setWheels(data);
				} else {
					console.error("Fetched data is not an array:", data);
				}
			} catch (error) {
				console.error("Error fetching wheels:", error);
			}
		};

		fetchWheels();
	}, []);

	return (
		<div className="App">
			<header className="App-header">
				<h1>Spin the sin 😈</h1>
				<img src={img_list[random_img_number]} className="App-logo" alt="logo" />
				<div>
					<CustomButton theme="pink" onClick={() => navigate("/create-wheel")}>
						Create wheel
					</CustomButton> 
					<br></br>
					<CustomButton theme="blue" onClick={() => navigate("/my-wheels")}>
						&nbsp;&nbsp;&nbsp;My Wheels&nbsp;&nbsp;&nbsp;
					</CustomButton>
				</div>
			</header>

			<section className="how-to-use">
				<h2>How to Use</h2>
				<div className="how-to-steps">
					<p>
						<strong>Step 1:</strong> Click on "Create wheel" to start building your custom wheel with any number of
						segments.
					</p>
					<p>
						<strong>Step 2:</strong> Add unique items or options to your wheel and configure its behavior.
					</p>
					<p>
						<strong>Step 3:</strong> Share your wheel's link !
					</p>
					<p>
						<strong>Step 4:</strong> Wait for your "friend" ;) to spin and watch the result !
					</p>
				</div>
			</section>

			<Footer />
		</div>
	);
};

export default Home;
