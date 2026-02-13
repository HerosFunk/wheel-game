// Centralized configuration for API URLs
// In production (Docker), REACT_APP_API_URL is empty so requests go to the same origin (nginx proxies to backend)
// In development, fallback to localhost:3000
const config = {
  apiUrl: process.env.REACT_APP_API_URL !== undefined && process.env.REACT_APP_API_URL !== ''
    ? process.env.REACT_APP_API_URL
    : (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000'),
};

export default config;
