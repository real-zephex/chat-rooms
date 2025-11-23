import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { Messages } from "@/types/messages.types";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const dataStore: Messages[] = [
  {
    id: uuidv4(),
    content:
      "This is a real-time data showcase using Socket.IO. Changes made on the management page will instantly appear here.",
    createdAt: new Date().toISOString(),
    author: "System",
  },
  {
    id: uuidv4(),
    content:
      "Add, edit, or delete items below and see them update in real-time across all connected clients.",
    createdAt: new Date().toISOString(),
    author: "System",
  },
];

interface OnlineUser {
  id: string;
  username: string;
  connectedAt: string;
}

const onlineUsers: Map<string, OnlineUser> = new Map();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url || "", true);
    handle(req, res, parsedUrl);
  });

  const io = new SocketIOServer(server, {
    path: "/api/socket.io",
    addTrailingSlash: false,
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Send initial data
    socket.emit("initial_data", dataStore);

    // Handle user joining
    socket.on("user_join", (data: { username: string }) => {
      const user: OnlineUser = {
        id: socket.id,
        username: data.username || "Anonymous",
        connectedAt: new Date().toISOString(),
      };
      onlineUsers.set(socket.id, user);

      // Broadcast updated user list to all clients
      io.emit("users_updated", {
        count: onlineUsers.size,
        users: Array.from(onlineUsers.values()),
      });

      console.log(`User joined: ${user.username} (${socket.id})`);
    });

    // Handle add_item
    socket.on("add_item", (data: { content: string; author: string }) => {
      const newItem: Messages = {
        id: uuidv4(),
        content: data.content,
        createdAt: new Date().toISOString(),
        author: data.author,
      };
      dataStore.push(newItem);
      io.emit("item_added", newItem);
    });

    // Handle edit_item
    socket.on("edit_item", (data: { id: string; content: string }) => {
      const index = dataStore.findIndex((item) => item.id === data.id);
      if (index !== -1) {
        dataStore[index] = {
          ...dataStore[index],
          content: data.content,
          createdAt: new Date().toISOString(),
        };
        io.emit("item_updated", dataStore[index]);
      }
    });

    // Handle delete_item
    socket.on("delete_item", (data: { id: string }) => {
      const deleteIndex = dataStore.findIndex((item) => item.id === data.id);
      if (deleteIndex !== -1) {
        const deletedItemId = dataStore[deleteIndex].id;
        dataStore.splice(deleteIndex, 1);
        io.emit("item_deleted", { id: deletedItemId });
      }
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);

      // Remove user from online users
      const user = onlineUsers.get(socket.id);
      if (user) {
        onlineUsers.delete(socket.id);

        // Broadcast updated user list to all clients
        io.emit("users_updated", {
          count: onlineUsers.size,
          users: Array.from(onlineUsers.values()),
        });

        console.log(`User left: ${user.username} (${socket.id})`);
      }
    });

    socket.on("error", (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });

  const PORT = parseInt(process.env.PORT || "3000", 10);

  server.listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});
