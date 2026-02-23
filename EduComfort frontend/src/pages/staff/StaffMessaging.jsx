import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  Card,
  Input,
  Button,
  List,
  Avatar,
  Space,
  Badge,
  Typography,
  Divider,
  Empty,
  Select,
  Row,
  Col,
  Tag,
  Spin,
  Modal,
  message as antMessage,
} from "antd";
import {
  SendOutlined,
  SearchOutlined,
  MessageOutlined,
  FilterOutlined,
  TeamOutlined,
  UserOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import axiosClient from "../../api/axiosClient";
import PageHeader from "../../components/PageHeader";
import { getCurrentUser } from "../../api/auth";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const { TextArea } = Input;
const { Text } = Typography;
const { Option } = Select;

export default function StaffMessaging() {
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all"); // all, private, group
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [newChatModal, setNewChatModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const messagesEndRef = useRef(null);
  const currentUser = getCurrentUser();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const response = await axiosClient.get("/messaging/conversations");
      setConversations(response.data);
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
      antMessage.error("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const response = await axiosClient.get(
        `/messaging/conversations/${conversationId}/messages`
      );
      setMessages(response.data);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
      antMessage.error("Failed to load messages");
    }
  };

  const fetchUsers = async () => {
    try {
      // Fetch all users except current user for private chat
      const response = await axiosClient.get("/admin/users/?limit=1000");
      const filteredUsers = response.data.filter(
        (user) => user.id !== currentUser.id
      );
      setUsers(filteredUsers);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  useEffect(() => {
    fetchConversations();
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, []);

  // START: Handle pre-enrollment chat request or ?chatUser param
  const location = useLocation();
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const queryChatUser = searchParams.get('chatUser');
    const stateChatUser = location.state?.startChatWith;

    const targetUserId = queryChatUser || stateChatUser;

    if (targetUserId && currentUser && parseInt(targetUserId) !== currentUser.id) {
      // Start private chat immediately
      const startChat = async () => {
        try {
          const response = await axiosClient.post("/messaging/conversations/private", {
            participant_id: parseInt(targetUserId),
          });

          fetchConversations();

          // Force select after delay to ensure it's in list (or we can just set it)
          setTimeout(() => {
            // Optimistically set the chat data from response if conversations state isn't updated yet
            // This ensures immediate feedback
            setSelectedChat(response.data);
          }, 500);

        } catch (error) {
          console.error("Failed to start auto-chat:", error);
          // If it fails (e.g. self-chat), handle gracefully
          if (error.response?.status !== 400) {
            antMessage.error("Could not start chat");
          }
        }
      };

      // Check if we already have this conversation loaded
      // This implementation always calls 'private' endpoint which handles "get or create"
      startChat();
    }
  }, [location.state, location.search]);
  // END: Handle chat request

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.id);
      // Auto-refresh messages every 5 seconds
      const interval = setInterval(() => {
        fetchMessages(selectedChat.id);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedChat]);

  const handleSelectChat = (conversation) => {
    setSelectedChat(conversation);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedChat) return;

    setSending(true);
    try {
      await axiosClient.post(
        `/messaging/conversations/${selectedChat.id}/messages`,
        {
          content: messageText,
        }
      );

      setMessageText("");
      fetchMessages(selectedChat.id);
      fetchConversations();
    } catch (error) {
      console.error("Failed to send message:", error);
      antMessage.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleStartPrivateChat = async () => {
    if (!selectedUserId) {
      antMessage.warning("Please select a user");
      return;
    }

    try {
      const response = await axiosClient.post(
        "/messaging/conversations/private",
        {
          participant_id: selectedUserId,
        }
      );

      setNewChatModal(false);
      fetchConversations();

      // Find and select the new conversation
      setTimeout(() => {
        const newConv = conversations.find(c => c.id === response.data.id);
        if (newConv) {
          setSelectedChat(newConv);
        }
      }, 500);

      antMessage.success("Chat started!");
    } catch (error) {
      console.error("Failed to start chat:", error);
      antMessage.error("Failed to start chat");
    }
  };

  const getConversationIcon = (type) => {
    return type === "group" ? <TeamOutlined /> : <UserOutlined />;
  };

  const getConversationColor = (type) => {
    return type === "group" ? "purple" : "blue";
  };

  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch = conv.display_name
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());

    const matchesType =
      filterType === "all" || conv.type === filterType;

    return matchesSearch && matchesType;
  });

  const groupChats = conversations.filter((c) => c.type === "group");
  const privateChats = conversations.filter((c) => c.type === "private");

  return (
    <div>
      <PageHeader
        title="Messages"
        subTitle="Group chats and private conversations"
        extra={
          <Space>
            <Tag icon={<TeamOutlined />} color="purple">
              {groupChats.length} Groups
            </Tag>
            <Tag icon={<UserOutlined />} color="blue">
              {privateChats.length} Private
            </Tag>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setNewChatModal(true);
                fetchUsers();
              }}
            >
              New Chat
            </Button>
          </Space>
        }
      />

      <Row gutter={16} style={{ height: "calc(100vh - 200px)" }}>
        {/* Conversations List */}
        <Col xs={24} md={8} style={{ height: "100%" }}>
          <Card
            title={
              <Space style={{ width: "100%", justifyContent: "space-between" }}>
                <span>
                  <MessageOutlined /> Conversations
                </span>
                <Badge
                  count={conversations.filter((c) => c.unread_count > 0).length}
                />
              </Space>
            }
            styles={{ body: {
              padding: 0,
              height: "calc(100% - 57px)",
              overflow: "hidden",
            } }}
            style={{ height: "100%" }}
          >
            {/* Search and Filter */}
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid #f0f0f0",
              }}
            >
              <Input
                placeholder="Search conversations..."
                prefix={<SearchOutlined />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ marginBottom: 8 }}
              />
              <Select
                value={filterType}
                onChange={setFilterType}
                style={{ width: "100%" }}
                suffixIcon={<FilterOutlined />}
              >
                <Option value="all">All Conversations</Option>
                <Option value="group">
                  <TeamOutlined /> Group Chats
                </Option>
                <Option value="private">
                  <UserOutlined /> Private Chats
                </Option>
              </Select>
            </div>

            {/* Conversations */}
            <div style={{ height: "calc(100% - 100px)", overflowY: "auto" }}>
              {loading ? (
                <div style={{ textAlign: "center", padding: 40 }}>
                  <Spin />
                </div>
              ) : filteredConversations.length === 0 ? (
                <Empty description="No conversations" style={{ marginTop: 60 }} />
              ) : (
                <List
                  dataSource={filteredConversations}
                  renderItem={(conv) => (
                    <List.Item
                      onClick={() => handleSelectChat(conv)}
                      style={{
                        cursor: "pointer",
                        padding: "12px 16px",
                        background:
                          selectedChat?.id === conv.id
                            ? "#e6f7ff"
                            : "transparent",
                        borderLeft:
                          selectedChat?.id === conv.id
                            ? "3px solid #1890ff"
                            : "3px solid transparent",
                      }}
                    >
                      <List.Item.Meta
                        avatar={
                          <Badge count={conv.unread_count || 0}>
                            <Avatar
                              style={{
                                backgroundColor: getConversationColor(conv.type),
                              }}
                              icon={getConversationIcon(conv.type)}
                            >
                              {!getConversationIcon(conv.type) &&
                                conv.display_name?.charAt(0).toUpperCase()}
                            </Avatar>
                          </Badge>
                        }
                        title={
                          <Space>
                            <span
                              style={{
                                fontWeight: conv.unread_count > 0 ? 600 : 400,
                              }}
                            >
                              {conv.display_name || "Unknown"}
                            </span>
                            <Tag
                              color={getConversationColor(conv.type)}
                              style={{ fontSize: 10 }}
                            >
                              {conv.type === "group" ? "Group" : "Private"}
                            </Tag>
                            {conv.type === "group" && (
                              <Tag style={{ fontSize: 10 }}>
                                {conv.participant_count} members
                              </Tag>
                            )}
                          </Space>
                        }
                        description={
                          <div>
                            <Text
                              ellipsis
                              style={{
                                color: conv.unread_count > 0 ? "#000" : "#999",
                                fontWeight: conv.unread_count > 0 ? 500 : 400,
                              }}
                            >
                              {conv.last_message_sender && (
                                <span style={{ fontWeight: 600 }}>
                                  {conv.last_message_sender}:{" "}
                                </span>
                              )}
                              {conv.last_message || "No messages yet"}
                            </Text>
                            <div
                              style={{
                                fontSize: 11,
                                color: "#999",
                                marginTop: 4,
                              }}
                            >
                              {conv.last_message_time
                                ? dayjs(conv.last_message_time).fromNow()
                                : ""}
                            </div>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </div>
          </Card>
        </Col>

        {/* Chat Window */}
        <Col xs={24} md={16} style={{ height: "100%" }}>
          <Card
            title={
              selectedChat ? (
                <Space>
                  <Avatar
                    style={{
                      backgroundColor: getConversationColor(selectedChat.type),
                    }}
                    icon={getConversationIcon(selectedChat.type)}
                  />
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {selectedChat.display_name || "Unknown"}
                    </div>
                    <Space size={4}>
                      <Tag
                        color={getConversationColor(selectedChat.type)}
                        style={{ fontSize: 10 }}
                      >
                        {selectedChat.type === "group" ? "Group Chat" : "Private Chat"}
                      </Tag>
                      {selectedChat.type === "group" && (
                        <Tag style={{ fontSize: 10 }}>
                          {selectedChat.participant_count} members
                        </Tag>
                      )}
                    </Space>
                  </div>
                </Space>
              ) : (
                <span>Select a conversation</span>
              )
            }
            styles={{ body: {
              padding: 0,
              height: "calc(100% - 57px)",
              display: "flex",
              flexDirection: "column",
            } }}
            style={{ height: "100%" }}
          >
            {selectedChat ? (
              <>
                {/* Messages Area */}
                <div
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "16px",
                    background: "#fafafa",
                  }}
                >
                  {messages.length === 0 ? (
                    <Empty
                      description="No messages yet"
                      style={{ marginTop: 100 }}
                    />
                  ) : (
                    messages.map((msg) => {
                      const isCurrentUser = msg.sender_id === currentUser.id;
                      return (
                        <div
                          key={msg.id}
                          style={{
                            display: "flex",
                            justifyContent: isCurrentUser
                              ? "flex-end"
                              : "flex-start",
                            marginBottom: 16,
                          }}
                        >
                          <div
                            style={{
                              maxWidth: "70%",
                              padding: "10px 14px",
                              borderRadius: 12,
                              background: isCurrentUser ? "#1890ff" : "#fff",
                              color: isCurrentUser ? "#fff" : "#000",
                              boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                            }}
                          >
                            {!isCurrentUser && selectedChat.type === "group" && (
                              <Text
                                strong
                                style={{
                                  fontSize: 12,
                                  color: "#1890ff",
                                  display: "block",
                                  marginBottom: 4,
                                }}
                              >
                                {msg.sender_name}
                                {msg.sender_role && (
                                  <Tag
                                    size="small"
                                    style={{ marginLeft: 4, fontSize: 10 }}
                                  >
                                    {msg.sender_role}
                                  </Tag>
                                )}
                              </Text>
                            )}
                            <div style={{ wordBreak: "break-word" }}>
                              {msg.content}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                opacity: 0.7,
                                marginTop: 4,
                                textAlign: "right",
                              }}
                            >
                              {dayjs(msg.created_at).format("HH:mm")}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <Divider style={{ margin: 0 }} />
                <div style={{ padding: "16px", background: "#fff" }}>
                  <Space.Compact style={{ width: "100%" }}>
                    <TextArea
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onPressEnter={(e) => {
                        if (!e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Type a message... (Shift+Enter for new line)"
                      autoSize={{ minRows: 1, maxRows: 4 }}
                      style={{ resize: "none" }}
                    />
                    <Button
                      type="primary"
                      icon={<SendOutlined />}
                      onClick={handleSendMessage}
                      loading={sending}
                      disabled={!messageText.trim()}
                    >
                      Send
                    </Button>
                  </Space.Compact>
                </div>
              </>
            ) : (
              <Empty
                description="Select a conversation to start messaging"
                style={{ marginTop: 100 }}
                image={
                  <MessageOutlined style={{ fontSize: 64, color: "#ccc" }} />
                }
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* New Private Chat Modal */}
      <Modal
        title="Start New Private Chat"
        open={newChatModal}
        onOk={handleStartPrivateChat}
        onCancel={() => {
          setNewChatModal(false);
          setSelectedUserId(null);
        }}
        okText="Start Chat"
      >
        <div style={{ marginTop: 16 }}>
          <Text>Select a user to start chatting:</Text>
          <Select
            showSearch
            style={{ width: "100%", marginTop: 8 }}
            placeholder="Search users..."
            optionFilterProp="children"
            value={selectedUserId}
            onChange={setSelectedUserId}
            filterOption={(input, option) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
          >
            {users.map((user) => (
              <Option
                key={user.id}
                value={user.id}
                label={`${user.first_name} ${user.last_name}`}
              >
                <Space>
                  <Avatar size="small">
                    {user.first_name?.charAt(0).toUpperCase()}
                  </Avatar>
                  <span>
                    {user.first_name} {user.last_name}
                  </span>
                  <Tag size="small">{user.role}</Tag>
                </Space>
              </Option>
            ))}
          </Select>
        </div>
      </Modal>
    </div>
  );
}