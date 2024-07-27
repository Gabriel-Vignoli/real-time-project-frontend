import {
  Dispatch,
  FormEvent,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from "react";
import { Topic } from "./Home";
import { io } from "socket.io-client";
import { User, UserContext } from "../App";
import MessageBox from "./MessageBox";

type TopicRoomProps = {
  topic: Topic;
  setOpenTopic: Dispatch<SetStateAction<Topic | null>>;
};

export type Message = {
  _id: string;
  content: string;
  author?: User;
  createdAt: string;
};

const socket = io("http://localhost:3000");

export default function TopicRoom({ topic, setOpenTopic }: TopicRoomProps) {
  const { user } = useContext(UserContext);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    loadMessages();
  }, [topic]);

  useEffect(() => {
    if (user && topic) {
      socket.emit("join_room", { name: user.name, topicId: topic._id });

      socket.on("new_message", (newMessage: Message) => {
        setMessages((mostRecentState) => [...mostRecentState, newMessage]);
      });

      return () => {
        socket.emit("leave_room", { name: user.name, topicId: topic._id });
        socket.off("new_message");
      };
    }
  }, [user, topic]);

  async function loadMessages() {
    try {
      const response = await fetch(`http://localhost:3000/topics/${topic._id}`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const data = await response.json();
      setMessages(data.messages);
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  }

  async function handleSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();

    const formData = new FormData(ev.currentTarget);
    const content = formData.get("message")?.toString();
    if (!content || !user || !topic) return;

    ev.currentTarget.reset();

    socket.emit("send_message", { content, author: user, topicId: topic._id });
  }

  return (
    <main className="room">
      <header>
        <h2>{topic.title}</h2>
        <button onClick={() => setOpenTopic(null)}>Voltar</button>
      </header>

      <section className="messages">
        {messages.map((message) => (
          <MessageBox message={message}></MessageBox>
        ))}
      </section>

      <form className="send-message-form inline-form" onSubmit={handleSubmit}>
        <input type="text" name="message" id="message" required />
        <button>Enviar</button>
      </form>
    </main>
  );
}
