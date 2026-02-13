FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

# Copier tous les fichiers du projet
COPY . .

# Exposer le port 3001 (port par défaut de React)
EXPOSE 3001

# Démarrer l'application en mode développement
CMD ["npm", "start"] 