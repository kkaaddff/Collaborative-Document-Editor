"use client";

import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { Awareness } from "y-protocols/awareness";
import { User } from "@/types";

interface UseCollaborationProps {
  roomCode: string;
  userName: string;
  userId: string;
  onContentChange: Dispatch<SetStateAction<string>>;
  onUsersChange: Dispatch<SetStateAction<User[]>>;
}

const USER_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#FFA07A",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E2",
  "#F8B739",
  "#52B788",
  "#E76F51",
  "#8338EC",
];

function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

function diffText(oldText: string, newText: string) {
  if (oldText === newText) {
    return null;
  }

  let start = 0;
  const minLength = Math.min(oldText.length, newText.length);

  while (start < minLength && oldText[start] === newText[start]) {
    start += 1;
  }

  let oldEnd = oldText.length;
  let newEnd = newText.length;

  while (
    oldEnd > start &&
    newEnd > start &&
    oldText[oldEnd - 1] === newText[newEnd - 1]
  ) {
    oldEnd -= 1;
    newEnd -= 1;
  }

  return {
    index: start,
    deleteCount: oldEnd - start,
    insertText: newText.slice(start, newEnd),
  };
}

export function useCollaboration({
  roomCode,
  userName,
  userId,
  onContentChange,
  onUsersChange,
}: UseCollaborationProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const docRef = useRef<Y.Doc | null>(null);
  const textRef = useRef<Y.Text | null>(null);
  const awarenessRef = useRef<Awareness | null>(null);
  const contentRef = useRef<string>("");

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001";
    const doc = new Y.Doc();
    const provider = new WebsocketProvider(wsUrl, roomCode, doc, {
      connect: true,
      params: { userId },
    });
    const yText = doc.getText("document");
    const awareness = provider.awareness;

    docRef.current = doc;
    textRef.current = yText;
    awarenessRef.current = awareness;

    const updateUsers = () => {
      const states = Array.from(awareness.getStates().values());
      const users: User[] = states
        .map((state) => state?.user)
        .filter(
          (userState): userState is User & { color: string } => !!userState
        )
        .map((userState) => ({
          id: userState.id,
          name: userState.name,
          cursorPosition: userState.cursorPosition ?? 0,
          color: userState.color ?? getUserColor(userState.id),
        }));
      onUsersChange(users);
    };

    const handleTextUpdate = () => {
      const text = yText.toString();
      contentRef.current = text;
      onContentChange(text);
    };

    provider.on("status", ({ status }: { status: string }) => {
      setIsConnected(status === "connected");
      if (status === "connected") {
        setError(null);
      }
    });

    provider.on("connection-close", () => {
      setError("连接已关闭");
    });

    provider.on("connection-error", () => {
      setError("无法连接实时协作服务");
    });

    yText.observe(handleTextUpdate);
    awareness.on("change", updateUsers);

    const initialContent = yText.toString();
    contentRef.current = initialContent;
    onContentChange(initialContent);

    awareness.setLocalState({
      user: {
        id: userId,
        name: userName,
        cursorPosition: 0,
        color: getUserColor(userId),
      },
    });
    updateUsers();

    return () => {
      yText.unobserve(handleTextUpdate);
      awareness.off("change", updateUsers);
      provider.destroy();
      doc.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyLocalChange = useCallback(
    (nextContent: string) => {
      const doc = docRef.current;
      const yText = textRef.current;

      if (!doc || !yText) {
        return;
      }

      const diff = diffText(contentRef.current, nextContent);

      if (!diff) {
        return;
      }

      doc.transact(() => {
        if (diff.deleteCount > 0) {
          yText.delete(diff.index, diff.deleteCount);
        }

        if (diff.insertText.length > 0) {
          yText.insert(diff.index, diff.insertText);
        }
      }, userId);

      contentRef.current = nextContent;
    },
    [userId]
  );

  const sendCursorPosition = useCallback(
    (position: number) => {
      const awareness = awarenessRef.current;
      if (!awareness) {
        return;
      }

      const state = awareness.getLocalState() ?? {};
      const userState = state.user ?? {
        id: userId,
        name: userName,
        color: getUserColor(userId),
      };

      awareness.setLocalState({
        ...state,
        user: {
          ...userState,
          cursorPosition: position,
        },
      });
    },
    [userId, userName]
  );

  return {
    isConnected,
    error,
    applyLocalChange,
    sendCursorPosition,
  };
}
