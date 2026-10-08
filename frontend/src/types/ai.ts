export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  senderName: string;
  timestamp: string;
  content: string;
  suggestions?: string[];
  isDraft?: boolean;
}
