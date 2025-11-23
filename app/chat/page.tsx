"use client";

import { Messages } from "@/types/messages.types";
import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";

const ChatPage = () => {
  const [messages, setMessages] = useState<Messages[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("Anonymous");
  const [text, setText] = useState<string>("");

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const socket: Socket = io("/", {
      path: "/api/socket.io",
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;
    socket.on("connect", () => {
      console.log("Socket.IO connected");
      setIsConnected(true);
      setError(null);
    });

    socket.on("initial_data", (data: Messages[]) => {
      console.log("Received initial data");
      setMessages(data);
    });

    socket.on("item_added", (data: Messages) => {
      console.log(`Received new message from ${data.author}`);
      setMessages((prev) => [...prev, data]);
    });

    socket.on("disconnect", () => {
      console.log("Socket.IO disconnected");
      setIsConnected(false);
      setError("connection lost");
    });

    socket.on("connect_error", (error: Error) => {
      console.error("Socket.IO connection error:", error);
      setError("Connection error: " + error.message);
    });

    socket.on("error", (error: Error) => {
      console.error("Socket.IO error:", error.message);
      setError("Socket error");
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    function askUsername() {
      const dialog = prompt("What is your username");
      if (!dialog) askUsername();
      setUsername(dialog!);
    }

    askUsername();
  }, []);

  const handleNewMessage = (e: React.FormEvent) => {
    e.preventDefault();

    if (!text.trim()) {
      alert("Please enter a message");
      return;
    }

    if (socketRef.current) {
      socketRef.current.emit("add_item", {
        author: username || "Anonymous",
        content: text,
      });
    }

    setText("");
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-linenar-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 px-4 py-8">
      <div className="w-full max-w-2xl flex flex-col h-[90vh]">
        {/* Header */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4 shadow-sm rounded-t-lg">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Chat Room
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {isConnected ? "Connected" : "Disconnected"}
            </p>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
              <p className="font-semibold">Error</p>
              <p>{error}</p>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-slate-400 dark:text-slate-500">
                <svg
                  className="w-16 h-16 mx-auto mb-4 opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <p className="text-lg font-medium">No messages yet</p>
                <p className="text-sm mt-2">
                  Start a conversation by sending a message!
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className="flex gap-3 animate-fade-in">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {message.author.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {message.author}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatTime(message.createdAt)}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-lg px-4 py-2 mt-1 shadow-sm border border-slate-200 dark:border-slate-700">
                      <p className="text-slate-800 dark:text-slate-100 break-words">
                        {message.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Form */}
        <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 px-6 py-4 shadow-lg rounded-b-lg">
          <form onSubmit={handleNewMessage} className="space-y-4">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Enter your message here..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
              <button
                type="submit"
                disabled={!isConnected}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200 whitespace-nowrap"
              >
                Send
              </button>
            </div>
            {!isConnected && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Waiting for connection...
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
