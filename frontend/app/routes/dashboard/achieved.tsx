import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { fetchData, postData, updateData, deleteData } from "@/lib/fetch-util";
import { useAuth } from "@/provider/auth-context";
import type { User } from "@/types";

interface Message {
  _id: string;
  sender: User;
  content: string;
  type: string;
  createdAt: string;
  isEdited?: boolean;
  isDeleted?: boolean;
  readBy?: Array<{ user: User; readAt: string }>;
  reactions?: Array<{ emoji: string; user: User }>;
}

interface ConversationParticipant {
  user: User;
  joinedAt: string;
  lastReadAt?: string;
}

interface Conversation {
  _id: string;
  type: "direct" | "group" | "workspace";
  participants: ConversationParticipant[];
  name?: string;
  lastMessageText?: string;
  createdAt: string;
  unreadCount?: number;
  workspace?: { _id: string; name: string };
}

interface WorkspaceMember {
  user: User;
  role: string;
  joinedAt?: string;
}

interface Workspace {
  _id: string;
  name: string;
  description?: string;
  members: WorkspaceMember[];
}

const getInitials = (name: string) => {
  if (!name) return "U";
  return name.charAt(0).toUpperCase();
};

const Achieved = () => {
  const { user: currentUser } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("");
  const [workspaceMembers, setWorkspaceMembers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);
  
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editContent, setEditContent] = useState("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const currentConversationRef = useRef<Conversation | null>(null);

  useEffect(() => {
    currentConversationRef.current = currentConversation;
  }, [currentConversation]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await fetchData<Conversation[]>("/chat/conversations");
      setConversations(response);
      setError("");
    } catch (err) {
      console.error("Error fetching conversations:", err);
      setError("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkspaces = async () => {
    try {
      const response = await fetchData<Workspace[]>("/workspaces");
      setWorkspaces(response || []);
    } catch (err) {
      console.error("Error fetching workspaces:", err);
    }
  };

  const getWorkspaceMembers = async (workspaceId: string) => {
    try {
      const workspace = await fetchData<Workspace>(`/workspaces/${workspaceId}`);
      if (workspace && workspace.members && Array.isArray(workspace.members)) {
        const otherMembers = workspace.members
          .filter(member => member && member.user && member.user._id !== currentUser?._id)
          .map(member => member.user)
          .filter(user => user && user._id);
        setWorkspaceMembers(otherMembers);
      } else {
        setWorkspaceMembers([]);
      }
    } catch (err) {
      console.error("Error fetching workspace members:", err);
      setWorkspaceMembers([]);
      setError("Failed to load workspace members");
    }
  };

  const handleWorkspaceChange = (workspaceId: string) => {
    setSelectedWorkspace(workspaceId);
    if (workspaceId) getWorkspaceMembers(workspaceId);
    else setWorkspaceMembers([]);
    setSearchTerm("");
  };

const createWorkspaceChat = async (workspaceId: string) => {
  try {
    // ✅ 1. Check đã tồn tại chưa
    const existingConv = conversations.find(
      (conv) =>
        conv.type === "workspace" &&
        conv.workspace?._id === workspaceId
    );

    if (existingConv) {
      // 👉 Nếu đã có → mở luôn
      await selectConversation(existingConv);
      setShowNewChatModal(false);
      return;
    }

    // ✅ 2. Nếu chưa có → gọi API tạo
    const response = await fetchData<Conversation>(
      `/chat/conversations/workspace/${workspaceId}`
    );

    // ✅ 3. Tránh duplicate nếu backend vẫn trả lại cái cũ
    setConversations((prev) => {
      const exists = prev.some((c) => c._id === response._id);
      if (exists) return prev;
      return [response, ...prev];
    });

    await selectConversation(response);
    setShowNewChatModal(false);
  } catch (err) {
    console.error("Error creating workspace chat:", err);
    setError("Failed to create  chat");
  }
};

  const fetchMessages = async (conversationId: string) => {
    try {
      setLoading(true);
      const response = await fetchData<{ messages: Message[] }>(`/chat/conversations/${conversationId}/messages`);
      setMessages(response.messages || []);
      setError("");
    } catch (err) {
      console.error("Error fetching messages:", err);
      setError("Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  const markConversationAsRead = async (conversationId: string) => {
    try {
      await postData(`/chat/conversations/${conversationId}/read`, {});
      setConversations(prev => prev.map(conv => conv._id === conversationId ? { ...conv, unreadCount: 0 } : conv));
    } catch (err) {
      console.error("Error marking as read:", err);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentConversation) return;
    try {
      const response = await postData<Message>(`/chat/conversations/${currentConversation._id}/messages`, { content: newMessage, type: "text" });
      if (socketRef.current && socketConnected) {
        socketRef.current.emit("send-message", { conversationId: currentConversation._id, messageData: response });
      }
      setMessages(prev => {
        if (prev.some(m => m._id === response._id)) return prev;
        return [...prev, response];
      });
      setConversations(prev => {
        const convIndex = prev.findIndex(c => c._id === currentConversation._id);
        if (convIndex === -1) return prev;
        const updatedConv = { ...prev[convIndex], lastMessageText: newMessage };
        const newConvs = [...prev];
        newConvs.splice(convIndex, 1);
        return [updatedConv, ...newConvs];
      });
      setNewMessage("");
      scrollToBottom();
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Failed to send message");
    }
  };

  const editMessage = async () => {
    if (!editingMessage || !editContent.trim()) return;
    try {
      await updateData<Message>(`/chat/messages/${editingMessage._id}`, { content: editContent });
      setMessages(prev => prev.map(msg => msg._id === editingMessage._id ? { ...msg, content: editContent, isEdited: true } : msg));
      if (socketRef.current && socketConnected) {
        socketRef.current.emit("edit-message", { messageId: editingMessage._id, content: editContent, conversationId: currentConversation?._id });
      }
      setConversations(prev => prev.map(conv => conv._id === currentConversation?._id ? { ...conv, lastMessageText: editContent } : conv));
      setEditingMessage(null);
      setEditContent("");
    } catch (err) {
      console.error("Error editing message:", err);
      setError("Failed to edit message");
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      await deleteData(`/chat/messages/${messageId}`);
      setMessages(prev => prev.map(msg => msg._id === messageId ? { ...msg, isDeleted: true, content: "Tin nhắn đã bị thu hồi" } : msg));
      if (socketRef.current && socketConnected) {
        socketRef.current.emit("delete-message", { messageId, conversationId: currentConversation?._id });
      }
    } catch (err) {
      console.error("Error deleting message:", err);
    }
  };

  const addReaction = async (messageId: string, emoji: string) => {
    try {
      const response = await postData<{ reactions: Array<{ emoji: string; user: User }> }>(`/chat/messages/${messageId}/reactions`, { emoji });
      setMessages(prev => prev.map(msg => msg._id === messageId ? { ...msg, reactions: response.reactions } : msg));
      setConversations(prev => prev.map(conv => conv._id === currentConversation?._id ? { ...conv, lastMessageText: "Bạn đã bày tỏ cảm xúc" } : conv));
    } catch (err) {
      console.error("Error adding reaction:", err);
    }
  };

  const createDirectConversation = async (userId: string, userName: string) => {
    if (!userId) return;
    try {
      const existingConv = conversations.find(conv => {
        if (conv.type === "direct") {
          const otherUser = conv.participants.find(p => p.user._id !== currentUser?._id);
          return otherUser?.user._id === userId;
        }
        return false;
      });
      if (existingConv) {
        await selectConversation(existingConv);
        setShowNewChatModal(false);
        return;
      }
      const response = await fetchData<Conversation>(`/chat/conversations/direct/${userId}`);
      setConversations([response, ...conversations]);
      await selectConversation(response);
      setShowNewChatModal(false);
      setError("");
    } catch (err) {
      console.error("Error creating conversation:", err);
      setError("Failed to create conversation");
    }
  };

  const selectConversation = async (conv: Conversation) => {
    setCurrentConversation(conv);
    if (socketRef.current && socketConnected) {
      socketRef.current.emit("join-conversation", conv._id);
    }
    await fetchMessages(conv._id);
    await markConversationAsRead(conv._id);
  };

  const filteredMembers = workspaceMembers.filter(member => {
    if (!member) return false;
    const name = member.name || "";
    const email = member.email || "";
    const search = searchTerm.toLowerCase();
    return name.toLowerCase().includes(search) || email.toLowerCase().includes(search);
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const getReadStatus = (message: Message) => {
    if (!message.readBy) return null;
    const otherReaders = message.readBy.filter(r => r.user._id !== currentUser?._id);
    if (otherReaders.length === 0) return "sent";
    if (otherReaders.length === 1) return "read";
    return "read_by_all";
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !currentUser) return;
    const socket = io(import.meta.env.VITE_API_URL?.replace("/api-v1", "") || "http://localhost:5001", { auth: { token }, reconnection: true });

    socket.on("connect", () => setSocketConnected(true));
    socket.on("disconnect", () => setSocketConnected(false));

    socket.on("new-message", (data: any) => {
      const message = data.message || data; 
      const convId = data.conversationId || message.conversation || currentConversationRef.current?._id;
      if (convId === currentConversationRef.current?._id) {
        setMessages(prev => {
          if (prev.some(m => m._id === message._id)) return prev;
          return [...prev, message];
        });
        scrollToBottom();
      }
      if (convId) {
        setConversations(prev => {
          const convIndex = prev.findIndex(c => c._id === convId);
          if (convIndex === -1) return prev; 
          const isCurrentConv = convId === currentConversationRef.current?._id;
          const updatedConv = { 
            ...prev[convIndex], 
            lastMessageText: message.content,
            unreadCount: isCurrentConv ? 0 : (prev[convIndex].unreadCount || 0) + 1
          };
          const newConvs = [...prev];
          newConvs.splice(convIndex, 1);
          return [updatedConv, ...newConvs];
        });
      }
    });

    // BẮT SỰ KIỆN EDIT MẠNH MẼ HƠN
    socket.on("message-edited", (data: any) => {
      // Bóc tách bao quát mọi kiểu object từ Backend trả về
      const msgId = data.messageId || data._id || (data.message && data.message._id);
      const newContent = data.content || (data.message && data.message.content);
      const convId = data.conversationId || data.conversation || (data.message && data.message.conversation);

      if (!msgId || !newContent) return; // Bảo vệ nếu data lỗi

      // 1. Cập nhật trong màn hình chat
      setMessages(prev => prev.map(msg => 
        msg._id === msgId ? { ...msg, content: newContent, isEdited: true } : msg
      ));
      
      // 2. Cập nhật preview bên Sidebar (nếu cần)
      setConversations(prev => prev.map(conv => {
        if (conv._id === convId || conv._id === currentConversationRef.current?._id) {
          return { ...conv, lastMessageText: newContent };
        }
        return conv;
      }));
    });

    socket.on("message-deleted", (messageId: string) => {
      setMessages(prev => prev.map(msg => msg._id === messageId ? { ...msg, isDeleted: true, content: "Tin nhắn đã bị thu hồi" } : msg));
    });

    socket.on("messages-read", (data: { conversationId: string; userId: string }) => {
      if (data.conversationId === currentConversationRef.current?._id) {
        setMessages(prev => prev.map(msg => {
          if (msg.sender._id === currentUser?._id && !msg.readBy?.some(r => r.user._id === data.userId)) {
            return { ...msg, readBy: [...(msg.readBy || []), { user: { _id: data.userId } as User, readAt: new Date().toISOString() }] };
          }
          return msg;
        }));
      }
    });

    socket.on("reaction-added", (data: { messageId: string; reactions: any[]; conversationId?: string; user?: any }) => {
      setMessages(prev => {
        const msgIndex = prev.findIndex(m => m._id === data.messageId);
        if (msgIndex !== -1) {
          setConversations(cPrev => cPrev.map(c => c._id === currentConversationRef.current?._id ? { ...c, lastMessageText: data.user?.name ? `${data.user.name} đã bày tỏ cảm xúc` : "Ai đó đã bày tỏ cảm xúc" } : c));
        }
        return prev.map(msg => msg._id === data.messageId ? { ...msg, reactions: data.reactions } : msg);
      });
    });

    socketRef.current = socket;
    return () => { socket.disconnect(); };
  }, [currentUser]);

  useEffect(() => { scrollToBottom(); }, [messages]);
  useEffect(() => { fetchConversations(); fetchWorkspaces(); }, []);

  const getConversationName = (conv: Conversation): string => {
    if (conv.type === "direct") {
      const otherUser = conv.participants?.find((p) => p.user?._id !== currentUser?._id);
      return otherUser?.user?.name || "Người dùng ẩn";
    }
    if (conv.type === "workspace" && conv.workspace) return `${conv.workspace.name}`;
    return conv.name || "Nhóm";
  };

  if (!currentUser) return <div style={{ display: "flex", justifyContent: "center", height: "100vh", alignItems: "center" }}>Loading...</div>;

  return (
    <>
      <style>{`
        .zalo-scroll::-webkit-scrollbar { width: 6px; }
        .zalo-scroll::-webkit-scrollbar-track { background: transparent; }
        .zalo-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .zalo-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        .no-horizontal-scroll { overflow-x: hidden !important; }
      `}</style>

      <div style={{ display: "flex", height: "calc(100vh - 40px)", margin: "20px auto", maxWidth: "1400px", borderRadius: "12px", boxShadow: "0 8px 30px rgba(0,0,0,0.08)", overflow: "hidden", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", backgroundColor: "#fff" }}>
        
        {/* SIDEBAR */}
        <div style={{ width: "340px", borderRight: "1px solid #e5e7eb", display: "flex", flexDirection: "column", backgroundColor: "#fff" }}>
          <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9" }}>
            <h2 style={{ margin: 0, fontSize: "22px", fontWeight: "700", color: "#0f172a" }}>Chats</h2>
            <button onClick={() => setShowNewChatModal(true)} style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "#f1f5f9", color: "#0f172a", border: "none", cursor: "pointer", fontSize: "22px", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#e2e8f0"} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#f1f5f9"}>+</button>
          </div>

          <div className="zalo-scroll" style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
            {loading && !conversations.length ? (
              <div style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>Đang tải...</div>
            ) : conversations.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
                Chưa có tin nhắn nào.<br />
                <button onClick={() => setShowNewChatModal(true)} style={{ marginTop: "16px", padding: "10px 20px", backgroundColor: "#0068ff", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}>Bắt đầu trò chuyện</button>
              </div>
            ) : (
              conversations.map((conv) => {
                const convName = getConversationName(conv);
                const isActive = currentConversation?._id === conv._id;
                
                return (
                  <div key={conv._id} onClick={() => selectConversation(conv)} style={{ display: "flex", alignItems: "center", padding: "12px", marginBottom: "4px", backgroundColor: isActive ? "#e5efff" : "transparent", borderRadius: "12px", cursor: "pointer", transition: "background 0.2s" }} onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = "#f8fafc"; }} onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = "transparent"; }}>
                    <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: isActive ? "#0068ff" : "#cbd5e1", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: "bold", marginRight: "12px", flexShrink: 0 }}>
                      {getInitials(convName)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
                        <div style={{ fontWeight: isActive ? "700" : "600", fontSize: "15px", color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{convName}</div>
                        {conv.type !== "direct" && <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "10px", backgroundColor: "#e2e8f0", color: "#475569", marginLeft: "8px", flexShrink: 0 }}>Nhóm</span>}
                      </div>
                      <div style={{ fontSize: "13px", color: conv.unreadCount ? "#0f172a" : "#64748b", fontWeight: conv.unreadCount ? "600" : "400", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {conv.lastMessageText || "Chưa có tin nhắn"}
                      </div>
                    </div>
                    {conv.unreadCount ? <div style={{ backgroundColor: "#ef4444", color: "white", borderRadius: "10px", padding: "2px 6px", fontSize: "11px", fontWeight: "bold", marginLeft: "10px", minWidth: "20px", textAlign: "center" }}>{conv.unreadCount > 9 ? "9+" : conv.unreadCount}</div> : null}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* CHAT AREA */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", backgroundColor: "#e2e8f0" }}>
          {currentConversation ? (
            <>
              {/* Header */}
              <div style={{ padding: "16px 24px", backgroundColor: "#fff", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center" }}>
                <div style={{ width: "42px", height: "42px", borderRadius: "50%", backgroundColor: "#0068ff", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: "bold", marginRight: "12px" }}>
                  {getInitials(getConversationName(currentConversation))}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "17px", color: "#0f172a" }}>{getConversationName(currentConversation)}</h3>
                  <div style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>
                    {currentConversation.type === "direct" ? "Trò chuyện trực tiếp" : "Trò chuyện nhóm"}
                  </div>
                </div>
              </div>

              {/* Messages Body */}
              <div className="zalo-scroll no-horizontal-scroll" style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column" }}>
                {messages.length === 0 ? (
                  <div style={{ margin: "auto", textAlign: "center", color: "#64748b", backgroundColor: "rgba(255,255,255,0.6)", padding: "12px 24px", borderRadius: "20px", fontSize: "14px" }}>
                    Hãy là người đầu tiên gửi tin nhắn!
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOwn = msg.sender?._id === currentUser._id;
                    const readStatus = getReadStatus(msg);
                    
                    // --- ĐỊNH NGHĨA MENU ACTION TẠI ĐÂY ---
                    const actionMenu = !msg.isDeleted && (
                      <div className="message-actions" style={{
                        display: "flex", alignItems: "center", gap: "2px",
                        opacity: 0, transition: "opacity 0.2s", padding: "0 6px",
                      }}>
                         <button onClick={() => navigator.clipboard.writeText(msg.content)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", padding: "4px" }} title="Sao chép">📋</button>

                         <div style={{ position: "relative", display: "flex" }}
                              onMouseEnter={(e) => {
                                const picker = e.currentTarget.querySelector('.emoji-picker');
                                if (picker) (picker as HTMLElement).style.display = 'block';
                              }}
                              onMouseLeave={(e) => {
                                const picker = e.currentTarget.querySelector('.emoji-picker');
                                if (picker) (picker as HTMLElement).style.display = 'none';
                              }}
                         >
                            <button style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#64748b", display: "flex", alignItems: "center", transition: "color 0.2s" }} 
  onMouseEnter={(e) => e.currentTarget.style.color = "#0068ff"}
  onMouseLeave={(e) => e.currentTarget.style.color = "#64748b"}
  title="Bày tỏ cảm xúc"
>
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
    <line x1="9" y1="9" x2="9.01" y2="9"></line>
    <line x1="15" y1="9" x2="15.01" y2="9"></line>
  </svg>
</button>
                            
                            {/* Dùng paddingBottom thay vì marginBottom để lấp đầy "vùng chết" khi di chuột lên */}
                            <div className="emoji-picker" style={{
                              display: "none", position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)",
                              paddingBottom: "8px", zIndex: 20
                            }}>
                               <div style={{
                                 backgroundColor: "#fff", padding: "6px", borderRadius: "20px",
                                 boxShadow: "0 4px 12px rgba(0,0,0,0.15)", display: "flex", gap: "4px"
                               }}>
                                 {["👍", "❤️", "😂", "😮", "😢"].map(emoji => (
                                   <button key={emoji} onClick={() => addReaction(msg._id, emoji)} style={{ background: "none", border: "none", fontSize: "16px", cursor: "pointer", padding: "4px", transition: "transform 0.1s" }} onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.9)"} onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}>{emoji}</button>
                                 ))}
                               </div>
                            </div>
                         </div>

                         {isOwn && (
                           <>
                             <button onClick={() => { setEditingMessage(msg); setEditContent(msg.content); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", padding: "4px" }} title="Sửa">✏️</button>
                             <button onClick={() => deleteMessage(msg._id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", padding: "4px" }} title="Thu hồi">🗑️</button>
                           </>
                         )}
                      </div>
                    );

                    return (
                      <div key={msg._id} style={{ marginBottom: "20px", display: "flex", justifyContent: isOwn ? "flex-end" : "flex-start", alignItems: "flex-end" }}>
                        {!isOwn && (
                          <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "#cbd5e1", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "bold", marginRight: "8px", flexShrink: 0 }}>
                            {getInitials(msg.sender?.name)}
                          </div>
                        )}

                        {/* GÓI CHUNG bong bóng chat và action menu vào một div để chúng dính lấy nhau */}
                        <div style={{
                                display: "flex", 
                                flexDirection: isOwn ? "row-reverse" : "row", 
                                alignItems: "center", 
                                maxWidth: "80%" 
                             }}
                             onMouseEnter={(e) => {
                               const menu = e.currentTarget.querySelector('.message-actions');
                               if (menu) (menu as HTMLElement).style.opacity = '1';
                             }}
                             onMouseLeave={(e) => {
                               const menu = e.currentTarget.querySelector('.message-actions');
                               if (menu) (menu as HTMLElement).style.opacity = '0';
                             }}
                        >
                          {/* Message Bubble */}
                          <div style={{
                            padding: "12px 16px", borderRadius: "16px",
                            borderBottomRightRadius: isOwn ? "4px" : "16px",
                            borderBottomLeftRadius: !isOwn ? "4px" : "16px",
                            backgroundColor: msg.isDeleted ? "transparent" : (isOwn ? "#e5efff" : "#fff"),
                            border: msg.isDeleted ? "1px solid #cbd5e1" : "none",
                            color: msg.isDeleted ? "#94a3b8" : "#0f172a",
                            boxShadow: msg.isDeleted ? "none" : "0 1px 2px rgba(0,0,0,0.05)",
                            position: "relative", wordBreak: "break-word", whiteSpace: "pre-wrap",
                          }}>
                            {!isOwn && !msg.isDeleted && <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px", fontWeight: "600" }}>{msg.sender?.name}</div>}
                            
                            <div style={{ fontStyle: msg.isDeleted ? "italic" : "normal", fontSize: "15px", lineHeight: "1.5" }}>{msg.content}</div>
                            
                            {msg.reactions && msg.reactions.length > 0 && !msg.isDeleted && (
                              <div style={{ position: "absolute", bottom: "-12px", right: isOwn ? "auto" : "-10px", left: isOwn ? "-10px" : "auto", display: "flex", gap: "2px", backgroundColor: "#fff", padding: "2px 4px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", zIndex: 5 }}>
                                {Array.from(new Set(msg.reactions.map(r => r.emoji))).map((emoji, idx) => (
                                  <span key={idx} style={{ fontSize: "12px" }}>{emoji}</span>
                                ))}
                                {msg.reactions.length > 1 && <span style={{ fontSize: "11px", color: "#64748b", marginLeft: "2px", fontWeight: "bold" }}>{msg.reactions.length}</span>}
                              </div>
                            )}
                            
                            <div style={{ fontSize: "11px", marginTop: "6px", color: msg.isDeleted ? "#cbd5e1" : "#94a3b8", textAlign: "right", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px" }}>
                              <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              {msg.isEdited && !msg.isDeleted && <span>(đã sửa)</span>}
                              {isOwn && !msg.isDeleted && readStatus && (
                                <span style={{ color: readStatus.includes("read") ? "#0068ff" : "#94a3b8" }}>
                                  {readStatus === "sent" ? "✓" : "✓✓"}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action Menu sẽ luôn nằm ngay bên cạnh bubble */}
                          {actionMenu}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div style={{ padding: "16px 24px", backgroundColor: "#fff", borderTop: "1px solid #e5e7eb", display: "flex", gap: "12px", alignItems: "center" }}>
                <input
                  type="text" value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Nhập tin nhắn tới cộng sự..."
                  style={{ flex: 1, padding: "14px 20px", backgroundColor: "#f1f5f9", border: "none", borderRadius: "24px", fontSize: "15px", outline: "none", color: "#0f172a" }}
                />
                <button onClick={sendMessage} disabled={!newMessage.trim()} style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: newMessage.trim() ? "#0068ff" : "#cbd5e1", color: "white", border: "none", cursor: newMessage.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s", flexShrink: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2.01 21L23 12L2.01 3L2 10l15 2-15 2z" fill="currentColor"/>
                  </svg>
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#64748b", flexDirection: "column", gap: "16px" }}>
              <div style={{ width: "120px", height: "120px", backgroundColor: "#f1f5f9", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "40px" }}>💬</div>
              <div style={{ fontSize: "16px", fontWeight: "500" }}>Chọn một hội thoại để bắt đầu</div>
            </div>
          )}
        </div>

        {/* Modal tạo nhóm */}
        {showNewChatModal && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(2px)" }} onClick={() => setShowNewChatModal(false)}>
            <div style={{ backgroundColor: "white", borderRadius: "16px", width: "90%", maxWidth: "460px", maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }} onClick={(e) => e.stopPropagation()}>
              <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, fontSize: "18px", color: "#0f172a" }}>Tạo cuộc trò chuyện mới</h3>
                <button onClick={() => setShowNewChatModal(false)} style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: "#94a3b8" }}>&times;</button>
              </div>

              <div className="zalo-scroll" style={{ padding: "24px", overflowY: "auto" }}>
                <div style={{ marginBottom: "24px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#334155", fontSize: "14px" }}>Nhắn tin với thành viên</label>
                  <select value={selectedWorkspace} onChange={(e) => handleWorkspaceChange(e.target.value)} style={{ width: "100%", padding: "12px", border: "1px solid #e2e8f0", borderRadius: "8px", marginBottom: "16px", fontSize: "14px", outline: "none" }}>
                    <option value="">Chọn tháng công nợ...</option>
                    {workspaces.map((workspace) => <option key={workspace._id} value={workspace._id}>{workspace.name}</option>)}
                  </select>

                  {selectedWorkspace && (
                    <>
                      <input type="text" placeholder="Tìm kiếm tên..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: "100%", padding: "12px", border: "1px solid #e2e8f0", borderRadius: "8px", marginBottom: "16px", fontSize: "14px", outline: "none" }} />
                      <div className="zalo-scroll" style={{ maxHeight: "250px", overflowY: "auto" }}>
                        {filteredMembers.length === 0 ? <div style={{ textAlign: "center", padding: "20px", color: "#94a3b8", fontSize: "14px" }}>Không tìm thấy thành viên</div> : (
                          filteredMembers.map((member) => (
                            <div key={member._id} onClick={() => createDirectConversation(member._id, member.name)} style={{ padding: "12px", marginBottom: "8px", backgroundColor: "#f8fafc", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center" }}>
                              <div style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "#cbd5e1", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", marginRight: "12px" }}>{getInitials(member.name)}</div>
                              <div>
                                <div style={{ fontWeight: "600", color: "#0f172a", fontSize: "14px" }}>{member.name || "Người dùng ẩn"}</div>
                                <div style={{ fontSize: "12px", color: "#64748b" }}>{member.email || "Không có email"}</div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#334155", fontSize: "14px" }}>Tạo nhóm Workspace</label>
                  <select onChange={(e) => { if (e.target.value) createWorkspaceChat(e.target.value); }} style={{ width: "100%", padding: "12px", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "14px", outline: "none" }}>
                    <option value="">Chọn tháng công nợ để tạo...</option>
                    {workspaces.map((workspace) => <option key={workspace._id} value={workspace._id}>{workspace.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editingMessage && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(2px)" }}>
            <div style={{ backgroundColor: "white", borderRadius: "16px", padding: "24px", width: "90%", maxWidth: "460px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
              <h3 style={{ marginTop: 0, marginBottom: "16px", color: "#0f172a", fontSize: "18px" }}>Sửa tin nhắn</h3>
              <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} style={{ width: "100%", padding: "12px", border: "1px solid #e2e8f0", borderRadius: "8px", marginBottom: "20px", minHeight: "100px", fontSize: "14px", outline: "none", resize: "none", fontFamily: "inherit" }} />
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button onClick={() => setEditingMessage(null)} style={{ padding: "10px 16px", border: "1px solid #e2e8f0", background: "white", color: "#334155", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}>Hủy</button>
                <button onClick={editMessage} style={{ padding: "10px 20px", backgroundColor: "#0068ff", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}>Lưu</button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div style={{ position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#ef4444", color: "white", padding: "12px 24px", borderRadius: "30px", zIndex: 1000, fontWeight: "500", boxShadow: "0 4px 12px rgba(239, 68, 68, 0.3)" }}>
            {error}
          </div>
        )}
      </div>
    </>
  );
};

export default Achieved;