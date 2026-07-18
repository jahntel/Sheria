/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { 
  Send, 
  Scale, 
  LogOut, 
  Trash2, 
  Plus, 
  Save, 
  FileText, 
  Download, 
  Copy, 
  Check, 
  BookOpen, 
  ChevronRight, 
  Sparkles,
  AlertCircle,
  FileDown,
  Edit3,
  Mic,
  MicOff,
  FileUp,
  Search,
  MessageSquare,
  History
} from "lucide-react";
import { User, Message, LawCitation, ScratchpadDocument, ChatSession } from "../types";
import FormattedMessage from "./FormattedMessage.tsx";
import { extractTextFromPdf } from "../utils/pdfParser";

interface LawyerWorkspaceProps {
  user: User;
  token: string;
  onLogout: () => void;
}

export default function LawyerWorkspace({ user, token, onLogout }: LawyerWorkspaceProps) {
  // Chat sessions & tab state
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [leftTab, setLeftTab] = useState<"history" | "statutes">("history");
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentStream, setCurrentStream] = useState("");
  const [activeCitations, setActiveCitations] = useState<LawCitation[]>([]);

  // Statutes search database state
  const [statutes, setStatutes] = useState<LawCitation[]>([]);
  const [statutesSearch, setStatutesSearch] = useState("");

  // Documents state
  const [documents, setDocuments] = useState<ScratchpadDocument[]>([]);
  const [activeDoc, setActiveDoc] = useState<ScratchpadDocument>({
    id: "",
    title: "Untitled Legal Draft",
    content: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  
  // UI States
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [copiedScratchpad, setCopiedScratchpad] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isFileParsing, setIsFileParsing] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-KE"; // Highly optimized for Kenyan vocal intonations

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setChatInput((prev) => prev ? prev + " " + transcript : transcript);
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
        if (event.error === "not-allowed") {
          setErrorMsg("Microphone permission denied. Since Jua Sheria runs in a secure preview frame, please ensure you allow microphone access in your browser, or open the app in a new tab using the top-right button.");
        } else if (event.error === "no-speech") {
          setErrorMsg("No speech detected. Please speak clearly into your microphone.");
        } else if (event.error === "network") {
          setErrorMsg("Speech recognition network error. Please check your internet connection.");
        } else {
          setErrorMsg(`Speech recognition failed: ${event.error || "unknown issue"}.`);
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech Recognition is not supported on this browser. Try Chrome, Safari or Edge.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
      }
    }
  };

  const handleFileImportToChat = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      setIsFileParsing(true);
      setErrorMsg(null);
      try {
        const text = await extractTextFromPdf(file);
        if (text) {
          setChatInput(text.slice(0, 5000));
        } else {
          throw new Error("No text content could be extracted from this PDF.");
        }
      } catch (err: any) {
        console.error("PDF extraction error:", err);
        setErrorMsg(err.message || "An error occurred during PDF text extraction.");
      } finally {
        setIsFileParsing(false);
      }
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          setChatInput(text.slice(0, 5000));
        }
      };
      reader.readAsText(file);
    }
    e.target.value = "";
  };

  const handleFileImportToScratchpad = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      setIsFileParsing(true);
      setErrorMsg(null);
      try {
        const text = await extractTextFromPdf(file);
        if (text) {
          const filenameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
          setActiveDoc({
            id: "",
            title: filenameWithoutExt || "Imported Pleadings",
            content: text,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          setSaveStatus("Document imported! Click 'Save Note' to save to index.");
          setTimeout(() => setSaveStatus(null), 4000);
        } else {
          throw new Error("No text content could be extracted from this PDF.");
        }
      } catch (err: any) {
        console.error("PDF extraction error:", err);
        setErrorMsg(err.message || "An error occurred during PDF text extraction.");
      } finally {
        setIsFileParsing(false);
      }
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          const filenameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
          setActiveDoc({
            id: "",
            title: filenameWithoutExt || "Imported Pleadings",
            content: text,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          setSaveStatus("Document imported! Click 'Save Note' to save to index.");
          setTimeout(() => setSaveStatus(null), 4000);
        }
      };
      reader.readAsText(file);
    }
    e.target.value = "";
  };

  const handleExportChat = () => {
    if (messages.length === 0) return;
    let content = `========================================================\n`;
    content += `   JUA SHERIA - COUNSEL WORKSPACE TRANSCRIPT\n`;
    content += `========================================================\n`;
    content += `Generated on: ${new Date().toLocaleString()}\n`;
    content += `Counsel: ${user.fullName}\n`;
    content += `Role: Lawyer / Advocate\n`;
    content += `========================================================\n\n`;

    messages.forEach((m) => {
      const label = m.role === "user" ? "COUNSEL" : "JUA SHERIA ASSISTANT";
      content += `[${m.timestamp}] ${label}:\n`;
      content += `${m.content}\n\n`;
      if (m.citations && m.citations.length > 0) {
        content += `STATUTORY CITATIONS ACCUMULATED:\n`;
        m.citations.forEach((c) => {
          content += `- ${c.section} of ${c.actName} ("${c.title}")\n`;
        });
        content += `\n`;
      }
      content += `--------------------------------------------------------\n\n`;
    });

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `JuaSheria_Counsel_Chat_Export.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const chatEndRef = useRef<HTMLDivElement>(null);

  const lawyerSuggestions = [
    { title: "Defend Eviction Claim", query: "Draft a comprehensive Memorandum of Defense for an illegal tenant eviction under the Landlord and Tenant Act. Focus on the requirements of Section 4 notice and the Landlord's obligations to keep premises habitable in Section 12." },
    { title: "Elements of Employment Claim", query: "Evaluate the elements of proof needed to establish a claim of unfair dismissal under Section 35 of the Employment Act 2007. What adversarial counter-arguments should Counsel anticipate?" },
    { title: "Constitutional Violation", query: "Assess direct discrimination under Article 27 of the Constitution of Kenya. What are the key thresholds required to establish a prima facie case in the High Court of Kenya?" },
    { title: "Penal Code Theft defense", query: "Assess the elements of theft under Section 268 of the Penal Code Chapter 63. Detail specific defenses regarding the 'claim of right' doctrine." }
  ];

  // Fetch Lawyer documents and chats on mount
  useEffect(() => {
    fetchDocuments();
    fetchChatSessions();
    fetchStatutes();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentStream]);

  const fetchChatSessions = async () => {
    try {
      const res = await fetch("/api/chat/sessions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
        if (data.length > 0) {
          setActiveSessionId(data[0].id);
          setMessages(data[0].messages);
        } else {
          initializeNewSession("Initial Litigation Strategy");
        }
      }
    } catch (e) {
      console.error("Failed to load chat sessions", e);
    }
  };

  const fetchStatutes = async () => {
    try {
      const res = await fetch("/api/laws");
      if (res.ok) {
        const data = await res.json();
        setStatutes(data);
      }
    } catch (e) {
      console.error("Failed to load statutes", e);
    }
  };

  const initializeNewSession = (title = "New Discussion") => {
    const newSessionId = "session-" + Math.random().toString(36).substr(2, 9);
    const welcomeMsg: Message = {
      id: "lawyer-welcome-" + Math.random().toString(36).substr(2, 9),
      role: "assistant",
      content: `Counsel ${user.fullName.split(" ")[1] || user.fullName}, welcome to your specialized **Jua Sheria litigation brainstorm hub**.

I am primed with the Constitution of Kenya 2010, the Employment Act Chapter 226, Tenant legislation, and Chapter 63 of the Penal Code.

On this split workspace, you can:
1. Brainstorm legal theories, check statutory elements of proof, and evaluate adversarial defenses on the **Chat interface**.
2. Edit agreements, draft pleadings, and export your legal submissions directly in the **Scratchpad workspace**.

*Quick Actions:* Use the suggestions below to initialize statutory reviews, or click "Append to Draft" on any message to transfer findings instantly to your editor.`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newSession: ChatSession = {
      id: newSessionId,
      userId: user.id,
      title: title,
      role: "lawyer",
      messages: [welcomeMsg],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setActiveSessionId(newSessionId);
    setMessages([welcomeMsg]);
    setSessions((prev) => [newSession, ...prev]);
    saveSessionToServer(newSession);
  };

  const saveSessionToServer = async (session: ChatSession) => {
    try {
      await fetch("/api/chat/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(session),
      });
    } catch (e) {
      console.error("Failed to save session to server", e);
    }
  };

  const selectSession = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (session) {
      setActiveSessionId(sessionId);
      setMessages(session.messages);
      setCurrentStream("");
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const remaining = sessions.filter((s) => s.id !== sessionId);
        setSessions(remaining);
        if (activeSessionId === sessionId) {
          if (remaining.length > 0) {
            setActiveSessionId(remaining[0].id);
            setMessages(remaining[0].messages);
          } else {
            initializeNewSession("New Discussion");
          }
        }
      }
    } catch (e) {
      console.error("Failed to delete session", e);
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await fetch("/api/documents", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
        if (data.length > 0) {
          setActiveDoc(data[0]);
        }
      }
    } catch (e) {
      console.error("Failed to load documents", e);
    }
  };

  const handleSaveDocument = async () => {
    setSaveStatus("Saving...");
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: activeDoc.id || undefined,
          title: activeDoc.title,
          content: activeDoc.content,
        }),
      });

      if (!res.ok) throw new Error("Could not save");

      const saved = await res.json();
      
      // Update local doc
      setActiveDoc(saved);
      
      // Refresh documents list
      await fetchDocuments();
      
      setSaveStatus("Saved successfully!");
      setTimeout(() => setSaveStatus(null), 2500);
    } catch (err) {
      setSaveStatus("Error saving.");
      setTimeout(() => setSaveStatus(null), 2500);
    }
  };

  const handleNewDocument = () => {
    setActiveDoc({
      id: "",
      title: "New Pleading Draft",
      content: `IN THE LAND AND ENVIRONMENT COURT / EMPLOYMENT COURT OF KENYA\nAT NAIROBI\n\nDraft Notes compiled on ${new Date().toLocaleDateString()}\n------------------------------------------------------\n\n`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setSaveStatus(null);
  };

  const handleDeleteDocument = async (id: string) => {
    if (!id) {
      handleNewDocument();
      return;
    }
    if (!confirm("Are you sure you want to delete this scratchpad draft?")) return;

    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
        handleNewDocument();
      }
    } catch (e) {
      console.error("Delete document failed", e);
    }
  };

  const handleSendChat = async (queryText: string) => {
    if (!queryText.trim() || loading) return;

    setErrorMsg(null);
    setChatInput("");
    setLoading(true);

    const userMsg: Message = {
      id: "msg-" + Math.random().toString(36).substr(2, 9),
      role: "user",
      content: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const updated = [...messages, userMsg];
    setMessages(updated);
    setCurrentStream("");

    // Detect session title updates
    let sessionTitle = sessions.find((s) => s.id === activeSessionId)?.title || "New Discussion";
    if (sessionTitle === "Initial Litigation Strategy" || sessionTitle === "New Discussion") {
      sessionTitle = queryText.slice(0, 35) + (queryText.length > 35 ? "..." : "");
    }

    const midSession: ChatSession = {
      id: activeSessionId,
      userId: user.id,
      title: sessionTitle,
      role: "lawyer",
      messages: updated,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setSessions((prev) =>
      prev.map((s) => (s.id === activeSessionId ? midSession : s))
    );
    saveSessionToServer(midSession);

    let accumulatedText = "";
    let fetchedCitations: LawCitation[] = [];

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: updated }),
      });

      if (!res.ok) throw new Error("Could not contact legal backend service.");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      if (!reader) throw new Error("Stream connection failed.");

      let finished = false;
      let buffer = "";

      while (!finished) {
        const { value, done } = await reader.read();
        finished = done;
        if (value) {
          buffer += decoder.decode(value, { stream: !done });
          const events = buffer.split("\n\n");
          buffer = events.pop() || "";

          for (const ev of events) {
            if (!ev.trim()) continue;
            const lines = ev.split("\n");
            let eventType = "message";
            let dataStr = "";

            for (const line of lines) {
              if (line.startsWith("event: ")) {
                eventType = line.replace("event: ", "").trim();
              } else if (line.startsWith("data: ")) {
                dataStr = line.replace("data: ", "").trim();
              }
            }

            if (eventType === "citations") {
              try {
                fetchedCitations = JSON.parse(dataStr);
                setActiveCitations((prev) => [...prev, ...fetchedCitations]);
              } catch (e) {
                console.error("Citations parse error", e);
              }
            } else if (eventType === "chunk") {
              try {
                const chunkObj = JSON.parse(dataStr);
                accumulatedText += chunkObj.text;
                setCurrentStream(accumulatedText);
              } catch (e) {
                console.error("Chunk parse error", e);
              }
            } else if (eventType === "error") {
              const errObj = JSON.parse(dataStr);
              throw new Error(errObj.error || "Server error during streaming");
            }
          }
        }
      }

      // Conclude chat message
      const assistantMsg: Message = {
        id: "msg-" + Math.random().toString(36).substr(2, 9),
        role: "assistant",
        content: accumulatedText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        citations: fetchedCitations,
      };

      const finalMessages = [...updated, assistantMsg];
      setMessages(finalMessages);
      setCurrentStream("");

      const finalSession: ChatSession = {
        id: activeSessionId,
        userId: user.id,
        title: sessionTitle,
        role: "lawyer",
        messages: finalMessages,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setSessions((prev) =>
        prev.map((s) => (s.id === activeSessionId ? finalSession : s))
      );
      saveSessionToServer(finalSession);
    } catch (err: any) {
      console.error("Chat error", err);
      setErrorMsg(err.message || "An unexpected error occurred during statutory research.");
    } finally {
      setLoading(false);
    }
  };

  const appendToScratchpad = (text: string) => {
    // Strip citation syntax wrappers for cleaner pleading integration
    const cleanedText = text.replace(/\[Citation:\s*([^\]]+)\]/g, "($1)");
    setActiveDoc((prev) => ({
      ...prev,
      content: prev.content + `\n\n--- AI ASSISTED DRAFT NOTES ---\n` + cleanedText,
    }));
    setSaveStatus("Appended to active scratchpad! Press save to secure.");
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const copyScratchpadText = () => {
    navigator.clipboard.writeText(activeDoc.content);
    setCopiedScratchpad(true);
    setTimeout(() => setCopiedScratchpad(false), 2000);
  };

  const downloadScratchpad = () => {
    const element = document.createElement("a");
    const file = new Blob([activeDoc.content], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `${activeDoc.title.replace(/\s+/g, "_")}_draft.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div id="lawyer-workspace-root" className="h-screen bg-slate-900 flex flex-col font-sans text-slate-100 overflow-hidden">
      {/* High-contrast national ribbon */}
      <div className="h-1.5 w-full flex flex-shrink-0">
        <div className="bg-black flex-1" />
        <div className="bg-red-600 flex-1 border-y-[0.5px] border-white" />
        <div className="bg-emerald-600 flex-1" />
      </div>

      {/* Corporate Professional Header */}
      <header className="bg-slate-950 border-b border-slate-800 px-6 py-3.5 sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-950 border border-emerald-800 text-emerald-300 rounded-xl">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight flex items-center gap-2">
              Jua <span className="text-emerald-400">Sheria</span>
              <span className="text-[10px] font-black bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-sm uppercase tracking-widest">
                Counsel Workspace
              </span>
            </span>
            <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">
              Litigation Strategy & statutory brainstorming
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold text-slate-400">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span>Advocate Database Active</span>
          </div>

          <div className="flex items-center gap-2 text-xs bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-300">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="font-bold">{user.fullName}</span>
          </div>

          <button
            id="lawyer-logout-btn"
            onClick={onLogout}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-400 hover:bg-red-950/40 border border-red-900 rounded-lg font-bold transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Primary Split Workspace */}
      <div className="flex-1 flex flex-col md:grid md:grid-cols-12 overflow-hidden h-[calc(100vh-4.5rem)]">
        
        {/* LEFTMOST COLUMN: Tabbed Sidebar (3/12 columns) */}
        <aside className="md:col-span-3 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col overflow-hidden bg-slate-950 h-[30vh] md:h-full">
          {/* Tabs header */}
          <div className="flex border-b border-slate-800 bg-slate-900/40">
            <button
              onClick={() => setLeftTab("history")}
              className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
                leftTab === "history"
                  ? "border-emerald-500 text-emerald-400 bg-slate-900/60"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <History className="w-4 h-4" />
              <span>Chat History</span>
            </button>
            <button
              onClick={() => setLeftTab("statutes")}
              className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
                leftTab === "statutes"
                  ? "border-emerald-500 text-emerald-400 bg-slate-900/60"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Statutes KB</span>
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 flex flex-col overflow-hidden p-3.5 space-y-3.5">
            {leftTab === "history" ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* New chat button */}
                <button
                  onClick={() => initializeNewSession()}
                  className="w-full py-2 px-3 bg-emerald-950/40 hover:bg-emerald-900/30 text-emerald-300 border border-emerald-800/60 hover:border-emerald-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer mb-3.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Start New Chat</span>
                </button>

                {/* Session list */}
                <div className="flex-1 overflow-y-auto space-y-2">
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-widest px-1 pb-1 border-b border-slate-900">
                    Your Saved Chats
                  </div>
                  {sessions.length === 0 ? (
                    <div className="text-center py-8 text-slate-600">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-35" />
                      <p className="text-[11px] font-medium tracking-wide">No active chats saved</p>
                    </div>
                  ) : (
                    sessions.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => selectSession(s.id)}
                        className={`group relative p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between gap-2 ${
                          activeSessionId === s.id
                            ? "bg-emerald-950/20 border-emerald-800/80 ring-1 ring-emerald-800/40 text-emerald-300"
                            : "bg-slate-900/20 border-slate-850 hover:bg-slate-900/50 hover:border-slate-800 text-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden flex-1">
                          <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${activeSessionId === s.id ? "text-emerald-400" : "text-slate-500"}`} />
                          <span className="text-xs truncate font-medium">{s.title}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Delete this conversation thread?")) {
                              deleteSession(s.id);
                            }
                          }}
                          className="text-slate-600 hover:text-red-400 p-1 rounded-md hover:bg-slate-900/80 transition-all cursor-pointer"
                          title="Delete thread"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Search input */}
                <div className="relative mb-3 flex-shrink-0">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={statutesSearch}
                    onChange={(e) => setStatutesSearch(e.target.value)}
                    placeholder="Search Kenyan statutes..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                </div>

                {/* Statutes List */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {statutes.filter(law => {
                    const term = statutesSearch.toLowerCase();
                    return (
                      law.actName.toLowerCase().includes(term) ||
                      law.section.toLowerCase().includes(term) ||
                      law.title.toLowerCase().includes(term) ||
                      law.text.toLowerCase().includes(term)
                    );
                  }).length === 0 ? (
                    <div className="text-center py-8 text-slate-600">
                      <Search className="w-8 h-8 mx-auto mb-2 opacity-35" />
                      <p className="text-[11px] font-medium tracking-wide">No statutes matched</p>
                    </div>
                  ) : (
                    statutes.filter(law => {
                      const term = statutesSearch.toLowerCase();
                      return (
                        law.actName.toLowerCase().includes(term) ||
                        law.section.toLowerCase().includes(term) ||
                        law.title.toLowerCase().includes(term) ||
                        law.text.toLowerCase().includes(term)
                      );
                    }).map((law) => (
                      <div
                        key={law.id}
                        className="p-3 bg-slate-900/40 border border-slate-850 rounded-xl space-y-2 text-left"
                      >
                        <div>
                          <span className="text-[9px] font-extrabold uppercase bg-slate-950 px-2 py-0.5 rounded-sm border border-slate-850 text-slate-400">
                            {law.actName}
                          </span>
                          <h4 className="text-xs font-bold text-slate-200 mt-1.5">
                            {law.section}: {law.title}
                          </h4>
                          <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-3 mt-1 font-mono">
                            {law.text}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            const formatted = `[Citation: ${law.section} of ${law.actName}]`;
                            setChatInput((prev) => prev ? prev + " " + formatted : formatted);
                            // Visual feedback
                            setSaveStatus(`Pasted citation references into chat input!`);
                            setTimeout(() => setSaveStatus(null), 3000);
                          }}
                          className="w-full py-1 px-2 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-900 hover:border-emerald-700 text-emerald-300 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Paste Citation</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* MIDDLE COLUMN: Brainstorming Legal Chat (5/12 columns) */}
        <section className="md:col-span-5 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-between overflow-hidden bg-slate-950">
          
          {/* Chat Info Header */}
          <div className="bg-slate-900/50 p-3 px-4 border-b border-slate-800 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-400 flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-emerald-400" />
              LITIGATION BRAINSTORMING PANEL
            </span>
            <span className="text-[10px] text-slate-500">Low-latency statutory engine</span>
          </div>

          {/* Chat Logs Display */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[45vh] md:max-h-none">
            {messages.map((m) => (
              <div
                key={m.id}
                id={`lawyer-message-${m.id}`}
                className={`flex gap-3 max-w-[90%] text-left ${m.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
              >
                {/* Icon avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border ${
                  m.role === "user" 
                    ? "bg-slate-800 text-slate-200 border-slate-700" 
                    : "bg-emerald-950 border-emerald-800 text-emerald-400"
                }`}>
                  <Scale className="w-4 h-4" />
                </div>

                {/* Content Box */}
                <div className="space-y-1">
                  <div className={`p-4 rounded-xl border ${
                    m.role === "user"
                      ? "bg-emerald-950 border-emerald-800 text-slate-100 rounded-tr-none"
                      : "bg-slate-900 border-slate-800 text-slate-200 rounded-tl-none"
                  }`}>
                    {m.role === "user" ? (
                      <p className="text-sm font-medium whitespace-pre-wrap leading-relaxed">{m.content}</p>
                    ) : (
                      <FormattedMessage content={m.content} citations={m.citations} />
                    )}

                    {/* Quick copy/append controls on assistant messages */}
                    {m.role === "assistant" && m.id !== "lawyer-welcome" && (
                      <div className="flex gap-2 border-t border-slate-850 mt-3 pt-2.5 text-xs">
                        <button
                          id={`btn-append-to-scratchpad-${m.id}`}
                          onClick={() => appendToScratchpad(m.content)}
                          className="px-2.5 py-1 text-[11px] bg-slate-950 border border-slate-800 text-emerald-400 font-bold rounded-md hover:bg-emerald-950 hover:border-emerald-700 transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Append to Draft
                        </button>
                        <button
                          id={`btn-copy-to-clipboard-${m.id}`}
                          onClick={() => copyToClipboard(m.content, m.id)}
                          className="px-2.5 py-1 text-[11px] bg-slate-950 border border-slate-800 text-slate-400 hover:text-white rounded-md transition-all flex items-center gap-1 cursor-pointer"
                        >
                          {copiedMessageId === m.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              Copy Text
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                  <span className="block text-[9px] text-slate-500 font-bold px-1">
                    {m.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {/* SSE Real-time Stream */}
            {currentStream && (
              <div id="lawyer-streaming-bubble" className="flex gap-3 max-w-[90%] text-left mr-auto">
                <div className="w-8 h-8 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center flex-shrink-0 animate-pulse">
                  <Scale className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <div className="p-4 rounded-xl bg-slate-900 border border-emerald-800/40 text-slate-200 rounded-tl-none">
                    <FormattedMessage content={currentStream} citations={activeCitations} />
                    <span className="inline-block w-2.5 h-4 bg-emerald-400 animate-pulse ml-1 align-middle" />
                  </div>
                  <span className="block text-[9px] text-slate-500 font-bold">
                    Drafting argument...
                  </span>
                </div>
              </div>
            )}

            {loading && !currentStream && (
              <div id="lawyer-generating-loader" className="flex gap-3 max-w-[90%] text-left mr-auto">
                <div className="w-8 h-8 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <Scale className="w-4 h-4 animate-spin" />
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 rounded-tl-none text-xs text-slate-400 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce delay-75" />
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce delay-150" />
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce delay-300" />
                  <span>Counsel Workspace is linking statutory database records...</span>
                </div>
              </div>
            )}

            {errorMsg && (
              <div id="lawyer-chat-error" className="p-3.5 bg-red-950/40 border border-red-900 text-red-200 text-xs rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
                <div>
                  <p className="font-bold">Brainstorm Session Interrupted</p>
                  <p className="mt-0.5">{errorMsg}</p>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Quick Litigation Prompts Drawer */}
          {messages.length <= 2 && !loading && (
            <div id="lawyer-suggestions-shelf" className="px-4 py-3 bg-slate-900/40 border-t border-slate-850 text-left">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Select strategy template to initiate
              </span>
              <div className="grid grid-cols-2 gap-2">
                {lawyerSuggestions.map((s, idx) => (
                  <button
                    key={idx}
                    id={`lawyer-suggestion-btn-${idx}`}
                    onClick={() => handleSendChat(s.query)}
                    className="p-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-emerald-700/80 rounded-xl text-left transition-all cursor-pointer space-y-0.5 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="block text-xs font-bold text-emerald-400 group-hover:text-emerald-300">
                        {s.title}
                      </span>
                      <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-emerald-400 transition-colors" />
                    </div>
                    <span className="block text-[10px] text-slate-500 truncate leading-tight">
                      {s.query}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat input form */}
          <div className="p-4 border-t border-slate-800 bg-slate-950">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChat(chatInput);
              }}
              className="flex items-center gap-2"
            >
              {/* Mic Dictation */}
              <button
                id="lawyer-voice-input-btn"
                type="button"
                onClick={toggleListening}
                title={isListening ? "Listening... Click to stop" : "Voice input (Dictation)"}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                  isListening
                    ? "bg-red-950/80 text-red-400 border-red-900 animate-pulse"
                    : "text-slate-400 hover:text-emerald-400 hover:bg-slate-900 border-slate-800"
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* File Import to Chat input */}
              <label
                htmlFor="lawyer-file-import"
                title={isFileParsing ? "Extracting PDF text..." : "Import text into chat input from a file (.txt, .md, .json, .pdf)"}
                className={`p-2.5 border rounded-xl transition-colors cursor-pointer flex items-center justify-center ${
                  isFileParsing
                    ? "bg-amber-950/80 text-amber-400 border-amber-900 animate-pulse"
                    : "text-slate-400 hover:text-emerald-400 hover:bg-slate-900 border-slate-800"
                }`}
              >
                <FileUp className="w-4 h-4" />
                <input
                  id="lawyer-file-import"
                  type="file"
                  accept=".txt,.md,.json,.pdf"
                  disabled={isFileParsing || loading}
                  className="hidden"
                  onChange={handleFileImportToChat}
                />
              </label>

              {/* Export Chat history */}
              <button
                id="lawyer-export-chat-btn"
                type="button"
                onClick={handleExportChat}
                title="Export entire chat transcript"
                disabled={messages.length <= 1 || isFileParsing}
                className="p-2.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-900 border border-slate-800 rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <Download className="w-4 h-4" />
              </button>

              <input
                id="lawyer-chat-input-field"
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={
                  isFileParsing 
                    ? "Extracting PDF text with Jua Sheria AI..." 
                    : isListening 
                      ? "Listening... Speak clearly now" 
                      : "Enter query (e.g. elements of Section 29 maternity leave claim, tenant defenses...)"
                }
                disabled={loading || isFileParsing}
                className="flex-1 px-4 py-2.5 text-sm bg-slate-900 border border-slate-800 focus:bg-slate-950 text-slate-150 rounded-xl focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600 outline-none transition-all disabled:opacity-50"
              />
              <button
                id="lawyer-send-message-btn"
                type="submit"
                disabled={loading || isFileParsing || !chatInput.trim()}
                className="p-2.5 bg-emerald-900 hover:bg-emerald-850 disabled:opacity-50 text-white rounded-xl shadow-md transition-all cursor-pointer flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

        </section>

        {/* RIGHT COLUMN: Document Workspace / Scratchpad (4/12 columns) */}
        <section className="md:col-span-4 flex flex-col overflow-hidden bg-slate-900">
          
          {/* Scratchpad toolbar */}
          <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span className="font-extrabold uppercase tracking-wider text-slate-300">Pleadings Scratchpad</span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Import Draft to Scratchpad */}
              <label
                htmlFor="scratchpad-file-import"
                title={isFileParsing ? "Extracting PDF text..." : "Import existing draft from a file (.txt, .md, .json, .pdf)"}
                className={`px-2.5 py-1.5 border rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer text-xs ${
                  isFileParsing
                    ? "bg-amber-950/80 text-amber-400 border-amber-900 animate-pulse"
                    : "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300"
                }`}
              >
                <FileUp className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isFileParsing ? "Extracting..." : "Import Draft"}</span>
                <input
                  id="scratchpad-file-import"
                  type="file"
                  accept=".txt,.md,.json,.pdf"
                  disabled={isFileParsing}
                  className="hidden"
                  onChange={handleFileImportToScratchpad}
                />
              </label>

              <button
                id="btn-scratchpad-new"
                onClick={handleNewDocument}
                title="Create a new draft notes scratchpad"
                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Draft</span>
              </button>
              
              <button
                id="btn-scratchpad-save"
                onClick={handleSaveDocument}
                className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Note</span>
              </button>
            </div>
          </div>

          {/* Active Edit Form and Saved documents catalog split */}
          <div className="flex-1 flex flex-col md:grid md:grid-cols-12 overflow-hidden h-full">
            
            {/* Drafts Catalog (Left sub-panel on right workspace) */}
            <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-950/40 p-3 overflow-y-auto space-y-2.5">
              <div className="flex items-center justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest pb-1 border-b border-slate-850">
                <span>Pleadings Index</span>
                <span>{documents.length} Saved</span>
              </div>

              {documents.length === 0 ? (
                <div className="text-center py-8 text-slate-600 border border-dashed border-slate-850 rounded-xl">
                  <FileText className="w-8 h-8 mx-auto mb-1 opacity-40" />
                  <p className="text-[10px] uppercase font-bold tracking-wider">No drafts indexed</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {documents.map((d) => (
                    <div
                      key={d.id}
                      id={`pleading-index-item-${d.id}`}
                      onClick={() => {
                        setActiveDoc(d);
                        setSaveStatus(null);
                      }}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                        activeDoc.id === d.id
                          ? "bg-emerald-950/40 border-emerald-800/80 ring-1 ring-emerald-800"
                          : "bg-slate-950/30 border-slate-850 hover:bg-slate-900 hover:border-slate-800"
                      }`}
                    >
                      <h4 className="text-xs font-bold text-slate-200 truncate leading-tight">
                        {d.title}
                      </h4>
                      <div className="flex items-center justify-between mt-1.5 text-[9px] text-slate-500 font-semibold">
                        <span>{new Date(d.updatedAt).toLocaleDateString()}</span>
                        <button
                          id={`delete-doc-btn-${d.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDocument(d.id);
                          }}
                          className="hover:text-red-400 p-0.5 rounded-sm"
                          title="Delete draft notes"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Document Editor workspace */}
            <div className="md:col-span-8 flex flex-col h-full bg-slate-900/60">
              
              {/* Document Metadata editing controls */}
              <div className="p-3 bg-slate-950/30 border-b border-slate-800/60 grid gap-2.5">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-emerald-400" />
                  <input
                    id="scratchpad-title-input"
                    type="text"
                    value={activeDoc.title}
                    onChange={(e) => setActiveDoc((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter scratchpad title... (e.g. Defense John Kamau)"
                    className="flex-1 bg-transparent border-b border-transparent hover:border-slate-800 focus:border-emerald-600 outline-none text-sm font-bold text-white transition-all py-0.5"
                  />
                </div>
              </div>

              {/* Text Area draft editor */}
              <div className="flex-1 p-3">
                <textarea
                  id="scratchpad-textarea-editor"
                  value={activeDoc.content}
                  onChange={(e) => setActiveDoc((prev) => ({ ...prev, content: e.target.value }))}
                  placeholder="Counsel notes, compiled legal arguments, draft agreements, and memorandum sections can be composed here..."
                  className="w-full h-full bg-slate-950/30 border border-slate-850 hover:border-slate-800 focus:border-emerald-900 rounded-xl p-4 text-sm font-mono text-slate-300 leading-relaxed outline-none resize-none focus:ring-2 focus:ring-emerald-900/20 transition-all shadow-inner"
                />
              </div>

              {/* Bottom status bar with helper copies / exports */}
              <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  {saveStatus ? (
                    <span id="scratchpad-save-indicator" className="text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      {saveStatus}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">
                      Local scratchpad database synced
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id="btn-scratchpad-copy"
                    onClick={copyScratchpadText}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-850 hover:border-slate-800 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                  >
                    {copiedScratchpad ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Draft</span>
                      </>
                    )}
                  </button>

                  <button
                    id="btn-scratchpad-export"
                    onClick={downloadScratchpad}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-850 hover:border-slate-800 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                    title="Export draft notes to your desktop as a .txt document file"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Export Pleadings</span>
                  </button>
                </div>
              </div>

            </div>

          </div>

        </section>

      </div>
    </div>
  );
}
