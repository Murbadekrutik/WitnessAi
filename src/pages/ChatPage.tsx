import { useNavigate } from "react-router-dom";
import ChatInterface from "@/components/ChatInterface";

/**
 * ChatPage — rendered at route "/chat"
 *
 * Thin page wrapper. All chat UI and logic lives in LegalChatPage;
 * this layer only connects the onBack prop to React Router navigation.
 */
const ChatPage = () => {
  const navigate = useNavigate();

  return <ChatInterface onBack={() => navigate("/")} />;
};

export default ChatPage;
