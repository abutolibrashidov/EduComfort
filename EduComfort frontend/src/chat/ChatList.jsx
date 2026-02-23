import React, { useEffect, useState } from "react";
import { List, Avatar, Spin, Empty, message } from "antd";
import { useNavigate } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import { apiErrorMessage } from "../utils";

export default function ChatList() {
	const [loading, setLoading] = useState(true);
	const [conversations, setConversations] = useState([]);
	const navigate = useNavigate();

	useEffect(() => {
		let mounted = true;
		const load = async () => {
			setLoading(true);
			try {
				const res = await axiosClient.get("/chat/conversations");
				if (!mounted) return;
				setConversations(res.data || []);
			} catch (err) {
				message.error(apiErrorMessage(err));
			} finally {
				if (mounted) setLoading(false);
			}
		};
		load();
		return () => {
			mounted = false;
		};
	}, []);

	if (loading) return <Spin style={{ display: "block", margin: 40 }} />;

	if (!conversations.length) return <Empty description="No conversations" />;

	return (
		<List
			itemLayout="horizontal"
			dataSource={conversations}
			renderItem={(item) => (
				<List.Item
					onClick={() => navigate(`/chat/${item.id}`)}
					style={{ cursor: "pointer" }}
				>
					<List.Item.Meta
						avatar={<Avatar src={item.avatar} />}
						title={item.title}
						description={item.last_message}
					/>
				</List.Item>
			)}
		/>
	);
}

