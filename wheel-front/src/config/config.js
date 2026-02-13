// Centralized configuration for API URLs
// In production (Docker), requests go through /spin-game/ prefix (nginx proxies to backend)
// In development, fallback to localhost:3000
const config = {
  apiUrl: process.env.REACT_APP_API_URL !== undefined && process.env.REACT_APP_API_URL !== ''
    ? process.env.REACT_APP_API_URL
    : (process.env.NODE_ENV === 'production' ? '/spin-game' : 'http://localhost:3000'),
};

export default config;
