import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./MainPage.css";
import io from "socket.io-client";
import axios from "../axiosInstance.js";
import { LogOut, User, UserPlus, Send, Users } from "lucide-react";
import { Link } from "react-router-dom";

const formatTimeAgo = (date) => {
  if (!date) return "";
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(date).toLocaleDateString();
};

function MainPage() {
  const navigate = useNavigate();

  // STATES
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState("");
  const [allChats, setAllChats] = useState({});
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [searchName, setSearchName] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [activeFriendName, setActiveFriendName] = useState("");
  const [showRequests, setShowRequests] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState([{ role: 'bot', text: 'Hello! I am your assistant. How can I help with your contacts today?' }]);
  const [aiInput, setAiInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [viewProfile, setViewProfile] = useState(null);

  const messagesEndRef = useRef(null);
  const socket = useRef(null);
  const aiMessagesEndRef = useRef(null);
  
  const activeChatRef = useRef(activeChatId);

  useEffect(() => {
    activeChatRef.current = activeChatId;
  }, [activeChatId]);

  // AUTH CHECK
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await axios.get("/api/auth/me");
        setUser(res.data.user);
      } catch {
        navigate("/login");
      }
    };
    checkAuth();
  }, [navigate]);

  // SOCKET INIT
  useEffect(() => {
    if (!socket.current) {
      socket.current = io(import.meta.env.VITE_API_URL, { 
        withCredentials: true,
        reconnection: true, 
        reconnectionAttempts: 5
      });
    }

    const s = socket.current;

    if (user?._id) {
      s.emit("join_user_room", user._id);
      console.log("Socket: Joined user room", user._id);
    }

    const handleIncomingMessage = (data) => {
      setAllChats((prev) => ({
        ...prev,
        [data.chatId]: [...(prev[data.chatId] || []), data],
      }));

      if (data.chatId === activeChatRef.current) {
        setMessages((prev) => [...prev, data]);
      }

      setUnreadCounts((prev) => {
        if (data.sender === user?._id) return prev;
        if (data.chatId === activeChatRef.current) {
          return { ...prev, [data.chatId]: 0 };
        }
        return { ...prev, [data.chatId]: (prev[data.chatId] || 0) + 1 };
      });
    };

    const handleFriendUpdate = () => {
      loadFriends();
      loadRequests();
      loadSentRequests();
    };

    s.on("connect", () => {
      if (user?._id) s.emit("join_user_room", user._id);
    });

    s.on("online_users", (users) => setOnlineUsers(users));
    s.on("receive_message", handleIncomingMessage);
    s.on("friend_request_received", () => loadRequests());
    s.on("friend_request_accepted", handleFriendUpdate);
    s.on("friend_request_rejected", () => loadSentRequests());
    s.on("friend_request_canceled", () => {
      loadRequests();
      loadSentRequests();
    });
    s.on("friend_deleted", () => {
    console.log("Socket: You were removed by a friend");
    loadFriends(); // Refresh the list so they disappear!
  });

    return () => {
      s.off("connect");
      s.off("online_users");
      s.off("receive_message", handleIncomingMessage);
      s.off("friend_request_received");
      s.off("friend_request_accepted", handleFriendUpdate);
      s.off("friend_request_rejected");
      s.off("friend_request_canceled");
      s.off("friend_deleted");
    };
  }, [user]); 

  // AI CHATBOT LOGIC
  const handleAiSend = async () => {
    if (!aiInput.trim() || isAiLoading) return;
    const userMessage = aiInput;
    setAiInput("");
    setAiMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setIsAiLoading(true);

try {
    const res = await axios.post("/api/ai/chat", {
      message: userMessage,
      userId: user?._id
    });
    
    setAiMessages((prev) => [...prev, { role: "bot", text: res.data.text }]);

    if (res.data.refreshData) {
      // THE FIX: Refresh everything so your UI stays in sync
      loadFriends();
      loadRequests();
      loadSentRequests(); // 👈 Don't forget this one!
    }
  } catch (err) {
      const backendText = err.response?.data?.text;
      setAiMessages((prev) => [
        ...prev,
        { role: "bot", text: backendText || "Sorry, I'm having trouble connecting to my brain right now." }
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    aiMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // LOAD DATA
  const loadFriends = async () => {
    if (!user) return;
    try {
      const res = await axios.get("/api/contacts/friends");
      setFriends(res.data);
      if (socket.current) {
        res.data.forEach((friend) => {
          socket.current.emit("join_room", friend._id);
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadRequests = async () => {
    if (!user) return;
    const res = await axios.get("/api/contacts/pending");
    setRequests(res.data);
  };

  const loadSentRequests = async () => {
    if (!user) return;
    const res = await axios.get("/api/contacts/sent");
    setSentRequests(res.data.map((r) => r.receiver._id));
  };

  useEffect(() => {
    if (user) {
      loadFriends();
      loadRequests();
      loadSentRequests();
    }
  }, [user]);

  // ACTIONS
  const joinChat = async (chatId) => {
    if (!user) return;
    try {
      const res = await axios.get(`/api/messages/${chatId}`);
      setMessages(res.data);
    } catch (err) {
      console.error(err);
    }
    setActiveChatId(chatId);
    socket.current.emit("join_room", chatId);
    setUnreadCounts((prev) => ({ ...prev, [chatId]: 0 }));
  };

  const sendMessage = async () => {
    if (!message.trim() || !activeChatId || !user) return;
    if (isSending) return;
    setIsSending(true);
    const data = { chatId: activeChatId, sender: user._id, message };
    try {
      socket.current.emit("send_message", data);
      setMessage("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const handleSearch = async () => {
    if (!searchName.trim()) return;
    try {
      const res = await axios.get(`/api/users/search?name=${searchName}`);
      setSearchResults(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const sendFriendRequest = async (receiverId) => {
    try {
      const res = await axios.post("/api/contacts/request", { receiverId });
      alert(res.data.message);
      loadSentRequests();
    } catch (err) {
      alert(err.response?.data?.message || "Error sending request");
    }
  };

  const acceptRequest = async (requestId) => {
    try {
      await axios.post("/api/contacts/accept", { requestId });
      loadRequests();
      loadFriends();
      loadSentRequests();
    } catch (err) {
      console.error(err);
    }
  };

  const rejectRequest = async (requestId) => {
    try {
      await axios.post("/api/contacts/reject", { requestId });
      loadRequests();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteFriend = async (contactId) => {
    try {
      await axios.delete(`/api/contacts/delete/${contactId}`);
      loadFriends();
    } catch (err) {
      console.error("Delete friend error:", err);
    }
  };

  const cancelFriendRequest = async (receiverId) => {
    try {
      await axios.post("/api/contacts/cancel", { receiverId });
      loadSentRequests();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post("/api/auth/logout");
      setUser(null);
      navigate("/login");
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  return (
    <div className="chat-container">
      <aside className="sidebar">
        <div className="sidebar-top">
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
          <button className="profile-btn2" onClick={() => navigate("/profile")}>
            <User size={18} />
            <span>Profile</span>
          </button>
        </div>

        {/* FRIENDS */}
        <div className="friends-section">
          <div className="section-title">
            <Users size={16} />
            <h2>Friends</h2>
          </div>
          <div className="friends-list">
            {friends.map((friend) => {
              const friendUser = friend.sender._id === user._id ? friend.receiver : friend.sender;
              return (
                <button
                  key={friend._id}
                  className={`friend-item ${activeChatId === friend._id ? "active" : ""}`}
                  onClick={() => {
                    joinChat(friend._id);
                    setActiveFriendName(friendUser.username);
                  }}
                >
                  <div className="friend-avatar-wrapper">
                    <img
                      src="https://cdn-icons-png.flaticon.com/512/149/149071.png"
                      alt={friendUser.username}
                    />
                    <span
                      className={`online-dot ${
                        onlineUsers.some(id => String(id) === String(friendUser._id)) 
                          ? "online" 
                          : "offline"
                      }`}
                    />
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                    <span className="friend-username">{friendUser.username}</span>
                    <button
                      className="delete-friend-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteFriend(friend._id);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  {unreadCounts[friend._id] > 0 && (
                    <span className="unread-badge">{unreadCounts[friend._id]}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* REQUESTS */}
        <button className="requests-toggle" onClick={() => setShowRequests(true)}>
          <UserPlus size={16} />
          <span>Friend Requests</span>
          <div className="badge">{requests.length}</div>
        </button>
        {showRequests && (
          <div className="modal-overlay" onClick={() => setShowRequests(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3>Friend Requests</h3>
              {requests.length === 0 && <p>No pending requests</p>}
              {requests.map((req) => (
                <div key={req._id} className="modal-request-item">
                  <Link 
  to={`/profile/${req.sender._id}`} 
  className="request-username"
>
  {req.sender?.username}
</Link>
                  <div>
                    <button className="AcceptFriendRequest" onClick={() => acceptRequest(req._id)}>Accept</button>
                    <button className="RejectFriendRequest" onClick={() => rejectRequest(req._id)}>Reject</button>
                  </div>
                </div>
              ))}
              <button className="close-btn" onClick={() => setShowRequests(false)}>
                Close
              </button>
            </div>
          </div>
        )}

        {/* SEARCH */}
        <div className="search-section">
          <h3>Search Users</h3>
          <input
            type="text"
            placeholder="Type username..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
          />
          <button onClick={handleSearch}>Search</button>
          <div className="search-results-container">
            {searchResults.map((userObj) => {
              if (userObj._id === user?._id) return null;
              const isFriend = friends.some(
                (f) => f.sender._id === userObj._id || f.receiver._id === userObj._id
              );
              const requestReceived = requests.find((r) => r.sender?._id === userObj._id);
              const alreadySent = sentRequests.includes(userObj._id);

              return (
                <button key={userObj._id} className="friend-item search-user">
                  <div className="friend-avatar-wrapper">
                    <img
                      src="https://cdn-icons-png.flaticon.com/512/149/149071.png"
                      alt={userObj.username}
                    />
                    <span
  className={`online-dot ${
    onlineUsers.some(id => String(id) === String(userObj._id)) 
      ? "online" 
      : "offline"
  }`}
/>
                  </div>
                  <span className="friend-username">{userObj.username}</span>
                  {isFriend ? null : requestReceived ? (
                    <button onClick={() => acceptRequest(requestReceived._id)}>Accept</button>
                  ) : alreadySent ? (
                    <button
                      className="CancelButton"
                      onClick={(e) => {
                        e.stopPropagation();
                        cancelFriendRequest(userObj._id);
                      }}
                    >
                      Cancel
                    </button>
                  ) : (
                    <button className="AddButton" onClick={() => sendFriendRequest(userObj._id)}>Add</button>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      <main className="chat-main">
        <div className="chat-header">
  {activeFriendName ? (
    <>
      <User size={18} />
      <span
        className="friend-name-link"
        style={{ cursor: 'pointer' }}
        onClick={() => {
          // Find the friend object to get their _id
          const friendObj = friends.find(
            (f) => (f.sender._id === user._id ? f.receiver._id : f.sender._id) && 
                   (f.sender.username === activeFriendName || f.receiver.username === activeFriendName)
          );
          if (friendObj) {
            const friendId = friendObj.sender._id === user._id ? friendObj.receiver._id : friendObj.sender._id;
            navigate(`/profile/${friendId}`);
          }
        }}
      >
        {activeFriendName}
      </span>
    </>
  ) : (
    <h2>Select a chat</h2>
  )}
</div>

        <div className="chat-messages">
          {messages.map((msg, i) => {
            const isMe = msg.sender === user?._id;
            const senderName = isMe ? "You" : activeFriendName || "Friend";
            return (
              <div key={i} className={`message-wrapper ${isMe ? "sent" : "received"}`}>
                <img
                  src="https://cdn-icons-png.flaticon.com/512/149/149071.png"
                  alt="avatar"
                  className="message-avatar"
                />
                <div className="message-content">
                  <div className="message-info">
                    <span className="sender-name">{senderName}</span>
                    <span className="message-time">{formatTimeAgo(msg.createdAt)}</span>
                  </div>
                  <div className="message-bubble">
                    <p>{msg.message}</p>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-container">
          <input
            type="text"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <button
            className="send-btn"
            onClick={sendMessage}
            disabled={isSending || !message.trim()}
          >
            <Send size={16} />
            {isSending ? "Sending..." : "Send"}
          </button>
        </div>
      </main>

      {/* AI Chatbot Tab */}
<div
  className="chat-tab"
  onClick={async () => {
    try {
      const res = await axios.get("/api/subscription/status");
      const { active, expiresAt } = res.data;

      if (!active || (expiresAt && new Date(expiresAt) < new Date())) {
        alert("You need to buy the AI Assistant first.");
        navigate("/buy-chatbot");
        return;
      }

      setIsOpen(true); // Subscription is active, open AI drawer
    } catch (err) {
      console.error(err);
      alert("Error checking subscription. Try again later.");
    }
  }}
>
  <span>ASSISTANT</span>
</div>

      {/* AI Chat Drawer */}
      <div className={`chat-drawer ${isOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <h3>
            <Users size={16} style={{ color: '#00f2ff' }} />
            App Assistant
          </h3>
          <button className="close-btn" onClick={() => setIsOpen(false)}>×</button>
        </div>

        <div className="ai-messages-container">
          {aiMessages.map((msg, i) => (
            <div key={i} className={`ai-bubble ${msg.role}`}>
              {msg.text}
            </div>
          ))}
          {isAiLoading && (
            <div className="ai-bubble bot thinking">
              Thinking...
            </div>
          )}
            <div ref={aiMessagesEndRef} />
        </div>

        <div className="ai-input-wrapper">
          <input 
            value={aiInput} 
            onChange={(e) => setAiInput(e.target.value)}
            placeholder="Ask AI something..."
            onKeyDown={(e) => e.key === 'Enter' && handleAiSend()}
          />
          <button onClick={handleAiSend} disabled={isAiLoading}>
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default MainPage;