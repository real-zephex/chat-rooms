import { Messages } from "@/types/messages.types";
import { Server as SocketIOServer } from "socket.io";
import { v4 as uuidv4 } from "uuid";
  
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

let io: SocketIOServer | null = null;

// Initialize Socket.IO server
function initializeSocket(server: any) {
  if (io) return io;

  io = new SocketIOServer(server, {
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

    // Handle add_item
    socket.on("add_item", (data: { content: string; author: string }) => {
      const newItem: Messages = {
        id: uuidv4(),
        content: data.content,
        createdAt: new Date().toISOString(),
        author: data.author,
      };
      dataStore.push(newItem);
      io?.emit("item_added", newItem);
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
        io?.emit("item_deleted", { id: deletedItemId });
      }
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });

    socket.on("error", (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });

  return io;
}

export { initializeSocket };
