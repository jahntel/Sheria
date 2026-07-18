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
  History,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Building,
  Briefcase,
  Copy
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

  // Guided Wizard States
  const [wizardActive, setWizardActive] = useState(false);
  const [wizardType, setWizardType] = useState<"landlord-tenant" | "wage-recovery" | null>(null);
  const [wizardStep, setWizardStep] = useState(0);

  // Landlord Tenant Form Fields
  const [landlordName, setLandlordName] = useState("");
  const [premisesName, setPremisesName] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("15000");
  const [rentArrears, setRentArrears] = useState("0");
  const [tenantDisputeReason, setTenantDisputeReason] = useState("Unlawful Rent Increment");

  // Wage Recovery Form Fields
  const [employerName, setEmployerName] = useState("");
  const [jobDesignation, setJobDesignation] = useState("");
  const [monthlySalary, setMonthlySalary] = useState("25000");
  const [unpaidSalaryClaim, setUnpaidSalaryClaim] = useState("");
  const [unpaidPeriod, setUnpaidPeriod] = useState("");
  const [wageDisputeReason, setWageDisputeReason] = useState("Unpaid Salary");

  // Checklist states
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

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

    // Auto-detect if dispute types apply and set up wizard suggestion
    const lowerText = queryText.toLowerCase();
    const isLandlordTenant = lowerText.includes("landlord") || lowerText.includes("tenant") || lowerText.includes("rent") || lowerText.includes("evict") || lowerText.includes("lease") || lowerText.includes("tribunal") || lowerText.includes("house rent") || lowerText.includes("house agent") || lowerText.includes("bprt") || lowerText.includes("rrt");
    const isWageRecovery = lowerText.includes("wage") || lowerText.includes("salary") || lowerText.includes("unpaid") || lowerText.includes("arrears") || lowerText.includes("employer") || lowerText.includes("employee") || lowerText.includes("dismissal") || lowerText.includes("payslip") || lowerText.includes("labour") || lowerText.includes("fired");

    if (isLandlordTenant) {
      setWizardType("landlord-tenant");
    } else if (isWageRecovery) {
      setWizardType("wage-recovery");
    }

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
          
          {/* Main Panel View Toggle Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50/50 flex-shrink-0">
            <button
              onClick={() => setWizardActive(false)}
              className={`flex-1 py-3 text-center text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-2 cursor-pointer ${
                !wizardActive
                  ? "border-emerald-700 text-emerald-850 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Legal Chat Room</span>
            </button>
            <button
              onClick={() => {
                if (!wizardType) {
                  setWizardType("landlord-tenant");
                }
                setWizardActive(true);
              }}
              className={`flex-1 py-3 text-center text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-2 cursor-pointer relative ${
                wizardActive
                  ? "border-emerald-700 text-emerald-850 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              }`}
            >
              <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
              <span>Guided Dispute Wizard</span>
              {wizardType && (
                <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-black uppercase">
                  {wizardType === "landlord-tenant" ? "Rent" : "Wages"}
                </span>
              )}
            </button>
          </div>

          {/* Chat disclaimer notice at the very top (only in chat mode) */}
          {!wizardActive && (
            <div className="bg-amber-50 border-b border-amber-100 p-3 px-4 text-amber-900 text-xs flex items-start gap-2 text-left font-medium">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Mwananchi Notice:</strong> This portal translates legal text for general awareness. It does not replace physical legal advisors.
              </p>
            </div>
          )}

          {wizardActive ? (
            // Guided Wizard Component
            <div className="flex-1 flex flex-col justify-between overflow-hidden bg-slate-50/30 h-full">
              {/* Manual toggle + Stepper */}
              <div className="p-4 bg-white border-b border-slate-200 flex-shrink-0">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                      {wizardType === "landlord-tenant" ? "Landlord-Tenant Dispute Wizard" : "Wage Recovery Dispute Wizard"}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Fill details below to construct your legal case files for Kenyan administrative tribunals.
                    </p>
                  </div>
                  {/* Toggle button */}
                  <div className="flex gap-1.5 self-stretch sm:self-auto bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      onClick={() => {
                        setWizardType("landlord-tenant");
                        setWizardStep(0);
                      }}
                      className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                        wizardType === "landlord-tenant"
                          ? "bg-white text-emerald-900 shadow-3xs border border-emerald-100"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      Rent / Tenant
                    </button>
                    <button
                      onClick={() => {
                        setWizardType("wage-recovery");
                        setWizardStep(0);
                      }}
                      className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                        wizardType === "wage-recovery"
                          ? "bg-white text-emerald-900 shadow-3xs border border-emerald-100"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      Wage / Labour
                    </button>
                  </div>
                </div>

                {/* Steps Visual Indicator */}
                <div className="flex items-center justify-between max-w-xl mx-auto px-2">
                  {[0, 1, 2, 3, 4].map((step) => {
                    const stepLabels = ["Details", "Forms", "Fees & Place", "Script Guide", "Draft File"];
                    const isCompleted = wizardStep > step;
                    const isActive = wizardStep === step;
                    return (
                      <React.Fragment key={step}>
                        <button
                          onClick={() => setWizardStep(step)}
                          className="flex flex-col items-center gap-1 focus:outline-none cursor-pointer"
                        >
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                            isCompleted
                              ? "bg-emerald-600 text-white"
                              : isActive
                                ? "bg-emerald-900 text-white ring-4 ring-emerald-900/10"
                                : "bg-slate-100 text-slate-400 border border-slate-200"
                          }`}>
                            {isCompleted ? "✓" : step + 1}
                          </div>
                          <span className={`text-[9px] font-bold tracking-tight hidden sm:inline ${
                            isActive ? "text-emerald-900" : "text-slate-400"
                          }`}>
                            {stepLabels[step]}
                          </span>
                        </button>
                        {step < 4 && (
                          <div className={`flex-1 h-0.5 mx-2 ${
                            wizardStep > step ? "bg-emerald-600" : "bg-slate-200"
                          }`} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Wizard Step Body */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 text-left">
                {wizardStep === 0 && (
                  <div className="space-y-4 max-w-lg mx-auto">
                    <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl text-emerald-900 text-xs leading-relaxed font-medium">
                      👋 <strong>Hujambo!</strong> Tell us about your dispute. Your inputs will be used to automatically format a custom legal demand letter/notice and draft your tribunal scripts.
                    </div>

                    {wizardType === "landlord-tenant" ? (
                      <div className="space-y-3.5">
                        <div>
                          <label className="block text-xs font-bold text-slate-650 uppercase mb-1">Your Full Name</label>
                          <input
                            type="text"
                            value={user.fullName}
                            disabled
                            className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-250 rounded-xl text-slate-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-650 uppercase mb-1">Landlord or Property Agent Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Samuel Gathecha Properties"
                            value={landlordName}
                            onChange={(e) => setLandlordName(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-250 rounded-xl text-slate-850 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-650 uppercase mb-1">Premises Name / House Number</label>
                          <input
                            type="text"
                            placeholder="e.g. Riverside Heights, Apartment 3B, Ruiru"
                            value={premisesName}
                            onChange={(e) => setPremisesName(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-250 rounded-xl text-slate-850 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-650 uppercase mb-1">Monthly Rent (KES)</label>
                            <input
                              type="number"
                              value={monthlyRent}
                              onChange={(e) => setMonthlyRent(e.target.value)}
                              className="w-full px-3 py-2 text-xs bg-white border border-slate-250 rounded-xl text-slate-850 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-650 uppercase mb-1">Disputed Amount / Arrears</label>
                            <input
                              type="number"
                              placeholder="e.g. 15000"
                              value={rentArrears}
                              onChange={(e) => setRentArrears(e.target.value)}
                              className="w-full px-3 py-2 text-xs bg-white border border-slate-250 rounded-xl text-slate-850 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-650 uppercase mb-1">Primary Tenant Issue</label>
                          <select
                            value={tenantDisputeReason}
                            onChange={(e) => setTenantDisputeReason(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-250 rounded-xl text-slate-850 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                          >
                            <option value="Unlawful Rent Increment">Unlawful Rent Increment (No notice given)</option>
                            <option value="Threat of Forced Eviction">Threat of Forced Eviction (Unlawful locks/harassment)</option>
                            <option value="Failure to Conduct Critical Repairs">Failure to Conduct Critical Repairs (Uninhabitable house)</option>
                            <option value="Withholding Rental Deposit">Withholding Rental Deposit (Unfairly withheld)</option>
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-650 uppercase mb-1">Employee Name</label>
                            <input
                              type="text"
                              value={user.fullName}
                              disabled
                              className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-250 rounded-xl text-slate-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-650 uppercase mb-1">Your Job Title / Designation</label>
                            <input
                              type="text"
                              placeholder="e.g. Cook, Accountant, Guard"
                              value={jobDesignation}
                              onChange={(e) => setJobDesignation(e.target.value)}
                              className="w-full px-3 py-2 text-xs bg-white border border-slate-250 rounded-xl text-slate-850 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-650 uppercase mb-1">Employer / Company Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Apex Logistics Ltd"
                            value={employerName}
                            onChange={(e) => setEmployerName(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-250 rounded-xl text-slate-850 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-650 uppercase mb-1">Monthly Salary (KES)</label>
                            <input
                              type="number"
                              value={monthlySalary}
                              onChange={(e) => setMonthlySalary(e.target.value)}
                              className="w-full px-3 py-2 text-xs bg-white border border-slate-250 rounded-xl text-slate-850 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-650 uppercase mb-1">Unpaid Wage Claim (KES)</label>
                            <input
                              type="number"
                              placeholder="e.g. 50000"
                              value={unpaidSalaryClaim}
                              onChange={(e) => setUnpaidSalaryClaim(e.target.value)}
                              className="w-full px-3 py-2 text-xs bg-white border border-slate-250 rounded-xl text-slate-850 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-650 uppercase mb-1">Unpaid Period (Months/Dates)</label>
                            <input
                              type="text"
                              placeholder="e.g. Jan 2026 to March 2026"
                              value={unpaidPeriod}
                              onChange={(e) => setUnpaidPeriod(e.target.value)}
                              className="w-full px-3 py-2 text-xs bg-white border border-slate-250 rounded-xl text-slate-850 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-650 uppercase mb-1">Primary Labour Issue</label>
                            <select
                              value={wageDisputeReason}
                              onChange={(e) => setWageDisputeReason(e.target.value)}
                              className="w-full px-3 py-2 text-xs bg-white border border-slate-250 rounded-xl text-slate-850 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                            >
                              <option value="Unpaid Salary">Unpaid Salary / Salaries in arrears</option>
                              <option value="Underpayment">Underpayment (Below Kenyan statutory minimum wage)</option>
                              <option value="Unpaid Leave/Terminal Benefits">Unpaid Leave / Terminal severance pay</option>
                              <option value="Fired without Written Notice">Fired without Written Notice (Unfair dismissal)</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {wizardStep === 1 && (
                  <div className="space-y-4 max-w-lg mx-auto">
                    <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl text-emerald-900 text-xs leading-relaxed font-medium">
                      📋 <strong>Required Documents Checklist:</strong> Kenyan tribunals and labour offices require strict documentation before registering disputes. Check off what you have ready:
                    </div>

                    <div className="space-y-2">
                      {wizardType === "landlord-tenant" ? (
                        [
                          { key: "lt-form1", title: "Completed Form 1 (Referral of Dispute to Tribunal)", desc: "The official form describing the names, location, rent amount, and relief sought from the Rent restriction panel." },
                          { key: "lt-lease", title: "Lease/Tenancy Agreement (Mkataba wa Upangaji)", desc: "The written contract signed by you and the landlord. If oral, we will document it in your sworn affidavit." },
                          { key: "lt-receipts", title: "Proof of Rent Payments (Receipts / M-Pesa statements)", desc: "Essential to prove you are a lawful tenant in good standing and not in default of legitimate rent." },
                          { key: "lt-notice", title: "Eviction Notice or Correspondence Logs", desc: "Written SMS, letters, or Whatsapp conversations showing eviction threats or illegal notices." },
                          { key: "lt-affidavit", title: "Sworn Tenant Affidavit (Sworn before a Commissioner)", desc: "A detailed statement of facts that carries the weight of court testimony." }
                        ].map((item) => (
                          <div
                            key={item.key}
                            onClick={() => setChecklist(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                            className={`p-3 rounded-xl border flex gap-3 cursor-pointer select-none transition-all ${
                              checklist[item.key]
                                ? "bg-emerald-50/40 border-emerald-300 shadow-2xs"
                                : "bg-white border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={!!checklist[item.key]}
                              onChange={() => {}}
                              className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 mt-0.5 flex-shrink-0 cursor-pointer"
                            />
                            <div>
                              <h4 className="text-xs font-bold text-slate-800">{item.title}</h4>
                              <p className="text-[10px] text-slate-500 leading-normal mt-0.5">{item.desc}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        [
                          { key: "wr-contract", title: "Employment Contract or Appointment Letter", desc: "Your written appointment notice outlining your salary terms, designation, and work hours." },
                          { key: "wr-payslips", title: "Payslips or Historic Bank Account Statements", desc: "Provides concrete proof of your regular employment salary and tracks the exact period unpaid." },
                          { key: "wr-demand", title: "Copies of Served Demand Letter (Barua ya kudai haki)", desc: "Proof that you gave your employer written opportunity to clear the dues before escalations." },
                          { key: "wr-termination", title: "Termination/Dismissal Notice (If fired)", desc: "The official letter showing when and why you were discharged from service." },
                          { key: "wr-ld1", title: "Completed Labour Complaint Form (Form LD 1)", desc: "Official Ministry of Labour complaint docket submitted to initiate state mediation." }
                        ].map((item) => (
                          <div
                            key={item.key}
                            onClick={() => setChecklist(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                            className={`p-3 rounded-xl border flex gap-3 cursor-pointer select-none transition-all ${
                              checklist[item.key]
                                ? "bg-emerald-50/40 border-emerald-300 shadow-2xs"
                                : "bg-white border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={!!checklist[item.key]}
                              onChange={() => {}}
                              className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 mt-0.5 flex-shrink-0 cursor-pointer"
                            />
                            <div>
                              <h4 className="text-xs font-bold text-slate-800">{item.title}</h4>
                              <p className="text-[10px] text-slate-500 leading-normal mt-0.5">{item.desc}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {wizardStep === 2 && (
                  <div className="space-y-5 max-w-lg mx-auto">
                    {/* Filing Locations Card */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-3xs space-y-3">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                        <MapPin className="w-4.5 h-4.5 text-emerald-750" />
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Where to File Your Case in Kenya</h4>
                      </div>

                      {wizardType === "landlord-tenant" ? (
                        <div className="space-y-2.5 text-xs">
                          <p className="text-slate-650 leading-relaxed">
                            For Residential disputes where monthly rent is below <strong>KES 2,500/month</strong>, register your case at the <strong>Rent Restriction Tribunal (RRT)</strong>.
                          </p>
                          <p className="text-slate-650 leading-relaxed">
                            For Commercial Premises (Shops, hotels) or residential premises with higher rent limits, register at the <strong>Business Premises Rent Tribunal (BPRT)</strong>.
                          </p>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 space-y-1.5">
                            <span className="text-[9px] uppercase font-black text-slate-400 block tracking-widest">Main Registry Location (Nairobi)</span>
                            <span className="font-bold text-slate-800 block">Co-operative Bank House, 6th & 7th Floors</span>
                            <span className="text-slate-500 block leading-normal text-[11px]">Haile Selassie Avenue, Nairobi. Branch Registries are also accessible inside regional Huduma Centres (Nyeri, Nakuru, Kisumu, Eldoret, Mombasa).</span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2.5 text-xs">
                          <p className="text-slate-650 leading-relaxed">
                            Before heading to formal court, wage claims must be registered at your county's <strong>Ministry of Labour Office</strong> for subsidized mediation.
                          </p>
                          <p className="text-slate-650 leading-relaxed">
                            If mediation fails, the Labour Officer provides an official referral letter to the <strong>Employment and Labour Relations Court (ELRC)</strong> of Kenya.
                          </p>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 space-y-1.5">
                            <span className="text-[9px] uppercase font-black text-slate-400 block tracking-widest">Mediation Location</span>
                            <span className="font-bold text-slate-800 block">Nearest County Labour Office</span>
                            <span className="text-slate-500 block leading-normal text-[11px]">Located at regional Huduma Centres countrywide or Ministry of Labour county headquarters. Fully accessible to the public.</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Filing Fees Breakdown Card */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-3xs space-y-3">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                        <Scale className="w-4.5 h-4.5 text-emerald-750" />
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Official Filing Fee Breakdown</h4>
                      </div>

                      {wizardType === "landlord-tenant" ? (
                        <div className="space-y-2.5 text-xs">
                          <div className="space-y-1">
                            <div className="flex justify-between font-medium border-b border-slate-100 py-1">
                              <span className="text-slate-600">Case Intake & Summon Filing</span>
                              <span className="font-bold text-slate-800">KES 500</span>
                            </div>
                            <div className="flex justify-between font-medium border-b border-slate-100 py-1">
                              <span className="text-slate-600">Affidavit Attestation Fee</span>
                              <span className="font-bold text-slate-800">KES 200</span>
                            </div>
                            <div className="flex justify-between font-medium border-b border-slate-100 py-1">
                              <span className="text-slate-600">Summons Service (Process Server or Personal)</span>
                              <span className="font-bold text-slate-800">KES 500</span>
                            </div>
                            <div className="flex justify-between font-bold border-t border-dashed border-slate-300 pt-1.5 text-emerald-800 text-sm">
                              <span>Estimated Total Fees</span>
                              <span>KES 1,200</span>
                            </div>
                          </div>
                          <p className="text-[10px] text-amber-750 font-semibold leading-relaxed bg-amber-50 p-2.5 rounded-lg border border-amber-100">
                            ⚠️ <strong>Payment Notice:</strong> Never pay cash directly at registries. Ensure all tribunal payments are made through official government e-Citizen gateways (Paybill 222222) with generated invoice receipts.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2.5 text-xs">
                          <div className="space-y-1">
                            <div className="flex justify-between font-medium border-b border-slate-100 py-1">
                              <span className="text-slate-600">Labour Office Complaint Registration</span>
                              <span className="font-bold text-emerald-700 uppercase text-[10px] tracking-wider">FREE OF CHARGE</span>
                            </div>
                            <div className="flex justify-between font-medium border-b border-slate-100 py-1">
                              <span className="text-slate-600">Mediation Services & Employer Summons</span>
                              <span className="font-bold text-emerald-700 uppercase text-[10px] tracking-wider">FREE OF CHARGE</span>
                            </div>
                            <div className="flex justify-between font-medium border-b border-slate-100 py-1">
                              <span className="text-slate-600">Employment Court Filing Fee (ELRC)</span>
                              <span className="font-bold text-slate-800">KES 500 (Waived for low-income)</span>
                            </div>
                            <div className="flex justify-between font-bold border-t border-dashed border-slate-300 pt-1.5 text-emerald-800 text-sm">
                              <span>Estimated Total Fees</span>
                              <span>KES 0 - KES 500</span>
                            </div>
                          </div>
                          <p className="text-[10px] text-emerald-850 font-semibold leading-relaxed bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-150">
                            💡 <strong>Justice Proviso:</strong> The Kenyan Constitution Article 48 explicitly enforces affordable access to justice. County Labour Officers act as public mediators, making wage claims 100% free of charge.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {wizardStep === 3 && (
                  <div className="space-y-4 max-w-lg mx-auto text-xs">
                    <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl text-emerald-900 leading-relaxed font-medium">
                      🗣️ <strong>Interactive Tribunal presentation Script:</strong> When addressing a public official, landlord tribunal chairman, or mediator, speaking clearly and referencing specific facts is essential. Review the script below:
                    </div>

                    <div className="space-y-3.5">
                      <div className="border border-slate-200 bg-white rounded-xl p-3 shadow-3xs">
                        <span className="text-[9px] uppercase font-black text-slate-400 block tracking-widest mb-1">Scene 1: General Etiquette & Introduction</span>
                        <p className="text-slate-750 leading-relaxed">
                          Bow respectfully to the presiding chair/officer before taking your stand. Address the official as <strong>"Mheshimiwa Hakimu"</strong> or <strong>"Honorable Chairperson"</strong>. Speak in clear, audible English or Swahili.
                        </p>
                      </div>

                      <div className="border-2 border-emerald-600/35 bg-emerald-50/20 rounded-xl p-4 shadow-2xs space-y-2.5 relative">
                        <span className="text-[9px] uppercase font-black text-emerald-800 block tracking-widest">Scene 2: Verbal Speech Draft (Your Statement of Facts)</span>
                        
                        {wizardType === "landlord-tenant" ? (
                          <div className="font-mono text-xs text-slate-850 leading-relaxed whitespace-pre-wrap bg-white/70 p-3 rounded-lg border border-emerald-100">
{`"Mheshimiwa, my name is ${user.fullName}, the tenant at ${premisesName || "[Specify Premises]"}. 

I occupy these premises on a monthly tenancy of KES ${monthlyRent || "[Monthly Rent]"}. 

I am presenting this matter before the Tribunal because of ${tenantDisputeReason || "[Tenant Dispute]"}. Specifically, the landlord ${landlordName || "[Landlord Name]"} has proceeded to raise rent / threaten eviction without the statutory notice of 90 days required under the Landlord and Tenant Act. 

I request the Tribunal to restrain the landlord from illegal eviction and protect my tenancy rights."`}
                          </div>
                        ) : (
                          <div className="font-mono text-xs text-slate-850 leading-relaxed whitespace-pre-wrap bg-white/70 p-3 rounded-lg border border-emerald-100">
{`"Mheshimiwa, my name is ${user.fullName}. I have been employed as a ${jobDesignation || "[Designation]"} at ${employerName || "[Employer/Company Name]"} since my appointment. 

My monthly compensation is KES ${monthlySalary || "[Monthly Salary]"}. 

I have brought this claim under Section 18 of the Kenyan Employment Act, 2007 because the company has failed to pay my wages for the period of ${unpaidPeriod || "[Specify Period]"}, totaling KES ${unpaidSalaryClaim || "[Claim Amount]"}. 

I request this office to mediate and direct the employer to pay my wages immediately."`}
                          </div>
                        )}
                      </div>

                      <div className="border border-slate-200 bg-white rounded-xl p-3 shadow-3xs">
                        <span className="text-[9px] uppercase font-black text-slate-400 block tracking-widest mb-1">Scene 3: Presenting Your Evidence Bundle</span>
                        <p className="text-slate-750 leading-relaxed">
                          Hand over your documents nicely organized. Say: 
                          <span className="block italic mt-1 font-semibold text-emerald-900">"Mheshimiwa, I have organized my lease contract, payslips, and verified M-Pesa receipts inside this bundle as exhibits for your review."</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {wizardStep === 4 && (
                  <div className="space-y-4 max-w-xl mx-auto text-xs">
                    <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl text-emerald-900 leading-relaxed font-medium">
                      📄 <strong>Generated Statutory Legal Notice:</strong> Based on the parameters provided, we have compiled a professional, legally structured letter. You can copy this text or download it directly to print.
                    </div>

                    {/* The generated notice body */}
                    <div className="border border-slate-250 bg-white rounded-xl shadow-xs overflow-hidden flex flex-col justify-between">
                      <div className="flex items-center justify-between bg-slate-50 border-b border-slate-200 p-2 px-3 flex-shrink-0">
                        <span className="font-black text-[10px] text-slate-500 uppercase tracking-wider">
                          {wizardType === "landlord-tenant" ? "Landlord Tenant Dispute Draft" : "Labour Demand Letter Draft"}
                        </span>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => {
                              const docText = document.getElementById("generated-legal-notice-body")?.innerText || "";
                              navigator.clipboard.writeText(docText);
                              alert("Copied to clipboard!");
                            }}
                            className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] rounded-lg border border-slate-300 transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Copy Draft</span>
                          </button>
                          <button
                            onClick={() => {
                              const docText = document.getElementById("generated-legal-notice-body")?.innerText || "";
                              const blob = new Blob([docText], { type: "text/plain;charset=utf-8" });
                              const url = URL.createObjectURL(blob);
                              const link = document.createElement("a");
                              link.href = url;
                              link.download = wizardType === "landlord-tenant" ? "Tenancy_Dispute_Notice.txt" : "Salary_Demand_Letter.txt";
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              URL.revokeObjectURL(url);
                            }}
                            className="p-1 px-2.5 bg-emerald-800 hover:bg-emerald-850 text-white font-bold text-[10px] rounded-lg border border-emerald-900 transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" />
                            <span>Download .TXT</span>
                          </button>
                        </div>
                      </div>

                      <div
                        id="generated-legal-notice-body"
                        className="p-4 font-mono text-[10px] text-slate-800 leading-relaxed whitespace-pre-wrap select-text text-left max-h-[45vh] overflow-y-auto"
                      >
                        {wizardType === "landlord-tenant" ? (
`FORMAL COMPLAINT & ESCALATION NOTICE

TO: ${landlordName || "The Landlord / Property Agent"}
DATE: ${new Date().toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}

REF: FORMAL COMPLAINT REGARDING TENANCY AT PREMISES: ${premisesName || "[PREMISES LOCATION]"}

I, ${user.fullName}, being the lawful tenant of the premises known as ${premisesName || "[Premises]"}, occupying the same on a monthly contractual rent of KES ${monthlyRent || "[Monthly Rent]"}, hereby write to formally register my dispute regarding:

${tenantDisputeReason || "Unlawful Rent Increment"}

PARTICULARS OF DISPUTE:
1. Under the Kenyan Landlord and Tenant Act, any alterations to rent, tenancy, or eviction MUST strictly comply with prescribed statutory periods (90 days written notice on prescribed forms).
2. The current threat/act of KES ${rentArrears || "[Disputed Arrears]"} or eviction notice violates this statutory protection.
3. Attempts to lock out the tenant, cut water, or use unauthorized agents constitutes a summary offence under the Rent Restriction Act.

TAKE NOTICE that if this matter is not settled within 7 days of this letter, I shall formally file a Referral of Dispute (Form 1) with the Rent Restriction Tribunal at Cooperative Bank House, Nairobi for statutory injunctive relief.

Yours faithfully,

_______________________
${user.fullName}
(Tenant in Occupancy)
Email: ${user.email}`
                        ) : (
`FORMAL STATUTORY DEMAND FOR UNPAID WAGES

TO: ${employerName || "The Employer / Managing Director"}
DATE: ${new Date().toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}

REF: STATUTORY DEMAND FOR OUTSTANDING WAGES & SALARY ARREARS FOR THE POSITION OF: ${jobDesignation || "[JOB TITLE]"}

I, ${user.fullName}, being a lawful employee under contractual engagement at ${employerName || "[Employer Company Name]"} in the capacity of ${jobDesignation || "[Job Designation]"}, earning KES ${monthlySalary || "[Salary Amount]"}/month, hereby demand payment of:

UNPAID SALARY ARREARS TOTALING KES ${unpaidSalaryClaim || "[Claim Amount]"} FOR THE UNPAID PERIOD: ${unpaidPeriod || "[Period]"}.

PARTICULARS OF LEGAL DEMAND:
1. Section 18 of the Employment Act, 2007 of Kenya mandates that salaries/wages shall be paid in full to employees when due at the end of each wage period.
2. Failure/withholding of contractual salary constitutes a material breach of the employment contract and is an offence under Section 86 of the Employment Act.
3. This demand constitutes a formal request giving you 7 (seven) days from the date hereof to clear all outstanding wage claims.

TAKE NOTICE that should you fail, refuse, or neglect to comply with this demand within the stipulated period, I shall immediately escalate this complaint to the nearest Ministry of Labour County Office for formal mediation, and subsequently file a suit at the Employment and Labour Relations Court (ELRC) for recovery of wages, interest, and costs.

Yours faithfully,

_______________________
${user.fullName}
(Employee)
Email: ${user.email}`
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Wizard Step Footer Navigation */}
              <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between flex-shrink-0">
                <button
                  onClick={() => {
                    if (wizardStep > 0) {
                      setWizardStep(wizardStep - 1);
                    } else {
                      setWizardActive(false);
                    }
                  }}
                  className="px-4 py-2 border border-slate-250 text-slate-650 rounded-xl hover:bg-slate-50 transition-all font-bold text-xs cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{wizardStep === 0 ? "Back to Chat" : "Previous"}</span>
                </button>

                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider hidden sm:block">
                  Step {wizardStep + 1} of 5
                </div>

                <button
                  onClick={() => {
                    if (wizardStep < 4) {
                      setWizardStep(wizardStep + 1);
                    } else {
                      setWizardActive(false);
                    }
                  }}
                  className="px-4 py-2 bg-emerald-900 hover:bg-emerald-850 text-white rounded-xl shadow-md transition-all font-bold text-xs cursor-pointer flex items-center gap-1.5"
                >
                  <span>{wizardStep === 4 ? "Finish & Return" : "Next"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            // Normal Chat Flow
            <>
              {/* Auto-detected Wizard Banner invitation */}
              {wizardType && (
                <div className="mx-4 my-2.5 bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl flex items-center justify-between gap-3 text-left animate-pulse">
                  <div className="flex items-start gap-2.5">
                    <Sparkles className="w-4.5 h-4.5 text-emerald-700 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-emerald-950">Jua Sheria guided Dispute Wizard is Ready!</h4>
                      <p className="text-[10px] text-emerald-800 mt-0.5">
                        We detected a <strong>{wizardType === "landlord-tenant" ? "Landlord-Tenant dispute" : "Wage Recovery issue"}</strong>. Launch the guided wizard to get step-by-step form rules, filing fees, and courtroom script guidance.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setWizardActive(true);
                      setWizardStep(0);
                    }}
                    className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-850 text-white font-bold text-[10px] rounded-lg transition-all cursor-pointer whitespace-nowrap"
                  >
                    Launch Wizard →
                  </button>
                </div>
              )}

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
            </>
          )}

        </main>
      </div>
    </div>
  );
}
