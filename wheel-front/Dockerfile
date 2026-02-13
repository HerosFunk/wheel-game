FROM node:18-alpine

WORKDIR /app

# Copier les fichiers package
COPY package*.json ./

# Installer les dépendances dans le conteneur
RUN npm install

# Copier tous les fichiers (node_modules sera exclu via .dockerignore)
COPY . .

# Exposer le port 3001 (port par défaut de React)
EXPOSE 3001

# Démarrer l'application en mode développement
CMD ["npm", "start"] 