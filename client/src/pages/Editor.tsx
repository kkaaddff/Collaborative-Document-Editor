import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import type { MDXEditorMethods } from "@mdxeditor/editor";
import { MDXEditor } from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import "@/lib/fixTableCopy"; // 修复表格无法拷贝（给 TableNode 补 exportDOM）
import { useCollaboration } from "@/lib/useCollaboration";
import { getServerBase } from "@/lib/serverConfig";
import { upsertRecentRoom } from "@/lib/storage";
import { createEditorPlugins } from "@/components/editorConfig";
import { RoomHeader } from "@/components/RoomHeader";
import { UsersPanel } from "@/components/UsersPanel";
import { User } from "@/types";

export default function Editor() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const roomCode = useMemo(
    () => searchParams.get("code")?.toUpperCase() ?? "",
    [searchParams]
  );
  const userName = searchParams.get("name") || "匿名用户";
  const [userId] = useState(
    () => `user-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
  );

  useEffect(() => {
    if (!roomCode) {
      navigate("/", { replace: true });
    }
  }, [roomCode, navigate]);

  const [content, setContent] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [roomName, setRoomName] = useState("");
  const editorRef = useRef<MDXEditorMethods | null>(null);
  const isUpdatingFromRemote = useRef(false);
  const contentRef = useRef<string>("");

  const { isConnected, error, applyLocalChange, renameRoom } = useCollaboration({
    roomCode,
    userName,
    userId,
    onContentChange: (newContent) => {
      // 避免循环更新
      if (isUpdatingFromRemote.current) {
        return;
      }
      if (newContent !== contentRef.current) {
        isUpdatingFromRemote.current = true;
        contentRef.current = newContent as string;
        setContent(newContent);
        // 同步到 MDXEditor
        if (editorRef.current) {
          editorRef.current.setMarkdown(newContent as string);
        }
        // 使用 setTimeout 确保状态更新完成
        setTimeout(() => {
          isUpdatingFromRemote.current = false;
        }, 0);
      }
    },
    onUsersChange: setUsers,
    onRoomNameChange: setRoomName,
  });

  // 共享房间名同步到本地「最近房间」快照，首页列表随之保鲜
  useEffect(() => {
    if (roomCode && roomName) {
      upsertRecentRoom({ code: roomCode, name: roomName });
    }
  }, [roomCode, roomName]);

  const handleContentChange = useCallback(
    (markdown: string, initialMarkdownNormalize: boolean) => {
      if (!initialMarkdownNormalize && !isUpdatingFromRemote.current) {
        contentRef.current = markdown;
        setContent(markdown);
        applyLocalChange(markdown);
      }
    },
    [applyLocalChange]
  );

  const handleImageUpload = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    // 运行时解析服务器地址（直连 IP 或同源）
    const baseUrl = getServerBase();
    try {
      const response = await fetch(`${baseUrl}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "上传失败");
      }

      const data = await response.json();
      // 返回完整的 URL
      return `${baseUrl}${data.url}`;
    } catch (error) {
      console.error("图片上传失败:", error);
      alert(
        `图片上传失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
      throw error;
    }
  }, []);

  // 插件数组只在 upload handler 变化时重建（handler 已 useCallback，实际稳定）
  const plugins = useMemo(
    () => createEditorPlugins(handleImageUpload),
    [handleImageUpload]
  );

  if (!roomCode) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <RoomHeader
        roomCode={roomCode}
        roomName={roomName}
        isConnected={isConnected}
        onRename={renameRoom}
        onLeave={() => navigate("/")}
      />

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 px-6 py-4">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col p-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg flex-1 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                文档内容
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {content.length} 字符
              </span>
            </div>
            <div className="flex-1 overflow-auto">
              <MDXEditor
                ref={editorRef}
                markdown={content}
                onChange={handleContentChange}
                plugins={plugins}
                contentEditableClassName="focus:outline-none min-h-[400px] p-4 text-gray-900 dark:text-gray-100"
                className="h-full dark:[&_.mdx-editor-toolbar]:bg-gray-800 [&_.mdx-editor-toolbar]:bg-white"
                spellCheck={true}
              />
            </div>
          </div>
        </div>

        <UsersPanel users={users} />
      </div>
    </div>
  );
}
