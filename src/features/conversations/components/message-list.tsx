"use client";

import { useEffect, useRef } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface MessageListProps {
  messages: ChatMessage[];
  loading?: boolean;
}

export function MessageList({ messages, loading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  if (messages.length === 0 && !loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-zinc-500">
          Escribe un mensaje para iniciar la conversación de prueba.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
              msg.role === "user"
                ? "rounded-br-sm bg-green-600 text-white"
                : "rounded-bl-sm bg-zinc-800 text-zinc-100"
            }`}
          >
            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
            <p
              className={`mt-1 text-xs ${
                msg.role === "user" ? "text-green-200" : "text-zinc-500"
              }`}
            >
              {new Date(msg.created_at).toLocaleTimeString("es-ES", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      ))}

      {loading && (
        <div className="flex justify-start">
          <div className="rounded-2xl rounded-bl-sm bg-zinc-800 px-4 py-3">
            <span className="flex gap-1 text-zinc-400">
              <span className="animate-bounce">·</span>
              <span className="animate-bounce [animation-delay:0.1s]">·</span>
              <span className="animate-bounce [animation-delay:0.2s]">·</span>
            </span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
