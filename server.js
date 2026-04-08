const { createServer } = require("http");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const PORT = process.env.PORT || 3005;

const onlineUsers = new Map();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(server, {
    cors: {
      origin: process.env.NEXTAUTH_URL || `http://localhost:${PORT}`,
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("user-join", (user) => {
      onlineUsers.set(socket.id, {
        id: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
      });
      io.emit("online-users", Array.from(onlineUsers.values()));
    });

    socket.on("join-channel", (channelId) => {
      const rooms = Array.from(socket.rooms);
      rooms.forEach((room) => {
        if (room !== socket.id) {
          socket.leave(room);
        }
      });
      socket.join(channelId);
    });

    socket.on("send-message", (message) => {
      socket.to(message.channelId).emit("new-message", message);
    });

    socket.on("delete-message", (data) => {
      io.to(data.channelId).emit("message-deleted", data);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      onlineUsers.delete(socket.id);
      io.emit("online-users", Array.from(onlineUsers.values()));
    });
  });

  server.listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});
