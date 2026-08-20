# Wheel Game

Jeu de roue (spin) en temps réel : API Node.js/Express + Socket.io, front React, MongoDB.

## Structure

- `wheel-api` — API REST + WebSocket (Express, Socket.io, Mongoose)
- `wheel-front` — application React (`react-custom-roulette`)
- `docker-compose.yml` — orchestration des services

## Démarrage

```bash
docker-compose up --build
```

## Développement

```bash
# API
cd wheel-api
npm install
npm start

# Front
cd wheel-front
npm install
npm start
```


<img width="1913" height="875" alt="image" src="https://github.com/user-attachments/assets/a1df3abd-fba2-4b1b-a5ec-d785600c3c98" />

