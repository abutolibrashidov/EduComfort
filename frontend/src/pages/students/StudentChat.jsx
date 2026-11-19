import React from "react";
import Messaging from "../admin/Messaging";

/**
 * Student Chat - Reuses the admin messaging component
 * Students can:
 * - See their group chats (with teacher and classmates)
 * - Send private messages to other students
 * - Super admin can see all chats
 */
const StudentChat = () => {
  return <Messaging />;
};

export default StudentChat;