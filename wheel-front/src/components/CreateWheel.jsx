import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import money_emoji from "../img/money_emoji.png";
import CustomWheel from "./CustomWheel";
import { Pencil } from "lucide-react";
import "./CreateWheel.css";

const API_URL = "http://localhost:3000/api";

const CreateWheel = () => {
	const { wheelId } = useParams();
	const [segments, setSegments] = useState([]);
	const [inputValue, setInputValue] = useState("");
	const [weightValue, setWeightValue] = useState(1);
	const [nameValue, setNameValue] = useState("");
	const [options, setOptions] = useState({ option1: false, infinitySpin: true });
	const [spinLimit, setSpinLimit] = useState("");
	const [errorMessage, setErrorMessage] = useState("");
	const [editingIndex, setEditingIndex] = useState(null);
	const [editingValue, setEditingValue] = useState("");
	const navigate = useNavigate();
	const [isWheelVisible, setIsWheelVisible] = useState(false);
	const [wheel, setWheel] = useState(null);
	const [isModalOpen, setIsModalOpen] = useState(false);

	useEffect(() => {
		if (wheelId) {
			const fetchWheel = async () => {
				try {
					const response = await fetch(`${API_URL}/wheels/${wheelId}`, {
						headers: {
							Authorization: `Bearer ${localStorage.getItem("token")}`,
						},
					});
					const data = await response.json();
					setNameValue(data.name);
					setOptions({ option1: data.removeAfterSelection, infinitySpin: data.numberOfSpins === -1 });
					setSpinLimit(data.numberOfSpins === -1 ? "" : data.numberOfSpins);
					setSegments(data.Elements.map((element) => ({ label: element.label, weight: element.weight })));
				} catch (error) {
					console.error("Error fetching wheel:", error);
				}
			};

			fetchWheel();
		}
	}, [wheelId]);

	const colorPalette = [
		"#ff69b4",
		"#e74c3c",
		"#9b59b6",
		"#3498db",
		"#1abc9c",
		"#2ecc71",
		"#f39c12",
		"#e67e22",
		"#34495e",
		"#95a5a6",
		"#fd79a8",
		"#6c5ce7",
		"#74b9ff",
		"#00b894",
		"#fdcb6e",
		"#e17055",
		"#81ecec",
		"#a29bfe",
		"#ffeaa7",
		"#fab1a0",
		"#ff7675",
		"#55a3ff",
		"#fd79a8",
		"#fdcb6e",
	];

	const assignColors = (elements, colorPalette) => {
		let lastColor = null;
		return elements.map((element) => {
			const availableColors = colorPalette.filter((color) => color !== lastColor);
			const assignedColor = availableColors[Math.floor(Math.random() * availableColors.length)];
			lastColor = assignedColor;
			return {
				...element,
				color: assignedColor,
			};
		});
	};

	const calculateProbability = (weight, segments) => {
		const totalWeight = segments.reduce((sum, segment) => sum + segment.weight, 0);
		return ((weight / totalWeight) * 100).toFixed(1);
	};

	const handleAddSegment = () => {
		let segmentName = inputValue.trim();
		if (!segmentName) {
			segmentName = `${segments.length + 1}`;
		}

		const weight = parseInt(weightValue);
		if (weight < 1 || weight > 9) {
			setErrorMessage("Weight must be between 1 and 9");
			return;
		}

		const newSegment = {
			label: segmentName,
			weight: weight,
		};

		setSegments([...segments, newSegment]);
		setInputValue("");
		setWeightValue(1);
		setErrorMessage("");
	};

	const handleWeightChange = (index, newWeight) => {
		const weight = parseInt(newWeight);
		if (weight >= 1 && weight <= 9) {
			const updatedSegments = segments.map((segment, i) => (i === index ? { ...segment, weight: weight } : segment));
			setSegments(updatedSegments);
		}
	};

	const splitTextIntoLines = (text, maxCharsPerLine) => {
		if (text.length <= maxCharsPerLine) return text;
		const cutIndex = text.indexOf(" ", maxCharsPerLine);
		if (cutIndex === -1) return text;
		return `${text.substring(0, cutIndex)}...`;
	};

	const handleCheckboxChange = (option) => {
		setOptions((prevOptions) => ({
			...prevOptions,
			[option]: !prevOptions[option],
		}));
		if (option === "infinitySpin" && !options.infinitySpin) {
			setSpinLimit("");
		}
	};

	const handleEditClick = (index) => {
		setEditingIndex(index);
		setEditingValue(segments[index].label);
	};

	const handleEditSave = (index) => {
		if (editingValue.trim()) {
			const updatedSegments = [...segments];
			updatedSegments[index] = { ...updatedSegments[index], label: editingValue.trim() };
			setSegments(updatedSegments);
			setEditingIndex(null);
			setEditingValue("");
		}
	};

	const handleDeleteSegment = (index) => {
		setSegments(segments.filter((_, i) => i !== index));
	};

	const handleCreateWheel = async () => {
		setErrorMessage("");

		if (!nameValue.trim()) {
			setErrorMessage("Wheel name is required.");
			return;
		}

		if (segments.length < 2) {
			setErrorMessage("At least 2 segments are required.");
			return;
		}

		if (!options.infinitySpin && (!spinLimit || parseInt(spinLimit) <= 0)) {
			setErrorMessage("A valid spin limit is required if Infinity Spin is disabled.");
			return;
		}

		const wheelData = {
			name: nameValue,
			removeAfterSelection: options.option1,
			numberOfSpins: options.infinitySpin ? -1 : parseInt(spinLimit),
			elements: segments.map((segment) => ({
				label: segment.label,
				weight: segment.weight || 1,
			})),
		};

		try {
			const response = await fetch(wheelId ? `${API_URL}/wheels/${wheelId}` : `${API_URL}/wheels`, {
				method: wheelId ? "PUT" : "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${localStorage.getItem("token")}`,
				},
				body: JSON.stringify(wheelData),
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.error("API Error Response:", errorText);
				throw new Error(`API error: ${response.statusText}`);
			}

			const createdWheel = await response.json();
			navigate(`/wheel/${createdWheel.id || createdWheel._id}`);
		} catch (error) {
			console.error("Full error:", error);
			setErrorMessage(`Error creating wheel: ${error.message}`);
		}
	};

	return (
		<div className="CreateWheel">
			<div style={{ position: "absolute", top: "20px", left: "20px" }}>
				<Link to="/">
					<img src={money_emoji} alt="Home" style={{ width: "50px", height: "50px", cursor: "pointer" }} />
				</Link>
			</div>

			{wheel && (
				<div
					className={`modal-overlay ${isWheelVisible ? "visible" : "hidden"}`}
					onClick={() => {
						setIsModalOpen(false);
						setIsWheelVisible(false);
					}}
					style={{
						position: "fixed",
						top: 0,
						left: 0,
						width: "100vw",
						height: "100vh",
						background: "rgba(0, 0, 0, 0.8)",
						backdropFilter: "blur(8px)",
						display: "flex",
						justifyContent: "center",
						alignItems: "center",
						zIndex: 1000,
						opacity: isWheelVisible ? 1 : 0,
						visibility: isWheelVisible ? "visible" : "hidden",
						transition: "opacity 0.3s ease, visibility 0.3s ease",
					}}
				>
					<div
						className="modal-content"
						onClick={(e) => e.stopPropagation()}
						style={{
							background: "rgba(46, 48, 56, 0.95)",
							backdropFilter: "blur(20px)",
							borderRadius: "20px",
							padding: "40px",
							boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
							border: "1px solid rgba(255, 255, 255, 0.1)",
							position: "relative",
							maxWidth: "90vw",
							maxHeight: "90vh",
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							gap: "20px",
						}}
					>
						<button
							className="close-btn"
							onClick={() => {
								setIsModalOpen(false);
								setIsWheelVisible(false);
							}}
							style={{
								position: "absolute",
								top: "15px",
								right: "15px",
								background: "transparent",
								color: "#e74c3c",
								border: "none",
								outline: "none",
								fontSize: "2rem",
								cursor: "pointer",
								transition: "all 0.3s ease",
								display: "flex",
								alignItems: "center",
								justifyContent: "right",
								padding: 0,
								lineHeight: 1,
								fontWeight: "bold",
								width: "auto",
								height: "auto",
							}}
						>
							×
						</button>
						<h2
							style={{
								color: "#fff",
								fontSize: "1.5rem",
								marginBottom: "20px",
								textAlign: "center",
							}}
						>
							Wheel Preview
						</h2>
						<div
							style={{
								display: "flex",
								justifyContent: "center",
								alignItems: "center",
								width: "100%",
								height: "100%",
							}}
						>
							<CustomWheel
								elements={
									wheel.elements
										? wheel.elements.map((element) => ({
												label: element.label,
												weight: element.weight || 1,
												_id: element._id || element.id,
												color: element.color,
										  }))
										: []
								}
								onSpinEnd={() => {}}
								isSpinning={false}
								spinDuration={5}
								spinSpeed={10}
								wheelSize={500}
								borderWidth={0}
								customColors={
									wheel.elements
										? wheel.elements.map((element, index) => element.color || colorPalette[index % colorPalette.length])
										: []
								}
								disabled={false}
								targetElementId={null}
							/>
						</div>
					</div>
				</div>
			)}

			<h1>{wheelId ? "Edit Your Wheel 😈" : "Create Your Wheel 😈"}</h1>

			{errorMessage && (
				<div style={{ color: "red", marginBottom: "20px" }}>
					<strong>Error:</strong> {errorMessage}
				</div>
			)}

			<div className="wheel-info-card">
				<div className="info-item">
					<div className="info-icon">🎯</div>
					<div className="info-content">
						<span className="info-label">Wheel Name</span>
						<input
							type="text"
							placeholder="Enter your wheel name"
							value={nameValue}
							onChange={(e) => setNameValue(e.target.value)}
							className="info-value"
							style={{
								background: "transparent",
								border: "none",
								color: "#fff",
								fontSize: "1.3rem",
								fontWeight: "bold",
								outline: "none",
								width: "100%",
								"&::placeholder": {
									color: "#FFFFFF",
									opacity: 0,
									fontStyle: "italic",
								},
							}}
						/>
					</div>
				</div>

				<div className="info-item">
					<div className="info-icon">📊</div>
					<div className="info-content">
						<span className="info-label">Total Elements</span>
						<span className="info-value">{segments.length}</span>
					</div>
				</div>
			</div>

			<div className="elements-list">
				<h3>Add New Element</h3>
				<div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "20px", flexWrap: "wrap" }}>
					<input
						type="text"
						placeholder="Element name"
						value={inputValue}
						onChange={(e) => setInputValue(e.target.value)}
						onKeyPress={(e) => e.key === "Enter" && handleAddSegment()}
						style={{
							flex: 1,
							minWidth: "200px",
							background: "#34363c",
							border: "1px solid #444",
							borderRadius: "8px",
							padding: "12px",
							color: "#fff",
							fontSize: "1rem",
						}}
					/>
					<input
						type="number"
						min="1"
						max="9"
						value={weightValue}
						onChange={(e) => setWeightValue(e.target.value)}
						placeholder="Weight"
						style={{
							width: "80px",
							background: "#34363c",
							border: "1px solid #444",
							borderRadius: "8px",
							padding: "12px",
							color: "#fff",
							fontSize: "1rem",
							textAlign: "center",
						}}
					/>
					<button
						onClick={handleAddSegment}
						onMouseDown={(e) => e.stopPropagation()}
						className="control-button"
						style={{ whiteSpace: "nowrap" }}
						type="button"
					>
						Add Element
					</button>
				</div>
				<div style={{ color: "#a0a0a0", fontSize: "0.9rem", marginBottom: "20px" }}>
					Higher weight = more likely to be selected (1-9 scale)
				</div>
			</div>

			<div className="elements-list">
				<h3>Wheel Elements ({segments.length})</h3>

				{segments.length === 0 ? (
					<div style={{ textAlign: "center", padding: "40px", color: "#a0a0a0" }}>
						<div style={{ fontSize: "3rem", marginBottom: "16px" }}>🎯</div>
						<p>No elements in this wheel</p>
						<p>Use the form above to add segments</p>
					</div>
				) : (
					<div
						className="elements-grid"
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
							gap: "12px 24px",
							rowGap: "40px",
							padding: "20px 0",
						}}
					>
						{segments.map((segment, index) => (
							<div
								key={index}
								className="element-card"
								style={{
									borderLeft: "6px solid #ffb300",
									display: "flex",
									flexDirection: "column",
									height: "100%",
								}}
							>
								<div className="element-header" style={{ marginBottom: "20px" }}>
									<div
										className="element-color-indicator"
										style={{
											backgroundColor: "#ffb300",
											width: "12px",
											height: "12px",
										}}
									></div>

									{editingIndex === index ? (
										<input
											type="text"
											value={editingValue}
											onChange={(e) => setEditingValue(e.target.value)}
											onBlur={() => handleEditSave(index)}
											onKeyPress={(e) => {
												if (e.key === "Enter") handleEditSave(index);
												if (e.key === "Escape") {
													setEditingIndex(null);
													setEditingValue("");
												}
											}}
											style={{
												background: "transparent",
												border: "1px solid #ffb300",
												borderRadius: "4px",
												padding: "4px 8px",
												color: "#fff",
												fontSize: "1rem",
												flex: 1,
											}}
											autoFocus
										/>
									) : (
										<span className="element-label">{segment.label}</span>
									)}
								</div>

								<div className="element-details" style={{ marginBottom: "4px" }}>
									<div className="element-weight">
										<span className="detail-label">Weight:</span>
										<input
											type="number"
											min="1"
											max="9"
											value={segment.weight || 1}
											onChange={(e) => handleWeightChange(index, e.target.value)}
											disabled={editingIndex === index}
											style={{
												width: "60px",
												background: "#444",
												border: "1px solid #666",
												borderRadius: "4px",
												padding: "4px",
												color: "#fff",
												textAlign: "center",
											}}
										/>
									</div>
									<div className="element-probability">
										<span className="detail-label">Probability:</span>
										<span className="detail-value">{calculateProbability(segment.weight || 1, segments)}%</span>
									</div>
								</div>

								<div
									style={{
										display: "flex",
										flexDirection: "column",
										gap: "8px",
										marginTop: "auto",
									}}
								>
									<button
										onClick={() => handleEditClick(index)}
										disabled={editingIndex === index}
										style={{
											background: "#6c5ce7",
											color: "white",
											border: "none",
											borderRadius: "4px",
											padding: "6px 12px",
											fontSize: "0.8rem",
											cursor: editingIndex === index ? "not-allowed" : "pointer",
											opacity: editingIndex === index ? 0.5 : 1,
											width: "100%",
										}}
									>
										Edit
									</button>

									<button
										onClick={() => handleDeleteSegment(index)}
										disabled={editingIndex === index}
										style={{
											background: "#e74c3c",
											color: "white",
											border: "none",
											borderRadius: "4px",
											padding: "6px 12px",
											fontSize: "0.8rem",
											cursor: editingIndex === index ? "not-allowed" : "pointer",
											opacity: editingIndex === index ? 0.5 : 1,
											width: "100%",
										}}
									>
										Delete
									</button>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			<div className="elements-list">
				<h3>Wheel Options</h3>
				<div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
					<label style={{ display: "flex", alignItems: "center", gap: "12px", color: "#fff", fontSize: "1rem" }}>
						<input
							type="checkbox"
							checked={options.option1}
							onChange={() => handleCheckboxChange("option1")}
							style={{ transform: "scale(1.2)" }}
						/>
						Remove element after selection
					</label>
					<label style={{ display: "flex", alignItems: "center", gap: "12px", color: "#fff", fontSize: "1rem" }}>
						<input
							type="checkbox"
							checked={options.infinitySpin}
							onChange={() => handleCheckboxChange("infinitySpin")}
							style={{ transform: "scale(1.2)" }}
						/>
						Infinite spins
					</label>

					{!options.infinitySpin && (
						<div style={{ marginLeft: "32px", display: "flex", alignItems: "center", gap: "12px" }}>
							<label style={{ color: "#fff", fontSize: "1rem" }}>Number of spins:</label>
							<input
								type="number"
								value={spinLimit}
								min="1"
								max="10000"
								step="1"
								placeholder="e.g: 10"
								onChange={(e) => setSpinLimit(e.target.value)}
								style={{
									width: "120px",
									background: "#34363c",
									border: "1px solid #444",
									borderRadius: "8px",
									padding: "8px 12px",
									color: "#fff",
									fontSize: "1rem",
								}}
							/>
							<span style={{ color: "#a0a0a0", fontSize: "0.9rem" }}>(1-10,000)</span>
						</div>
					)}
				</div>
			</div>

			<div className="admin-controls">
				<div className="admin-buttons">
					<button
						className="control-button"
						onClick={() => {
							if (segments.length < 2) {
								setErrorMessage("At least 2 segments are required for preview.");
								return;
							}

							const segmentObjects = segments.map((segment, index) => ({
								label: segment.label,
								weight: segment.weight || 1,
								_id: `preview_${index}`,
							}));

							setWheel({
								elements: assignColors(segmentObjects, colorPalette),
							});
							setIsModalOpen(true);
							setIsWheelVisible(true);
						}}
					>
						Preview Wheel
					</button>

					<button
						className="control-button"
						onClick={handleCreateWheel}
						style={{
							background: "linear-gradient(135deg, #00b894, #00a085)",
							boxShadow: "0 4px 15px rgba(0, 184, 148, 0.3)",
						}}
					>
						{wheelId ? "Save Changes" : "Create Wheel"}
					</button>
				</div>
			</div>
		</div>
	);
};

export default CreateWheel;
