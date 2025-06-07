const { Server } = require("socket.io");

let io;

const handleWheelEvents = (socket, wheelId) => {
	socket.join(`wheel:${wheelId}`);

	socket.on("wheel:spin", async (data) => {
		try {
			io.to(`wheel:${wheelId}`).emit("wheel:spinning", {
				wheelId,
				timestamp: Date.now(),
			});
		} catch (error) {
			socket.emit("error", { message: "Erreur lors du spin de la roue" });
		}
	});
};

const wheelViewers = new Map();

const getViewerCount = (wheelId) => {
	return wheelViewers.get(wheelId)?.size || 0;
};

const addViewer = (wheelId, socketId) => {
	if (!wheelViewers.has(wheelId)) {
		wheelViewers.set(wheelId, new Set());
	}
	wheelViewers.get(wheelId).add(socketId);
};

const removeViewer = (wheelId, socketId) => {
	if (wheelViewers.has(wheelId)) {
		wheelViewers.get(wheelId).delete(socketId);
		if (wheelViewers.get(wheelId).size === 0) {
			wheelViewers.delete(wheelId);
		}
	}
};

const handleConnection = (socket) => {
	console.log("Nouvelle connexion socket:", socket.id);

	socket.on("error", (error) => {
		console.error("Erreur socket:", error);
		socket.emit("error", { message: "Une erreur est survenue" });
	});

	socket.on("disconnect", () => {
		console.log("Déconnexion socket:", socket.id);

		for (const [wheelId, viewers] of wheelViewers.entries()) {
			if (viewers.has(socket.id)) {
				removeViewer(wheelId, socket.id);
				const newCount = getViewerCount(wheelId);

				socket.to(`wheel:${wheelId}`).emit("viewer:left", {
					socketId: socket.id,
					timestamp: Date.now(),
				});

				socket.to(`wheel:${wheelId}`).emit("viewers:count", {
					count: newCount,
					timestamp: Date.now(),
				});

				console.log(`Viewer ${socket.id} removed from wheel ${wheelId}. New count: ${newCount}`);
			}
		}
	});

	socket.on("wheel:join", (wheelId) => {
		console.log(`Socket ${socket.id} joining wheel room: ${wheelId}`);

		socket.join(`wheel:${wheelId}`);
		addViewer(wheelId, socket.id);

		const viewerCount = getViewerCount(wheelId);

		socket.emit("viewers:count", {
			count: viewerCount,
			timestamp: Date.now(),
		});

		socket.to(`wheel:${wheelId}`).emit("viewer:joined", {
			socketId: socket.id,
			timestamp: Date.now(),
		});

		socket.to(`wheel:${wheelId}`).emit("viewers:count", {
			count: viewerCount,
			timestamp: Date.now(),
		});

		socket.emit("wheel:joined", { wheelId });

		console.log(`Wheel ${wheelId} now has ${viewerCount} viewers`);
	});

	socket.on("wheel:leave", (wheelId) => {
		console.log(`Socket ${socket.id} leaving wheel room: ${wheelId}`);

		socket.leave(`wheel:${wheelId}`);
		removeViewer(wheelId, socket.id);

		const newCount = getViewerCount(wheelId);

		socket.to(`wheel:${wheelId}`).emit("viewer:left", {
			socketId: socket.id,
			timestamp: Date.now(),
		});

		socket.to(`wheel:${wheelId}`).emit("viewers:count", {
			count: newCount,
			timestamp: Date.now(),
		});

		socket.emit("wheel:left", { wheelId });

		console.log(`Wheel ${wheelId} now has ${newCount} viewers`);
	});

	socket.on("wheel:spin:start", (data) => {
		console.log(`Spin started by ${socket.id} for wheel ${data.wheelId}`);
		socket.to(`wheel:${data.wheelId}`).emit("wheel:spin:starting", {
			initiatedBy: socket.id,
			wheelId: data.wheelId,
			timestamp: Date.now(),
		});
	});
};

const init = (httpServer) => {
	io = new Server(httpServer, {
		cors: {
			origin: process.env.FRONTEND_URL || "*",
			methods: ["GET", "POST"],
			credentials: true,
		},
		pingTimeout: 60000,
		pingInterval: 25000,
		transports: ["websocket", "polling"],
	});

	io.use((socket, next) => {
		try {
			next();
		} catch (error) {
			next(new Error("Erreur d'authentification"));
		}
	});

	io.on("connection", handleConnection);

	console.log("Socket.IO initialisé avec succès!");
	return io;
};

const getIO = () => {
	if (!io) {
		throw new Error("Socket.IO non initialisé!");
	}
	return io;
};

const emitToRoom = (room, event, data) => {
	if (!io) {
		throw new Error("Socket.IO non initialisé!");
	}
	io.to(room).emit(event, {
		...data,
		timestamp: Date.now(),
	});
};

const emitToAll = (event, data) => {
	if (!io) {
		throw new Error("Socket.IO non initialisé!");
	}
	io.emit(event, {
		...data,
		timestamp: Date.now(),
	});
};

module.exports = {
	init,
	getIO,
	emitToRoom,
	emitToAll,
};
