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
import { IndexeddbPersistence } from "y-indexeddb";
import { getServerBase } from "./serverConfig";
import { User } from "@/types";

interface UseCollaborationProps {
  roomCode: string;
  userName: string;
  userId: string;
  onContentChange: Dispatch<SetStateAction<string>>;
  onUsersChange: Dispatch<SetStateAction<User[]>>;
  /** 共享房间名变化时回调（来自 Yjs meta map，房间内全员同步）。 */
  onRoomNameChange: (name: string) => void;
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
  onRoomNameChange,
}: UseCollaborationProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const docRef = useRef<Y.Doc | null>(null);
  const textRef = useRef<Y.Text | null>(null);
  const metaRef = useRef<Y.Map<unknown> | null>(null);
  const contentRef = useRef<string>("");

  useEffect(() => {
    if (!roomCode) {
      return;
    }

    // 运行时解析服务器地址（URL 参数 > 已保存配置 > dev 环境变量 > 同源）
    const wsUrl = getServerBase();
    const doc = new Y.Doc();
    const provider = new WebsocketProvider(wsUrl, roomCode, doc, {
      connect: true,
      params: { userId },
    });
    const yText = doc.getText("document");
    const yMeta = doc.getMap<unknown>("meta");
    const awareness = provider.awareness;

    // 离线持久化（IndexedDB）：断网可编辑，重连后 CRDT 自动合并；
    // 隐私模式等不可用场景静默跳过，不影响在线协同
    let persistence: IndexeddbPersistence | null = null;
    try {
      persistence = new IndexeddbPersistence(
        `coordination-room-${roomCode}`,
        doc
      );
    } catch {
      persistence = null;
    }

    docRef.current = doc;
    textRef.current = yText;
    metaRef.current = yMeta;

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

    // 共享房间名（Yjs meta map，房间内全员同步；一人改名 → 全员 observe 生效）
    const readRoomName = () =>
      onRoomNameChange((yMeta.get("roomName") as string) ?? "");
    yMeta.observe(readRoomName);
    readRoomName();

    const initialContent = yText.toString();
    contentRef.current = initialContent;
    onContentChange(initialContent);

    awareness.setLocalState({
      user: {
        id: userId,
        name: userName,
        color: getUserColor(userId),
      },
    });
    updateUsers();

    return () => {
      yText.unobserve(handleTextUpdate);
      yMeta.unobserve(readRoomName);
      awareness.off("change", updateUsers);
      // 先关 socket 再 destroy：destroy() 内部会先把本地 awareness 置空再触发一次
      // 全量广播，时序上可能被服务端按“空名单”记账，导致断开时不再广播移除。
      // 先主动断线，服务端按该连接的完整 clientID 名单立即广播离开，全员秒级回落。
      // 已知边界：同一浏览器双标签进同一房间时（共享 IndexedDB/BroadcastChannel），
      // y-websocket 的 awareness 归属可能错位，离开要等 ~30s 过期兜底——跨设备无此现象。
      try {
        provider.ws?.close();
      } catch {
        /* socket 可能已不在 */
      }
      persistence?.destroy();
      provider.destroy();
      doc.destroy();
    };
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

  // 重命名房间（写共享 meta map，CRDT 收敛，全员同步）
  const renameRoom = useCallback((name: string) => {
    metaRef.current?.set("roomName", name);
  }, []);

  return {
    isConnected,
    error,
    applyLocalChange,
    renameRoom,
  };
}
