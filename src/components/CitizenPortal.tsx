/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { 
  Send, 
  HelpCircle, 
  Scale, 
  LogOut, 
  Trash2, 
  MapPin, 
  User as UserIcon, 
  FileText, 
  AlertCircle,
  Clock,
  Sparkles,
  Search,
  BookOpen,
  Mic,
  MicOff,
  FileUp,
  Download,
  Plus,
  MessageSquare,
  History
} from "lucide-react";
import { User, Message, LawCitation, ChatSession } from "../types";
import FormattedMessage from "./FormattedMessage.tsx";
import { extractTextFromPdf } from "../utils/pdfParser";

interface CitizenPortalProps {
  user: User;
  token: string;
  onLogout: () => void;
}

export default function CitizenPortal({ user, token, onLogout }: CitizenPortalProps) {
  // Chat sessions state
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentResponseStream, setCurrentResponseStream] = useState("");
  const [activeCitations, setActiveCitations] = useState<LawCitation[]>([]);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Suggested quick prompts in Kenyan daily context
  const suggestions = [
    { text: "Labor Rights", desc: "Maternity leave & salary limits", query: "What are my statutory rights for maternity leave and minimum conditions under the Kenyan Employment Act?" },
    { text: "Rent Increment", desc: "Can my landlord raise rent?", query: "My landlord wants to increase my rent suddenly. Does Kenyan Tenant law allow this, and can I be evicted?" },
    { text: "Unfair Dismissal", desc: "Fired without written notice", query: "I was fired from my monthly work suddenly without notice. What does Kenyan Employment Act Chapter 226 say about notice?" },
    { text: "Discrimination", desc: "Pregnancy or health-related", query: "Can an employer discriminate or fire someone on grounds of pregnancy or health status under Kenyan Constitution Article 27?" },
  ];

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentResponseStream]);

  useEffect(() => {
    fetchChatSessions();
  }, []);

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
          initializeNewSession("Sheria Help Session");
        }
      }
    } catch (e) {
      console.error("Failed to load chat sessions", e);
    }
  };

  const initializeNewSession = (title = "New Discussion") => {
    const newSessionId = "session-" + Math.random().toString(36).substr(2, 9);
    const welcomeMsg: Message = {
      id: "welcome-msg-" + Math.random().toString(36).substr(2, 9),
      role: "assistant",
      content: `Habari gani ${user.fullName.split(" ")[0]}! Welcome to **Jua Sheria Citizen Portal**. 

I am your AI legal assistant designed to translate complex Kenyan laws into plain, simple English and Swahili. 

*Disclaimer: Jua Sheria is an information-only tool. I provide clear statutory guidelines and legal information to raise your awareness, but I do NOT offer official attorney-client legal advice. If you face active litigation, please seek a certified advocate or visit a Huduma Centre.*

Select one of the common citizen questions below, or type your situation in plain words.`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newSession: ChatSession = {
      id: newSessionId,
      userId: user.id,
      title: title,
      role: "citizen",
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
      setCurrentResponseStream("");
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
            initializeNewSession("Sheria Help Session");
          }
        }
      }
    } catch (e) {
      console.error("Failed to delete session", e);
    }
  };

  const handleSendMessage = async (queryText: string) => {
    if (!queryText.trim() || loading) return;

    setErrorMsg(null);
    setInput("");
    setLoading(true);

    const userMsg: Message = {
      id: "msg-" + Math.random().toString(36).substr(2, 9),
      role: "user",
      content: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    // Auto update session title if default
    let sessionTitle = sessions.find((s) => s.id === activeSessionId)?.title || "Sheria Help Session";
    if (sessionTitle === "Sheria Help Session" || sessionTitle === "New Discussion") {
      sessionTitle = queryText.slice(0, 35) + (queryText.length > 35 ? "..." : "");
    }

    const midSession: ChatSession = {
      id: activeSessionId,
      userId: user.id,
      title: sessionTitle,
      role: "citizen",
      messages: updatedMessages,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setSessions((prev) =>
      prev.map((s) => (s.id === activeSessionId ? midSession : s))
    );
    saveSessionToServer(midSession);

    // Temp message placeholder for stream rendering
    setCurrentResponseStream("");
    let accumulatedText = "";
    let fetchedCitations: LawCitation[] = [];

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (!response.ok) {
        throw new Error("Failed to reach Jua Sheria services. Check connection.");
      }

      // Read SSE stream
      const reader = response.body?.getReader();
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
          // Keep the last partial event in the buffer
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
                console.error("Citations parse err", e);
              }
            } else if (eventType === "chunk") {
              try {
                const chunkObj = JSON.parse(dataStr);
                accumulatedText += chunkObj.text;
                setCurrentResponseStream(accumulatedText);
              } catch (e) {
                console.error("Chunk parse err", e);
              }
            } else if (eventType === "error") {
              try {
                const errObj = JSON.parse(dataStr);
                throw new Error(errObj.error || "Server streamed an error");
              } catch (e) {
                throw e;
              }
            }
          }
        }
      }

      // Stream finalized
      const assistantMsg: Message = {
        id: "msg-" + Math.random().toString(36).substr(2, 9),
        role: "assistant",
        content: accumulatedText || "Jua Sheria was unable to compile the answer chunk. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        citations: fetchedCitations,
      };

      const finalMessages = [...updatedMessages, assistantMsg];
      setMessages(finalMessages);
      setCurrentResponseStream("");

      const finalSession: ChatSession = {
        id: activeSessionId,
        userId: user.id,
        title: sessionTitle,
        role: "citizen",
        messages: finalMessages,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setSessions((prev) =>
        prev.map((s) => (s.id === activeSessionId ? finalSession : s))
      );
      saveSessionToServer(finalSession);
    } catch (err: any) {
      console.error("Stream reader error:", err);
      setErrorMsg(err.message || "Something went wrong in the connection.");
    } finally {
      setLoading(false);
    }
  };

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
      rec.lang = "en-KE"; // Supports Kenyan English accent elements nicely

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput((prev) => prev ? prev + " " + transcript : transcript);
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

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      setIsFileParsing(true);
      setErrorMsg(null);
      try {
        const text = await extractTextFromPdf(file);
        if (text) {
          setInput(text.slice(0, 5000));
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
          setInput(text.slice(0, 5000));
        }
      };
      reader.readAsText(file);
    }
    e.target.value = ""; // Reset
  };

  const handleExportChat = () => {
    if (messages.length === 0) return;
    let content = `========================================================\n`;
    content += `   JUA SHERIA - KENYAN LEGAL INFORMATION TRANSCRIPT\n`;
    content += `========================================================\n`;
    content += `Generated on: ${new Date().toLocaleString()}\n`;
    content += `User: ${user.fullName}\n`;
    content += `Role: Citizen\n`;
    content += `========================================================\n\n`;

    messages.forEach((m) => {
      const label = m.role === "user" ? "CITIZEN" : "JUA SHERIA CHATBOT";
      content += `[${m.timestamp}] ${label}:\n`;
      content += `${m.content}\n\n`;
      if (m.citations && m.citations.length > 0) {
        content += `VERIFIED REFERENCE CITATIONS:\n`;
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
    link.download = `JuaSheria_Citizen_Chat_Export.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const clearChat = () => {
    setMessages([
      {
        id: "welcome-msg",
        role: "assistant",
        content: `Chat history reset. How can I guide you on Kenyan laws today, ${user.fullName.split(" ")[0]}?`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setActiveCitations([]);
  };

  return (
    <div id="citizen-portal-root" className="h-screen bg-slate-50 flex flex-col font-sans overflow-hidden">
      {/* Red, black, green header bar */}
      <div className="h-1.5 w-full flex flex-shrink-0">
        <div className="bg-black flex-1" />
        <div className="bg-red-600 flex-1 border-y-[0.5px] border-white" />
        <div className="bg-emerald-600 flex-1" />
      </div>

      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-3.5 flex-shrink-0 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-800 text-white rounded-lg">
            <Scale className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <span className="font-extrabold text-xl text-slate-900 tracking-tight flex items-center gap-1.5">
              Jua <span className="text-emerald-700">Sheria</span>
              <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                Mwananchi Portal
              </span>
            </span>
            <span className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              Accessible Kenyan Legal Guidance
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Active Citizen Badge */}
          <div className="hidden md:flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full text-xs">
            <UserIcon className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-bold text-slate-700">{user.fullName}</span>
          </div>

          <button
            id="citizen-logout-btn"
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 font-bold border border-red-200 rounded-xl transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Portal Exit</span>
          </button>
        </div>
      </header>

      {/* Main Responsive Chat Layout - spans at least 3/4 of screen (max-w-[85vw] and max-w-7xl) and stays fixed (overflow-hidden) */}
      <div className="flex-1 max-w-7xl md:max-w-[85vw] w-full mx-auto flex flex-col md:flex-row gap-4 p-3 md:p-6 overflow-hidden">
        
        {/* Leftmost Column: Citizen Chat History */}
        <aside className="w-full md:w-64 flex-shrink-0 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col shadow-xs md:h-full overflow-hidden">
          <button
            onClick={() => initializeNewSession("New Discussion")}
            className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border border-emerald-200 hover:border-emerald-300 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer mb-4 flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat Thread</span>
          </button>

          <div className="flex-1 overflow-y-auto space-y-2">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest px-1 pb-1 border-b border-slate-100">
              Your Past Chats
            </div>
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
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
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold shadow-2xs"
                      : "bg-slate-50 border-slate-100 hover:bg-slate-100 hover:border-slate-200 text-slate-650"
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden flex-1">
                    <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${activeSessionId === s.id ? "text-emerald-600" : "text-slate-400"}`} />
                    <span className="text-xs truncate font-medium">{s.title}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Delete this conversation thread?")) {
                        deleteSession(s.id);
                      }
                    }}
                    className="text-slate-400 hover:text-red-500 p-1 rounded-md hover:bg-slate-100 transition-all cursor-pointer"
                    title="Delete thread"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Left column / sidebar on desktop: Statutory Context Ledger - fixed height, non-scrollable layout */}
        <aside className="w-full md:w-72 flex-shrink-0 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-xs md:h-full overflow-hidden">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-800 border-b border-slate-150 pb-2.5">
              <BookOpen className="w-4 h-4 text-emerald-700" />
              <h2 className="font-bold text-xs uppercase tracking-wider text-slate-500">Legal Citations</h2>
            </div>
            
            <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
              Verified legal citations referenced during your current chat will accumulate here. Click any of the inline green badges to view official statutory definitions.
            </p>

            <div className="space-y-2 max-h-[40vh] md:max-h-[55vh] overflow-y-auto pr-1">
              {activeCitations.length === 0 ? (
                <div className="text-center py-6 text-slate-300 border-2 border-dashed border-slate-100 rounded-xl">
                  <Clock className="w-7 h-7 mx-auto mb-1 opacity-70" />
                  <p className="text-[10px] font-bold uppercase tracking-wider">No active references</p>
                </div>
              ) : (
                // Group citations uniquely by id
                Array.from(new Map<string, LawCitation>(activeCitations.map(item => [item.id, item])).values()).map((c) => (
                  <div
                    key={c.id}
                    id={`sidebar-citation-${c.id}`}
                    className="p-2.5 bg-slate-50 border border-slate-150 rounded-xl flex items-start gap-2 text-left shadow-2xs hover:bg-emerald-50/40 hover:border-emerald-200 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-850 leading-tight">
                        {c.section}: {c.title}
                      </h4>
                      <p className="text-[9px] uppercase font-semibold text-slate-400 tracking-wider mt-0.5">
                        {c.actName}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 mt-4">
            <div className="bg-emerald-50 text-emerald-950 p-3 rounded-xl border border-emerald-100 space-y-1 text-left">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Mwananchi Care</span>
              </div>
              <p className="text-[10px] text-emerald-900 leading-relaxed">
                Jua Sheria operates offline-first using actual laws of Kenya compiled directly from Laws.Africa registry data.
              </p>
            </div>
          </div>
        </aside>

        {/* Center / Chat Display */}
        <main className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between md:h-full">
          
          {/* Chat disclaimer notice at the very top */}
          <div className="bg-amber-50 border-b border-amber-100 p-3 px-4 text-amber-900 text-xs flex items-start gap-2 text-left font-medium">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Mwananchi Notice:</strong> This portal translates legal text for general awareness. It does not replace physical legal advisors.
            </p>
          </div>

          {/* Active Messages Display Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                id={`message-bubble-${m.id}`}
                className={`flex gap-3 max-w-[85%] text-left ${m.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
              >
                {/* Avatar icon */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                  m.role === "user" ? "bg-slate-250 text-slate-700 font-bold border border-slate-300 text-xs" : "bg-emerald-800 text-white"
                }`}>
                  {m.role === "user" ? <UserIcon className="w-4 h-4" /> : <Scale className="w-4 h-4 text-emerald-300" />}
                </div>

                {/* Bubble Container */}
                <div className="space-y-1">
                  <div className={`p-4 rounded-2xl shadow-2xs ${
                    m.role === "user"
                      ? "bg-emerald-900 text-white rounded-tr-none"
                      : "bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-none"
                  }`}>
                    {m.role === "user" ? (
                      <p className="text-sm md:text-base whitespace-pre-wrap">{m.content}</p>
                    ) : (
                      <FormattedMessage content={m.content} citations={m.citations} />
                    )}
                  </div>
                  <span className={`block text-[9px] text-slate-400 font-medium px-1 ${m.role === "user" ? "text-right" : "text-left"}`}>
                    {m.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {/* SSE Real-Time Stream Placeholder */}
            {currentResponseStream && (
              <div id="streaming-message-bubble" className="flex gap-3 max-w-[85%] text-left mr-auto">
                <div className="w-8 h-8 rounded-full bg-emerald-800 text-white flex items-center justify-center flex-shrink-0 shadow-sm animate-pulse">
                  <Scale className="w-4 h-4 text-emerald-300" />
                </div>
                <div className="space-y-1">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-emerald-200 text-slate-800 rounded-tl-none shadow-sm">
                    <FormattedMessage content={currentResponseStream} citations={activeCitations} />
                    {/* Animated breathing cursor */}
                    <span className="inline-block w-2.5 h-4 bg-emerald-700 animate-pulse ml-1 align-middle" />
                  </div>
                  <span className="block text-[9px] text-slate-400 font-medium">
                    Streaming live...
                  </span>
                </div>
              </div>
            )}

            {/* Loader indicator */}
            {loading && !currentResponseStream && (
              <div id="chat-generating-loader" className="flex gap-3 max-w-[85%] text-left mr-auto">
                <div className="w-8 h-8 rounded-full bg-emerald-800 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Scale className="w-4 h-4 text-emerald-300 animate-spin" />
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 rounded-tl-none flex items-center gap-2 text-xs text-slate-400 font-semibold shadow-2xs">
                  <div className="w-1.5 h-1.5 bg-emerald-700 rounded-full animate-bounce delay-75" />
                  <div className="w-1.5 h-1.5 bg-emerald-700 rounded-full animate-bounce delay-150" />
                  <div className="w-1.5 h-1.5 bg-emerald-700 rounded-full animate-bounce delay-300" />
                  <span>Jua Sheria is reading the relevant Laws...</span>
                </div>
              </div>
            )}

            {errorMsg && (
              <div id="chat-error-banner" className="p-3.5 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-start gap-2 text-left">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Chat Connection Disrupted</p>
                  <p className="mt-0.5">{errorMsg}</p>
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Quick Suggestions Shelf (only displays when messages length is small) */}
          {messages.length <= 2 && !loading && (
            <div id="suggestions-shelf" className="px-4 py-3 bg-slate-50/50 border-t border-slate-150 text-left">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-2.5">
                <HelpCircle className="w-3.5 h-3.5 text-emerald-600" /> Click a common topic to ask
              </span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    id={`suggestion-btn-${idx}`}
                    onClick={() => handleSendMessage(s.query)}
                    className="p-2.5 bg-white border border-slate-200 hover:border-emerald-600 rounded-xl text-left hover:shadow-xs transition-all cursor-pointer space-y-0.5"
                  >
                    <span className="block text-xs font-bold text-emerald-950">{s.text}</span>
                    <span className="block text-[9px] text-slate-400 leading-tight">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input control box */}
          <div className="p-3 md:p-4 border-t border-slate-200 bg-white">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(input);
              }}
              className="flex items-center gap-2"
            >
              <button
                id="clear-chat-history-btn"
                type="button"
                onClick={clearChat}
                title="Reset conversation"
                className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {/* Voice input mic button */}
              <button
                id="voice-input-btn"
                type="button"
                onClick={toggleListening}
                title={isListening ? "Listening... Click to stop" : "Voice input (Dictation)"}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                  isListening
                    ? "bg-red-50 text-red-600 border-red-200 animate-pulse"
                    : "text-slate-400 hover:text-emerald-700 hover:bg-slate-50 border-slate-200"
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* File import button */}
              <label
                htmlFor="citizen-file-import"
                title={isFileParsing ? "Extracting text from PDF..." : "Import question/draft from a file (.txt, .md, .json, .pdf)"}
                className={`p-2.5 border rounded-xl transition-colors cursor-pointer flex items-center justify-center ${
                  isFileParsing
                    ? "bg-amber-50 border-amber-200 text-amber-600 animate-pulse"
                    : "text-slate-400 hover:text-emerald-700 hover:bg-slate-50 border-slate-200"
                }`}
              >
                <FileUp className="w-4 h-4" />
                <input
                  id="citizen-file-import"
                  type="file"
                  accept=".txt,.md,.json,.pdf"
                  disabled={isFileParsing || loading}
                  className="hidden"
                  onChange={handleFileImport}
                />
              </label>

              {/* Export chat button */}
              <button
                id="export-chat-history-btn"
                type="button"
                onClick={handleExportChat}
                title="Export entire chat transcript"
                disabled={messages.length <= 1 || isFileParsing}
                className="p-2.5 text-slate-400 hover:text-emerald-700 hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <Download className="w-4 h-4" />
              </button>

              <input
                id="chat-input-field"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  isFileParsing 
                    ? "Extracting text from PDF with Jua Sheria AI..." 
                    : isListening 
                      ? "Listening... Speak clearly now" 
                      : "Uliza maswali kuhusu sheria za Kenya... (e.g. minimum wage rules, pregnancy leave)"
                }
                disabled={loading || isFileParsing}
                className="flex-1 px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 focus:bg-white rounded-xl focus:ring-2 focus:ring-emerald-600/10 focus:border-emerald-600 outline-none transition-all disabled:opacity-50"
              />

              <button
                id="send-message-btn"
                type="submit"
                disabled={loading || isFileParsing || !input.trim()}
                className="p-2.5 bg-emerald-900 hover:bg-emerald-850 disabled:opacity-50 text-white rounded-xl shadow-md transition-all cursor-pointer flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-slate-400 font-medium">
              <span>Enter to send query • Swahili & Sheng friendly</span>
              <span>Secure Encrypted Session • Jua Sheria v1.2</span>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
