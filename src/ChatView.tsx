import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Send, Image as ImageIcon, Trash2 } from "lucide-react";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  serverTimestamp,
  deleteDoc,
  doc
} from "firebase/firestore";
import { db } from "./App";
import { getAuth } from "firebase/auth";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const auth = getAuth();
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // Not throwing it globally to prevent app crash, just alert
  alert("Failed to send message: " + (error instanceof Error ? error.message : String(error)));
}

const compressImage = async (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        const maxDimension = 2000;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          let quality = 0.9;
          let dataUrl = canvas.toDataURL("image/jpeg", quality);
          while (dataUrl.length > 950000 && quality > 0.1) {
            quality -= 0.1;
            dataUrl = canvas.toDataURL("image/jpeg", quality);
          }
          resolve(dataUrl);
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

export const ChatView = ({ role, employeeIdx, employees, db }: any) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, "chat", "general", "messages"),
      orderBy("timestamp", "asc"),
      limit(100),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }, (error) => {
      console.error(error);
    });
    return () => unsubscribe();
  }, [db]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim()) return;

    const senderName =
      role === "manager"
        ? "Manager"
        : employees[employeeIdx]?.name || "Unknown";
    const senderColor =
      role === "manager" ? "#8B5CF6" : "#e60000";

    try {
      await addDoc(collection(db, "chat", "general", "messages"), {
        text: text.trim(),
        senderName,
        senderColor,
        timestamp: serverTimestamp(),
      });
      setText("");
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, "chat/general/messages");
    }
  };

  const handleImageSelect = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const base64 = await compressImage(file);
      
      if (base64 && base64.length > 1000000) {
        alert("Image is still too large after compression.");
        return;
      }

      const senderName =
        role === "manager"
          ? "Manager"
          : employees[employeeIdx]?.name || "Unknown";
      const senderColor =
        role === "manager"
          ? "#8B5CF6"
          : "#e60000";

      try {
        await addDoc(collection(db, "chat", "general", "messages"), {
          image: base64,
          senderName,
          senderColor,
          timestamp: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, "chat/general/messages");
      }
    };
    input.click();
  };

  const handleDelete = async (msgId: string) => {
    if (window.confirm("Delete this message?")) {
      try {
        await deleteDoc(doc(db, "chat", "general", "messages", msgId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `chat/general/messages/${msgId}`);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full bg-card rounded-xl shadow-xl overflow-hidden"
    >
      <div className="p-4 lg:p-6 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="font-display font-black text-lg lg:text-xl uppercase tracking-tight text-txt" aria-level="3">
            Team Chat
          </h3>
          <p className="text-xs text-txt3 font-mono">
            Discussions et partages d'images
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto w-full flex flex-col p-4 lg:p-6 space-y-4 no-scrollbar">
        {messages.map((msg) => {
          const isMe =
            role === "manager"
              ? msg.senderName === "Manager"
              : msg.senderName === employees[employeeIdx]?.name;
          return (
            <div
              key={msg.id}
              className={`flex flex-col group ${isMe ? "items-end" : "items-start"}`}
            >
              <div className="flex items-center gap-2 mb-1">
                {!isMe && (
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: msg.senderColor }}
                  />
                )}
                <span className="text-[10px] uppercase font-bold text-txt3 tracking-widest">
                  {msg.senderName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {role === "manager" && isMe && (
                  <button onClick={() => handleDelete(msg.id)} className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-all">
                    <Trash2 size={16} />
                  </button>
                )}
                <div
                  className={`max-w-[85%] rounded-xl p-3 shadow-sm flex-1 ${isMe ? "bg-accent text-white rounded-br-sm" : "bg-card2 border border-border text-txt rounded-bl-sm"}`}
                >
                  {msg.text && (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                  )}
                  {msg.image && (
                    <img
                      src={msg.image}
                      alt="uploaded"
                      className="rounded-xl mt-1 max-w-full max-h-64 object-contain bg-white"
                    />
                  )}
                </div>
                {role === "manager" && !isMe && (
                  <button onClick={() => handleDelete(msg.id)} className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-all">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSend}
        className="p-3 lg:p-4 border-t border-border bg-surf flex items-end gap-2"
      >
        <button
          type="button"
          onClick={handleImageSelect}
          className="p-3 bg-card2 hover:bg-border/30 rounded-xl transition-all text-txt2 flex-shrink-0"
        >
          <ImageIcon size={20} />
        </button>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Écrivez un message..."
          className="flex-1 bg-card2 border border-border rounded-xl p-3 text-sm min-h-[44px] max-h-32 focus:outline-none focus:border-accent transition-all resize-none shadow-inner"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="p-3 bg-accent hover:bg-accent/90 disabled:bg-accent/50 rounded-xl transition-all text-white flex-shrink-0"
        >
          <Send size={20} />
        </button>
      </form>
    </motion.div>
  );
};
