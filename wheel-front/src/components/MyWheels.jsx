import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import money_emoji from "../img/money_emoji.png";
import "./MyWheels.css";
import CustomButton from './CustomButton';
import { getWheels, deleteWheel, toggleFavorite } from '../services/api';

const MyWheels = () => {
  const navigate = useNavigate();
  const [wheels, setWheels] = useState([]);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showFavorites, setShowFavorites] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWheels = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getWheels({
        sortBy,
        sortOrder,
        favoriteOnly: showFavorites
      });
      if (Array.isArray(data)) {
        setWheels(data);
      } else {
        console.error('Received non-array data:', data);
        setWheels([]);
      }
    } catch (error) {
      setError("Une erreur est survenue lors du chargement des roues");
      console.error("Erreur lors de la récupération des roues:", error);
      setWheels([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWheels();
  }, [sortBy, sortOrder, showFavorites]);

  const handleSortChange = (newSortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  const handleDelete = async (wheelId) => {
    try {
      await deleteWheel(wheelId);
      setWheels((prevWheels) => prevWheels.filter((wheel) => wheel._id !== wheelId));
    } catch (error) {
      setError("Une erreur est survenue lors de la suppression de la roue");
      console.error("Erreur lors de la suppression de la roue:", error);
    }
  };

  const handleToggleFavorite = async (wheelId) => {
    try {
      setWheels(prevWheels => 
        prevWheels.map(wheel => 
          wheel._id === wheelId ? { ...wheel, isFavorite: !wheel.isFavorite } : wheel
        )
      );

      await toggleFavorite(wheelId);
    } catch (error) {
      setWheels(prevWheels => 
        prevWheels.map(wheel => 
          wheel._id === wheelId ? { ...wheel, isFavorite: !wheel.isFavorite } : wheel
        )
      );
      setError("Une erreur est survenue lors de la mise à jour du favori");
      console.error("Erreur lors de la mise à jour du favori:", error);
    }
  };

  const getSortIcon = (column) => {
    if (sortBy !== column) return '↕️';
    return sortOrder === 'asc' ? '↑' : '↓';
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
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="wheels-controls">
        <div className="sort-controls">
          <button 
            onClick={() => handleSortChange('name')}
            className={`sort-button ${sortBy === 'name' ? 'active' : ''}`}
          >
            Nom {getSortIcon('name')}
          </button>
          <button 
            onClick={() => handleSortChange('createdAt')}
            className={`sort-button ${sortBy === 'createdAt' ? 'active' : ''}`}
          >
            Date {getSortIcon('createdAt')}
          </button>
        </div>
        
        <button 
          onClick={() => setShowFavorites(!showFavorites)}
          className={`favorite-filter ${showFavorites ? 'active' : ''}`}
        >
          {showFavorites ? 'Toutes les roues' : 'Favoris'}
        </button>
      </div>

      <div className="wheels-container">
        {loading ? (
          <div className="loading">Loading...</div>
        ) : wheels.length === 0 ? (
          <div className="no-wheels">
            <p>No wheel found</p>
            <Link to="/create-wheel">
              <CustomButton text="Create a wheel" />
            </Link>
          </div>
        ) : (
          <>
            {wheels.map((wheel) => (
              <div key={wheel._id} className="wheel-card">
                <div className="wheel-card-header">
                  <h2>{wheel.name}</h2>
                  <button 
                    onClick={() => handleToggleFavorite(wheel._id)}
                    className={`favorite-button ${wheel.isFavorite ? 'active' : ''}`}
                  >
                    {wheel.isFavorite ? '★' : '☆'}
                  </button>
                </div>
                <p>Spins remaining: {wheel.numberOfSpinsLeft === -1 ? '∞' : wheel.numberOfSpinsLeft}</p>
                <p>Elements: {wheel.elements?.length || 0}</p>
                <div className="wheel-card-actions">
                  <button onClick={() => navigate(`/wheel/${wheel._id}`)}>View</button>
                  <button onClick={() => navigate(`/edit-wheel/${wheel._id}`)}>Edit</button>
                  <button onClick={() => handleDelete(wheel._id)}>Delete</button>
                </div>
              </div>
            ))}
            <div className="wheel-card add-card" onClick={() => navigate('/create-wheel')} tabIndex={0} role="button">
              <div className="add-card-content">
                <span className="add-icon">＋</span>
                <span>Create a wheel</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MyWheels;
