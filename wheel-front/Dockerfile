FROM node:18-alpine

WORKDIR /app

# Copier les fichiers package
COPY package*.json ./

# Installer les dépendances
RUN npm ci --legacy-peer-deps

# Copier le reste des fichiers (node_modules sera ignoré via .dockerignore)
COPY . .

# Exposer le port 3001
EXPOSE 3001

# Variable d'environnement pour désactiver le hot reload qui cause des problèmes
ENV WATCHPACK_POLLING=true
ENV CHOKIDAR_USEPOLLING=true

# Démarrer l'application
CMD ["npm", "start"] 