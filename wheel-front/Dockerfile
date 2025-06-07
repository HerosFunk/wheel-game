FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Créer un fichier .env à partir des variables d'environnement
RUN echo "REACT_APP_API_URL=${REACT_APP_API_URL:-https://wheel-game.azurewebsites.net}" > .env && \
    echo "REACT_APP_SOCKET_URL=${REACT_APP_SOCKET_URL:-https://wheel-game.azurewebsites.net}" >> .env

# Exposer le port 3001 (port par défaut de React)
EXPOSE 3001

# Démarrer l'application en mode développement
CMD ["npm", "start"] 