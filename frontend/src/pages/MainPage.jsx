import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./MainPage.css";
import io from "socket.io-client";
import axios from "../axiosInstance.js";
import { LogOut, User, UserPlus, Send, Users } from "lucide-react";

// ================= Helper for "time ago" =================
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

  // ================= STATES =================
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

  const messagesEndRef = useRef(null);
  const socket = useRef(null);

  // ================= ACTIVE CHAT REF =================
  const activeChatRef = useRef(activeChatId);
  useEffect(() => {
    activeChatRef.current = activeChatId;
  }, [activeChatId]);

  // ================= AUTH CHECK =================
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
  }, []);

  // ================= SOCKET INIT =================
  useEffect(() => {
    if (!socket.current) {
      socket.current = io(import.meta.env.VITE_API_URL, { withCredentials: true });
    }
    const s = socket.current;

    s.on("connect", () => console.log("Connected:", s.id));
    s.on("online_users", (users) => setOnlineUsers(users));

    s.on("receive_message", (data) => {
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
    });

    s.on("friend_request_received", () => loadRequests());
    s.on("friend_request_accepted", () => {
      loadFriends();
      loadRequests();
      loadSentRequests();
    });
    s.on("friend_request_rejected", () => loadSentRequests());

    return () => {
      s.off("receive_message");
      s.off("online_users");
      s.off("friend_request_received");
      s.off("friend_request_accepted");
      s.off("friend_request_rejected");
    };
  }, [user]);

  // ================= JOIN USER ROOM =================
  useEffect(() => {
    if (!user || !socket.current) return;
    socket.current.emit("join_user_room", user._id);
  }, [user]);

  // ================= CHAT FUNCTIONS =================
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ================= SEARCH =================
  const handleSearch = async () => {
    if (!searchName.trim()) return;
    try {
      const res = await axios.get(`/api/users/search?name=${searchName}`);
      setSearchResults(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // ================= FRIEND REQUESTS =================
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

  // ================= LOAD DATA =================
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

  // ================= LOGOUT =================
  const handleLogout = async () => {
    try {
      await axios.post("/api/auth/logout");
      setUser(null);
      navigate("/login");
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  // ================= UI =================
  return (
    <div className="chat-container">
      <aside className="sidebar">
        <div className="sidebar-top">
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Logout</span>
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
              const friendUser =
                friend.sender._id === user._id ? friend.receiver : friend.sender;
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
                        onlineUsers.includes(friendUser._id) ? "online" : "offline"
                      }`}
                    />
                  </div>
                  <span className="friend-username">{friendUser.username}</span>
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
                  <span>{req.sender?.username}</span>
                  <div>
                    <button onClick={() => acceptRequest(req._id)}>Accept</button>
                    <button onClick={() => rejectRequest(req._id)}>Reject</button>
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
                    <span className="online-dot offline" />
                  </div>
                  <span className="friend-username">{userObj.username}</span>
                  {isFriend ? null : requestReceived ? (
                    <button onClick={() => acceptRequest(requestReceived._id)}>Accept</button>
                  ) : alreadySent ? (
                    <button disabled>Sent</button>
                  ) : (
                    <button onClick={() => sendFriendRequest(userObj._id)}>Add</button>
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
              <h2>{activeFriendName}</h2>
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
    </div>
  );
}

export default MainPage;