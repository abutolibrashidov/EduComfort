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
  Grid,
  message as antMessage,
  Drawer,
  Tooltip
} from "antd";
import {
  SendOutlined,
  SearchOutlined,
  MessageOutlined,
  FilterOutlined,
  TeamOutlined,
  UserOutlined,
  PlusOutlined,
  MenuUnfoldOutlined,
  ArrowLeftOutlined
} from "@ant-design/icons";
import axiosClient from "../../api/axiosClient";
import MyPageHeader from "../../components/PageHeader";
import { getCurrentUser } from "../../api/auth";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";

dayjs.extend(relativeTime);

const { TextArea } = Input;
const { Text, Title } = Typography;
const { Option } = Select;
const { useBreakpoint } = Grid;

export default function TeacherMessaging() {
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [newChatModal, setNewChatModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [mobileDrawerVisible, setMobileDrawerVisible] = useState(false);
  const messagesEndRef = useRef(null);
  const currentUser = getCurrentUser();
  const { t } = useTranslation();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  // Scroll to bottom helper
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
    }
  };

  const fetchUsers = async () => {
    try {
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
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, []);

  // Handle auto-start chat logic
  const location = useLocation();
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const queryChatUser = searchParams.get('chatUser');
    const stateChatUser = location.state?.startChatWith;
    const targetUserId = queryChatUser || stateChatUser;

    if (targetUserId && currentUser && parseInt(targetUserId) !== currentUser.id) {
      const startChat = async () => {
        try {
          const response = await axiosClient.post("/messaging/conversations/private", {
            participant_id: parseInt(targetUserId),
          });
          fetchConversations();
          setTimeout(() => {
            setSelectedChat(response.data);
          }, 500);
        } catch (error) {
          console.error("Failed to start auto-chat:", error);
        }
      };
      startChat();
    }
  }, [location.state, location.search]);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.id);
      const interval = setInterval(() => {
        fetchMessages(selectedChat.id);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedChat]);

  const handleSelectChat = (conversation) => {
    setSelectedChat(conversation);
    setMobileDrawerVisible(false); // Close drawer on mobile
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedChat) return;

    setSending(true);
    try {
      await axiosClient.post(
        `/messaging/conversations/${selectedChat.id}/messages`,
        { content: messageText }
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
      antMessage.warning(t('chat.select_user'));
      return;
    }

    try {
      const response = await axiosClient.post(
        "/messaging/conversations/private",
        { participant_id: selectedUserId }
      );

      setNewChatModal(false);
      fetchConversations();

      setTimeout(() => {
        const newConv = conversations.find(c => c.id === response.data.id);
        if (newConv) setSelectedChat(newConv);
      }, 500);

      antMessage.success(t('chat.start_chat') + "!");
    } catch (error) {
      console.error("Failed to start chat:", error);
      antMessage.error("Failed to start chat");
    }
  };

  const getConversationIcon = (type) => {
    return type === "group" ? <TeamOutlined /> : <UserOutlined />;
  };

  const getConversationColor = (type) => {
    return type === "group" ? "#7c3aed" : "#0061f2";
  };

  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch = conv.display_name
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesType =
      filterType === "all" || conv.type === filterType;
    return matchesSearch && matchesType;
  });

  const ConversationList = ({ isMobile = false }) => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Search Header */}
      <div style={{ padding: 16, borderBottom: '1px solid #f0f0f0' }}>
        <Input
          placeholder={t('chat.search_placeholder')}
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ borderRadius: 8, marginBottom: 12, border: '1px solid #d9d9d9' }}
        />
        <Select
          value={filterType}
          onChange={setFilterType}
          style={{ width: "100%" }}
          dropdownStyle={{ borderRadius: 8 }}
        >
          <Option value="all">{t('chat.all_conversations')}</Option>
          <Option value="group"><TeamOutlined /> {t('chat.groups')}</Option>
          <Option value="private"><UserOutlined /> {t('chat.private')}</Option>
        </Select>
      </div>

      {/* List Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading && conversations.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <Spin />
          </div>
        ) : filteredConversations.length === 0 ? (
          <Empty description={<Text type="secondary">{t('chat.no_messages')}</Text>} style={{ marginTop: 40 }} image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            dataSource={filteredConversations}
            renderItem={(conv) => (
              <List.Item
                onClick={() => handleSelectChat(conv)}
                style={{
                  cursor: "pointer",
                  padding: "16px",
                  borderBottom: '1px solid #f0f0f0',
                  background: selectedChat?.id === conv.id ? "#eff6ff" : "transparent",
                  transition: 'background 0.2s',
                  position: 'relative'
                }}
                className="hover:bg-gray-50"
              >
                {selectedChat?.id === conv.id && (
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: '#0061f2' }} />
                )}
                <List.Item.Meta
                  avatar={
                    <Badge count={conv.unread_count || 0} color="#ef4444">
                      <Avatar
                        size={48}
                        shape="circle"
                        style={{
                          background: getConversationColor(conv.type),
                          color: '#fff',
                          fontSize: 20,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}
                        icon={getConversationIcon(conv.type)}
                      >
                        {!getConversationIcon(conv.type) && conv.display_name?.charAt(0).toUpperCase()}
                      </Avatar>
                    </Badge>
                  }
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <Text strong style={{ fontSize: 16, color: '#1f2937' }} ellipsis={{ tooltip: conv.display_name }}>
                        {conv.display_name || "Unknown"}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {conv.last_message_time ? dayjs(conv.last_message_time).format("HH:mm") : ""}
                      </Text>
                    </div>
                  }
                  description={
                    <div>
                      <Text type="secondary" ellipsis style={{ fontSize: 14, color: conv.unread_count > 0 ? '#4b5563' : '#9ca3af', fontWeight: conv.unread_count > 0 ? 500 : 400 }}>
                        {conv.last_message_sender && `${conv.last_message_sender}: `}
                        {conv.last_message || t('chat.no_messages')}
                      </Text>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </div>
    </div>
  );

  return (
    <div style={{ padding: 24, background: "#f0f2f5", height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      {/* Mobile Header (Only visible on small screens usually, but here keeping consistent) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>{t('chat.title')}</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          style={{ borderRadius: 8, boxShadow: '0 4px 14px rgba(0, 97, 242, 0.3)' }}
          onClick={() => {
            setNewChatModal(true);
            fetchUsers();
          }}
        >
          {t('chat.new_chat')}
        </Button>
      </div>

      <div style={{ flex: 1, background: '#fff', borderRadius: 24, overflow: 'hidden', display: 'flex', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        {/* Sidebar - Desktop (hidden on mobile until chat is opened via drawer) */}
        <div style={{ width: 350, borderRight: '1px solid #f0f0f0', display: isMobile ? 'none' : 'block' }}>
          <ConversationList />
        </div>

        {/* Sidebar - Mobile Drawer */}
        <Drawer
          placement="left"
          open={mobileDrawerVisible}
          onClose={() => setMobileDrawerVisible(false)}
          width="85%"
          styles={{ body: { padding: 0 } }}
        >
          <ConversationList isMobile />
        </Drawer>

        {/* Chat Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <div style={{
                padding: '16px 24px',
                borderBottom: '1px solid #f0f0f0',
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                zIndex: 10
              }}>
                <Space size={16}>
                  <Button
                    icon={<ArrowLeftOutlined />}
                    style={{ display: isMobile ? 'inline-flex' : 'none' }}
                    type="text"
                    onClick={() => { setSelectedChat(null); setMobileDrawerVisible(true); }}
                  />
                  <Avatar
                    size={48}
                    style={{ backgroundColor: getConversationColor(selectedChat.type) }}
                    icon={getConversationIcon(selectedChat.type)}
                  />
                  <div>
                    <Text strong style={{ fontSize: 18, display: 'block', lineHeight: 1.2 }}>
                      {selectedChat.display_name}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {selectedChat.type === "group"
                        ? `${selectedChat.participant_count} ${t('chat.members')}`
                        : t('chat.private')
                      }
                    </Text>
                  </div>
                </Space>
                <Button icon={<MenuUnfoldOutlined />} onClick={() => setMobileDrawerVisible(true)} style={{ display: isMobile ? 'inline-flex' : 'none' }} />
              </div>

              {/* Messages */}
              <div style={{ flex: 1, background: '#f8fafc', overflowY: 'auto', padding: 24 }}>
                {messages.length === 0 ? (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', opacity: 0.5 }}>
                    <MessageOutlined style={{ fontSize: 64, marginBottom: 16 }} />
                    <Text>{t('chat.no_messages')}</Text>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.sender_id == currentUser.id;
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{
                          display: 'flex',
                          justifyContent: isMe ? 'flex-end' : 'flex-start',
                          marginBottom: 20
                        }}
                      >
                        {!isMe && selectedChat.type === "group" && (
                          <Avatar size="small" style={{ marginRight: 8, marginTop: 4 }}>
                            {msg.sender_name?.charAt(0)}
                          </Avatar>
                        )}
                        <div style={{ maxWidth: '70%' }}>
                          {!isMe && selectedChat.type === "group" && (
                            <Text type="secondary" style={{ fontSize: 11, marginLeft: 4, marginBottom: 2, display: 'block' }}>
                              {msg.sender_name}
                            </Text>
                          )}
                          <div style={{
                            padding: '12px 18px',
                            borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            background: isMe ? 'linear-gradient(135deg, #0061f2 0%, #00c6f9 100%)' : '#fff',
                            color: isMe ? '#fff' : '#1f2937',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                            position: 'relative',
                            fontSize: 15,
                            lineHeight: 1.5
                          }}>
                            {msg.content}
                          </div>
                          <div style={{
                            textAlign: isMe ? 'right' : 'left',
                            marginTop: 4,
                            marginRight: 4,
                            marginLeft: 4
                          }}>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              {dayjs(msg.created_at).format("HH:mm")}
                            </Text>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div style={{
                padding: isMobile ? '10px 12px' : '20px',
                background: '#fff',
                borderTop: '1px solid #f0f0f0',
                paddingBottom: isMobile ? 'calc(10px + env(safe-area-inset-bottom))' : '20px',
              }}>
                <div style={{
                  display: 'flex',
                  background: '#f8fafc',
                  borderRadius: 24,
                  padding: '8px 8px 8px 20px',
                  border: '1px solid #e2e8f0',
                  alignItems: 'flex-end'
                }}>
                  <TextArea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onPressEnter={(e) => {
                      if (!e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={t('chat.type_message')}
                    autoSize={{ minRows: 1, maxRows: 4 }}
                    bordered={false}
                    style={{ flex: 1, resize: 'none', background: 'transparent', fontSize: 15, padding: '8px 0' }}
                  />
                  <Button
                    type="primary"
                    shape="circle"
                    size="large"
                    icon={<SendOutlined />}
                    onClick={handleSendMessage}
                    loading={sending}
                    disabled={!messageText.trim()}
                    style={{ marginLeft: 8 }}
                  />
                </div>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' }}>
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                <MessageOutlined style={{ fontSize: 80, marginBottom: 24, opacity: 0.2 }} />
              </motion.div>
              <Title level={4} style={{ color: '#6b7280' }}>{t('chat.select_conversation')}</Title>
              <Text type="secondary">{t('chat.subtitle')}</Text>

              {/* Mobile helper */}
              <Button
                type="primary"
                shape="round"
                style={{ marginTop: 24, display: isMobile ? 'inline-block' : 'none' }}
                onClick={() => setMobileDrawerVisible(true)}
              >
                {t('chat.all_conversations')}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* New Private Chat Modal */}
      <Modal
        title={t('chat.start_new_private')}
        open={newChatModal}
        onOk={handleStartPrivateChat}
        onCancel={() => {
          setNewChatModal(false);
          setSelectedUserId(null);
        }}
        okText={t('chat.start_chat')}
      >
        <div style={{ marginTop: 16 }}>
          <Text>{t('chat.select_user')}:</Text>
          <Select
            showSearch
            style={{ width: "100%", marginTop: 8 }}
            placeholder={t('chat.search_placeholder')}
            optionFilterProp="label"
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
                  <Avatar size="small" style={{ backgroundColor: '#87d068' }}>
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