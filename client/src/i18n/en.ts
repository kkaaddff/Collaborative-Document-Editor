// English dictionary — satisfies the zh shape (missing keys fail the build).
import type { zh } from "./zh";

type Shape = {
  [S in keyof typeof zh]: Record<keyof (typeof zh)[S], string>;
};

export const en = {
  common: {
    appName: "Polyphony",
    tagline: "Many voices. One score.",
    close: "Close",
    cancel: "Cancel",
    unnamedDoc: "Untitled document",
    onlineRoom: "Live room",
    guestName: "User {n}",
    anonymous: "Anonymous",
  },

  home: {
    subtitle: "Realtime collaborative document editing",
    settingsLink: "Settings",
    username: "Username",
    usernamePlaceholder: "Enter your name (remembered for next time)",
    createTitle: "Create a new document",
    createDesc: "Spin up a collaborative document with an auto-generated room code",
    createBtn: "Create document",
    joinTitle: "Join an existing document",
    joinDesc: "Enter a room code, or pick one from the lists below",
    roomCode: "Room code",
    roomCodePlaceholder: "Enter the 8-character room code",
    joinBtn: "Join document",
    scanBtn: "Scan QR",
    scanBtnTitle: "Scan a room QR code to join directly",
    recentTitle: "My recent rooms",
    recentEmpty: "No rooms visited yet",
    onlineTitle: "Live rooms on server",
    onlineEmpty: "No rooms are online right now",
    nOnline: "{n} online",
    showQrTitle: "Show QR code",
    removeRecentTitle: "Remove from list",
    serverUnreachableBefore: "Cannot reach the collaboration server. If it is hosted elsewhere, go to",
    serverUnreachableLink: "Settings",
    serverUnreachableAfter: "and set the direct address (e.g. http://IP:PORT).",
    featureSyncTitle: "Realtime sync",
    featureSyncDesc: "Powered by Yjs CRDT — concurrent edits converge, conflict-free",
    featureRichTitle: "Rich text together",
    featureRichDesc: "Tables, images, code blocks and lists, visible to everyone as you type",
    featureRoomsTitle: "Room management",
    featureRoomsDesc: "Recent rooms one click away; rename rooms, remember names",
    alertNeedUsername: "Please enter a username",
    alertNeedRoomCode: "Please enter a room code",
    alertInvalidQr: "Not a valid room QR code",
    alertQrNeedUsername: "Room recognized — set a username to join",
  },

  settings: {
    title: "Settings",
    subtitle: "App preferences and collaboration server address",
    serverSection: "Server address",
    serverPlaceholder: "http://192.168.1.10:9091 or https://docs.example.com",
    serverHint1: "Collaboration (WS), image upload and the live-room list all use this address; leave empty to fall back to same-origin in the browser.",
    serverHint2: "On first use, test the connection before saving.",
    languageSection: "Language",
    languageAuto: "Follow system",
    languageZh: "中文",
    languageEn: "English",
    testBtn: "Test connection",
    testing: "Testing...",
    saveBtn: "Save & back",
    clearSaved: "Clear saved address (back to same-origin default)",
    backHome: "← Back home",
    needUrl: "Enter a server address first",
    testOk: "✓ Connected: {ms}ms · {rooms} rooms · {users} online",
    testFail: "✗ Connection failed: {msg}",
    connectFail: "Connection failed",
  },

  editor: {
    docContent: "Document",
    connectionClosed: "Connection closed",
    charCount: "{n} chars",
    uploadFail: "Image upload failed: {msg}",
    unknownError: "Unknown error",
    collabError: "Cannot reach the realtime collaboration service",
  },

  join: {
    entering: "Entering room...",
    needName: "Set a username first to join the room",
  },

  roomHeader: {
    room: "Room:",
    roomNamePlaceholder: "Room name",
    renameTitle: "Click to rename this room",
    copy: "Copy",
    copyOk: "Room code copied to clipboard",
    copyFail: "Copy failed — room code: {code}",
    qrBtn: "QR",
    qrBtnTitle: "Show room QR code (scan to join on phone)",
    connected: "Connected",
    disconnected: "Offline",
    leave: "Leave room",
  },

  usersPanel: {
    online: "Online ({n})",
  },

  qrModal: {
    title: "Scan to join",
    desc: "Scan with a phone camera or the app to join {code}",
  },

  scanModal: {
    cameraFallback: "Cannot access the camera — check permissions",
    httpsHint: "Browser scanning requires HTTPS; when connecting to http://IP directly, use the system camera or the app.",
    gotIt: "Got it",
    nativeStarting: "Starting native scanner...",
    aim: "Point the camera at the QR code",
  },

  errors: {
    E_NO_FILE: "No file was uploaded",
    E_FILE_TYPE: "Only jpg, jpeg, png, gif and webp images are supported",
    E_FILE_SIZE: "File must be under 5MB",
    E_UPLOAD: "Image upload failed",
  },
} as const satisfies Shape;
