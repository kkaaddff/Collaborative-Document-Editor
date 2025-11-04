"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { MDXEditorMethods } from "@mdxeditor/editor";
import { MDXEditor } from "@mdxeditor/editor";
import {
  headingsPlugin,
  listsPlugin,
  linkPlugin,
  linkDialogPlugin,
  quotePlugin,
  tablePlugin,
  codeBlockPlugin,
  markdownShortcutPlugin,
  toolbarPlugin,
  thematicBreakPlugin,
  frontmatterPlugin,
  imagePlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  InsertTable,
  InsertImage,
  InsertCodeBlock,
  InsertFrontmatter,
  InsertThematicBreak,
  CodeToggle,
  CreateLink,
  ListsToggle,
  BlockTypeSelect,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import { useCollaboration } from "@/lib/useCollaboration";
import { User } from "@/types";

function EditorPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const roomCode = useMemo(
    () => searchParams.get("code")?.toUpperCase() ?? "",
    [searchParams]
  );
  const userName = searchParams.get("name") || "匿名用户";
  const [userId] = useState(
    () => `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  );

  // 确保只在客户端渲染，避免 hydration mismatch
  // MDXEditor 根据操作系统检测快捷键（Ctrl vs ⌘），
  // 在服务器端和客户端可能不一致，导致 hydration mismatch
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // 必须在客户端挂载后才渲染编辑器
    // 注意：这在 useEffect 中设置状态是必要的，用于避免 hydration mismatch
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!roomCode) {
      router.replace("/");
    }
  }, [roomCode, router]);

  const [content, setContent] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const editorRef = useRef<MDXEditorMethods | null>(null);
  const isUpdatingFromRemote = useRef(false);
  const contentRef = useRef<string>("");

  const { isConnected, error, applyLocalChange } = useCollaboration({
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
  });

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
    const baseUrl = process.env.BASE_URL || "http://localhost:3001";
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

  const handleLeaveRoom = () => {
    router.push("/");
  };

  const handleCopyRoomCode = () => {
    if (!roomCode) {
      return;
    }
    navigator.clipboard.writeText(roomCode);
    alert("房间代码已复制到剪贴板");
  };

  if (!roomCode) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            协同编辑器
          </h1>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              房间:
            </span>
            <code className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded text-sm font-mono text-gray-900 dark:text-white">
              {roomCode}
            </code>
            <button
              onClick={handleCopyRoomCode}
              className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors"
            >
              复制
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isConnected ? "已连接" : "未连接"}
            </span>
          </div>

          <button
            onClick={handleLeaveRoom}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            退出房间
          </button>
        </div>
      </div>

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
              {mounted ? (
                <MDXEditor
                  ref={editorRef}
                  markdown={content}
                  onChange={handleContentChange}
                  plugins={[
                    headingsPlugin(),
                    listsPlugin(),
                    linkPlugin(),
                    linkDialogPlugin(),
                    quotePlugin(),
                    tablePlugin(),
                    codeBlockPlugin(),
                    // codeMirrorPlugin({
                    //   codeBlockTheme: "dark",
                    //   codeBlockLanguageMap: {},
                    // }),
                    thematicBreakPlugin(),
                    frontmatterPlugin(),
                    imagePlugin({
                      imageUploadHandler: handleImageUpload,
                    }),
                    markdownShortcutPlugin(),
                    toolbarPlugin({
                      toolbarContents: () => (
                        <>
                          <UndoRedo />
                          <BoldItalicUnderlineToggles />
                          <BlockTypeSelect />
                          <InsertTable />
                          <InsertImage />
                          <InsertCodeBlock />
                          <InsertFrontmatter />
                          <InsertThematicBreak />
                          <CodeToggle />
                          <CreateLink />
                          <ListsToggle />
                        </>
                      ),
                    }),
                  ]}
                  contentEditableClassName="focus:outline-none min-h-[400px] p-4 text-gray-900 dark:text-gray-100"
                  className="h-full dark:[&_.mdx-editor-toolbar]:bg-gray-800 [&_.mdx-editor-toolbar]:bg-white"
                  spellCheck={true}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-gray-500">加载编辑器...</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-6 overflow-y-auto">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            在线用户 ({users.length})
          </h2>

          <div className="space-y-3">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50"
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: user.color || "#999" }}
                />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    光标位置: {user.cursorPosition ?? 0}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">加载中...</div>}>
      <EditorPageContent />
    </Suspense>
  );
}
