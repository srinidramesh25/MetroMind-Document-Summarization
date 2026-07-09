"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, UploadCloud, FolderOpen, Search, MessageSquare,
  Network, BarChart3, ShieldCheck, Users, Settings, Bell,
  Sun, Moon, LogOut, FileText, Download, Trash2, Cpu, Mic,
  MicOff, Volume2, VolumeX, Send, Plus, ExternalLink, Calendar,
  User, CheckCircle2, AlertTriangle, Info, RefreshCw, X, FileSpreadsheet, FileCode
} from "lucide-react";
import {
  clearToken, getCurrentUser, getToken,
  authApi, documentApi, searchApi, chatApi, analyticsApi, complianceApi, userApi
} from "../../lib/api";

// Recharts components (loaded dynamically in useEffect to prevent SSR crash)
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, BarChart, Bar, PieChart, Pie, Cell, Legend
} from "recharts";

export default function Dashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [theme, setTheme] = useState("dark");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Core Data States
  const [documents, setDocuments] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversation, setActiveConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [riskAlerts, setRiskAlerts] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  // Metrics and Charts
  const [metrics, setMetrics] = useState<any>({
    total_documents: 0, active_users: 1, ai_queries: 0,
    search_success_rate: 94.6, compliance_alerts: 0, pending_reviews: 0
  });
  const [chartData, setChartData] = useState<any>({
    upload_trends: [], department_activity: [],
    category_distribution: [], ai_usage: [], search_analytics: []
  });

  // Action/Form States
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDept, setUploadDept] = useState("1");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadLogs, setUploadLogs] = useState<string[]>([]);
  
  // Search parameters
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilterDept, setSearchFilterDept] = useState("");
  const [searchFilterCat, setSearchFilterCat] = useState("");
  const [searchFilterStatus, setSearchFilterStatus] = useState("");
  const [searchFilterDateFrom, setSearchFilterDateFrom] = useState("");
  const [searchFilterDateTo, setSearchFilterDateTo] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Chat parameters
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [voiceSearchActive, setVoiceSearchActive] = useState(false);
  const [audioVoiceResponse, setAudioVoiceResponse] = useState(true);

  // Document Details Panel / Modal
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [selectedDocDetails, setSelectedDocDetails] = useState<any>(null);
  const [docDetailsTab, setDocDetailsTab] = useState("executive"); // executive, detailed, bullets, compliance, actions

  // Knowledge Graph visual states
  const [graphNodes, setGraphNodes] = useState<any[]>([]);
  const [graphEdges, setGraphEdges] = useState<any[]>([]);
  const [selectedGraphNode, setSelectedGraphNode] = useState<any>(null);

  // Load Initial Configurations
  useEffect(() => {
    setMounted(true);
    // Theme setup
    const savedTheme = localStorage.getItem("theme") || "dark";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);

    // Auth verification
    const token = getToken();
    const user = getCurrentUser();
    if (!token || !user) {
      router.push("/login");
      return;
    }
    setCurrentUser(user);
    setUploadDept(String(user.department_id || 1));

    // Fetch initial datasets
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Parallel fetches
      const depts = await userApi.getDepartments();
      setDepartments(depts);

      const docs = await documentApi.list();
      setDocuments(docs);

      const convs = await chatApi.listConversations();
      setConversations(convs);
      if (convs.length > 0) {
        // Load latest chat (safely — backend may not have older mock IDs)
        handleSelectConversation(convs[0].id);
      } else {
        // Auto-create a default conversation so chat is ready immediately
        try {
          const defaultConv = await chatApi.createConversation("General Queries");
          setConversations([defaultConv]);
          handleSelectConversation(defaultConv.id);
        } catch (_) {
          // Silently skip — user can create manually
        }
      }

      const notifs = await userApi.getNotifications();
      setNotifications(notifs);

      const risks = await complianceApi.getRiskAlerts();
      setRiskAlerts(risks);

      // Admin loads
      const user = getCurrentUser();
      if (user && user.role === "Super Admin") {
        const audits = await complianceApi.getAuditLogs();
        setAuditLogs(audits);
        
        const accounts = await userApi.listUsers();
        setUsersList(accounts);
      }

      // Metrics and Charts
      const met = await analyticsApi.getMetrics();
      setMetrics(met);

      const charts = await analyticsApi.getCharts();
      setChartData(charts);

      // Construct Knowledge Graph nodes
      buildGraphData(docs, depts);

    } catch (err) {
      console.error("Error loading dashboard metrics:", err);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  const handleLogout = () => {
    clearToken();
    router.push("/login");
  };

  const buildGraphData = (docs: any[], depts: any[]) => {
    const nodes: any[] = [];
    const edges: any[] = [];

    // Add Center Node
    nodes.push({ id: "kmrl", label: "KMRL Brain", type: "system", x: 300, y: 200, size: 25 });

    // Add Department Nodes around center
    depts.forEach((d, idx) => {
      const angle = (idx / depts.length) * 2 * Math.PI;
      const x = 300 + 120 * Math.cos(angle);
      const y = 200 + 120 * Math.sin(angle);
      nodes.push({ id: `dept_${d.id}`, label: d.code, name: d.name, type: "department", x, y, size: 16 });
      edges.push({ source: "kmrl", target: `dept_${d.id}`, label: "ORGANIZATIONAL_UNIT" });
    });

    // Add Document Nodes branching from departments
    docs.forEach((doc, idx) => {
      const deptNode = nodes.find(n => n.id === `dept_${doc.department_id}`);
      if (deptNode) {
        // Offset coordinates slightly from department parent
        const angle = Math.random() * 2 * Math.PI;
        const x = deptNode.x + 50 * Math.cos(angle);
        const y = deptNode.y + 50 * Math.sin(angle);
        const docIdStr = `doc_${doc.id}`;
        nodes.push({ id: docIdStr, label: doc.title.substring(0, 15) + "...", name: doc.title, type: "document", file_type: doc.file_type, x, y, size: 12 });
        edges.push({ source: `dept_${doc.department_id}`, target: docIdStr, label: "CONTAINS" });
      }
    });

    setGraphNodes(nodes);
    setGraphEdges(edges);
  };

  // --- UPLOAD CONTROLLER ---
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadTitle) return;

    setUploadLoading(true);
    setUploadLogs(["[1/5] Validating document structure...", `[2/5] File format verified: ${uploadFile.name.split(".").pop()}`]);

    setTimeout(() => {
      setUploadLogs(prev => [...prev, "[3/5] Starting optical character recognition (OCR)...", "[4/5] Running English/Malayalam extraction dictionaries..."]);
    }, 1200);

    try {
      const newDoc = await documentApi.upload(uploadTitle, parseInt(uploadDept), uploadFile);
      
      setTimeout(async () => {
        setUploadLogs(prev => [...prev, "[5/5] Generating vector embeddings & keyword indexing...", "✔ Processing completed successfully!"]);
        setUploadTitle("");
        setUploadFile(null);
        setUploadLoading(false);
        // Refresh documents list
        const updatedDocs = await documentApi.list();
        setDocuments(updatedDocs);
        // Refresh analytics
        const met = await analyticsApi.getMetrics();
        setMetrics(met);
        const charts = await analyticsApi.getCharts();
        setChartData(charts);
        // Recalculate graph
        buildGraphData(updatedDocs, departments);
        
        // Push success alert notification locally
        const updatedNotifs = await userApi.getNotifications();
        setNotifications(updatedNotifs);
      }, 2500);

    } catch (err: any) {
      setUploadLogs(prev => [...prev, `✖ Error processing: ${err.message}`]);
      setUploadLoading(false);
    }
  };

  // --- REPOSITORY CONTROLLER ---
  const handleDocClick = async (doc: any) => {
    setSelectedDoc(doc);
    setSelectedDocDetails(null);
    try {
      const details = await documentApi.getDetails(doc.id);
      setSelectedDocDetails(details);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDocDelete = async (id: number) => {
    if (confirm("Are you sure you want to permanently delete this document, its OCR text, and summaries?")) {
      try {
        await documentApi.delete(id);
        const updatedDocs = await documentApi.list();
        setDocuments(updatedDocs);
        // Re-graph
        buildGraphData(updatedDocs, departments);
        // Refresh metrics
        const met = await analyticsApi.getMetrics();
        setMetrics(met);
        
        if (selectedDoc && selectedDoc.id === id) {
          setSelectedDoc(null);
        }
      } catch (err) {
        alert("Delete failed. Check access permissions.");
      }
    }
  };

  // --- SEARCH CONTROLLER ---
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchLoading(true);
    try {
      const res = await searchApi.query(searchQuery, {
        department_id: searchFilterDept ? parseInt(searchFilterDept) : undefined,
        category_id: searchFilterCat ? parseInt(searchFilterCat) : undefined,
        status: searchFilterStatus || undefined,
        date_from: searchFilterDateFrom || undefined,
        date_to: searchFilterDateTo || undefined
      });
      setSearchResults(res.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearchLoading(false);
    }
  };

  // --- CHAT CONTROLLER ---
  const handleSelectConversation = async (id: number) => {
    try {
      const conv = await chatApi.getConversation(id);
      setActiveConversation(conv);
      setMessages(conv.messages || []);
    } catch (err: any) {
      // If the conversation doesn't exist in the live backend (stale mock ID),
      // reset state so user can create a fresh conversation
      const is404 = err?.message?.toLowerCase().includes("not found") || err?.message?.includes("404");
      if (is404) {
        setActiveConversation(null);
        setMessages([]);
        // Remove the stale conversation from the sidebar list
        setConversations(prev => prev.filter(c => c.id !== id));
      } else {
        console.error("Failed to load conversation:", err);
      }
    }
  };

  const handleCreateConversation = async () => {
    const title = prompt("Enter conversation topic:");
    if (!title) return;
    try {
      const newConv = await chatApi.createConversation(title);
      setConversations([newConv, ...conversations]);
      handleSelectConversation(newConv.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeConversation) return;

    const userText = chatInput;
    setChatInput("");
    setChatLoading(true);

    // Optimistically push user message
    const tempUserMsg = { id: Date.now(), sender: "user", text: userText, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const reply = await chatApi.sendMessage(activeConversation.id, userText);
      setMessages(prev => [...prev, reply]);

      // Handle speech synthesis if enabled
      if (audioVoiceResponse) {
        // Create browser speech synthesis directly
        const synth = window.speechSynthesis;
        if (synth) {
          // Speak first 150 characters to prevent long monologues
          const cleanText = reply.text.replace(/[*#`_-]/g, "");
          const utterance = new SpeechSynthesisUtterance(cleanText.substring(0, 160));
          utterance.rate = 1.0;
          synth.speak(utterance);
        }
      }
      
      // Update sidebar metrics query count
      const met = await analyticsApi.getMetrics();
      setMetrics(met);

    } catch (err: any) {
      const is404 = err?.message?.toLowerCase().includes("not found") || err?.message?.includes("404");
      if (is404) {
        // Conversation was deleted or doesn't exist on server — clear stale state
        const staleId = activeConversation?.id;
        setActiveConversation(null);
        setMessages([]);
        if (staleId) setConversations(prev => prev.filter(c => c.id !== staleId));
        // Push a friendly error message into the chat UI
        setMessages([
          { id: Date.now(), sender: "assistant", text: "⚠️ This conversation no longer exists on the server. Please create a new conversation using the **+** button above.", timestamp: new Date().toISOString() }
        ]);
      } else {
        console.error("Failed to send message:", err);
      }
    } finally {
      setChatLoading(false);
    }
  };

  const handleVoiceInput = () => {
    // Check Speech Recognition support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please type your query.");
      return;
    }

    setVoiceSearchActive(true);
    const rec = new SpeechRecognition();
    rec.lang = "en-IN";
    rec.start();

    rec.onresult = (event: any) => {
      const spokenText = event.results[0][0].transcript;
      if (activeTab === "chat") {
        setChatInput(spokenText);
      } else {
        setSearchQuery(spokenText);
        setActiveTab("search");
      }
      setVoiceSearchActive(false);
    };

    rec.onerror = () => {
      setVoiceSearchActive(false);
    };

    rec.onend = () => {
      setVoiceSearchActive(false);
    };
  };

  // --- NOTIFICATION HANDLERS ---
  const handleReadAllNotifications = async () => {
    try {
      await userApi.readAllNotifications();
      const updated = await userApi.getNotifications();
      setNotifications(updated);
      // Refresh metric alerts count
      const met = await analyticsApi.getMetrics();
      setMetrics(met);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
      
      {/* 1. SIDEBAR Navigation */}
      <aside className={`flex flex-col bg-slate-900 text-white transition-all duration-300 ${isSidebarCollapsed ? "w-16" : "w-64"} border-r border-slate-800 z-30`}>
        {/* Brand */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          {!isSidebarCollapsed ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center">
                <Cpu className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="font-extrabold text-sm tracking-tight leading-none">
                  METROMIND <span className="text-cyan-400 font-medium">AI</span>
                </h1>
                <span className="text-[8px] text-slate-400 tracking-wider uppercase block">Kochi Metro</span>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400 mx-auto">
              <Cpu className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* User Summary Profile */}
        {!isSidebarCollapsed && currentUser && (
          <div className="p-4 mx-3 my-4 rounded-xl bg-slate-800/50 border border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-cyan-400 font-bold border border-slate-600">
              {currentUser.name[0]}
            </div>
            <div className="overflow-hidden">
              <h3 className="font-semibold text-xs truncate">{currentUser.name}</h3>
              <p className="text-[10px] text-cyan-400 mt-0.5 font-bold uppercase">{currentUser.role}</p>
              <p className="text-[8px] text-slate-400 truncate">{currentUser.email}</p>
            </div>
          </div>
        )}

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
          {[
            { id: "overview", label: "Dashboard", icon: LayoutDashboard },
            { id: "upload", label: "Upload Center", icon: UploadCloud },
            { id: "repository", label: "Document Repository", icon: FolderOpen },
            { id: "search", label: "Semantic Search", icon: Search },
            { id: "chat", label: "AI Chat Assistant", icon: MessageSquare },
            { id: "graph", label: "Knowledge Graph", icon: Network },
            { id: "analytics", label: "Analytics Dashboard", icon: BarChart3 },
            { id: "compliance", label: "Compliance Center", icon: ShieldCheck },
            { id: "users", label: "User Directory", icon: Users, roleRestrict: "Super Admin" },
            { id: "settings", label: "Settings", icon: Settings }
          ].map((item) => {
            if (item.roleRestrict && currentUser?.role !== item.roleRestrict) return null;
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (item.id === "search") setSearchResults([]);
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive 
                    ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold" 
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!isSidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Collapse toggle and Logout */}
        <div className="p-3 border-t border-slate-800 flex flex-col gap-1">
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="flex items-center gap-3 px-3 py-2 text-slate-500 hover:text-white text-xs"
          >
            <RefreshCw className="w-4 h-4" />
            {!isSidebarCollapsed && <span>Collapse Sidebar</span>}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-950/20 text-xs font-semibold transition-colors"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!isSidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* 2. HEADER */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 bg-white dark:bg-slate-900 z-20">
          <div>
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest block">KMRL System</h2>
            <h1 className="text-base font-extrabold capitalize leading-none gradient-text dark:gradient-text-light">{activeTab.replace("-", " ")}</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Health status */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Operational Core
            </div>

            {/* Voice Input shortcut */}
            <button
              onClick={handleVoiceInput}
              className={`p-2 rounded-xl border transition-all ${
                voiceSearchActive 
                  ? "bg-rose-500/20 border-rose-500 text-rose-500 animate-ping" 
                  : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
              }`}
              title="Voice commands"
            >
              {voiceSearchActive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors relative"
              >
                <Bell className="w-4 h-4" />
                {notifications.some(n => !n.read_status) && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-cyan-500 border-2 border-white dark:border-slate-900 animate-ping" />
                )}
              </button>

              {/* Notification Drawer Popover */}
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xl z-50 text-xs">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
                    <span className="font-bold text-sm">Notifications Drawer</span>
                    <button onClick={handleReadAllNotifications} className="text-[10px] text-cyan-500 font-bold hover:underline">Mark all read</button>
                  </div>
                  <div className="mt-3 flex flex-col gap-2.5 max-h-60 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map(n => (
                        <div key={n.id} className={`p-2 rounded-lg border ${n.read_status ? "bg-transparent border-slate-200 dark:border-slate-800" : "bg-cyan-500/5 border-cyan-500/20"}`}>
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-[10px]">{n.title}</span>
                            <span className="text-[8px] text-slate-400">{n.created_at.substring(11, 16)}</span>
                          </div>
                          <p className="text-slate-400 mt-0.5 text-[10px] leading-tight">{n.message}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 text-center py-4">No notifications present.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* 3. CORE PANEL MANAGER */}
        <main className="flex-1 overflow-y-auto p-6">
          
          {/* TAB: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="flex flex-col gap-6">
              {/* Metric Row */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                {[
                  { label: "Total Documents", val: metrics.total_documents, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
                  { label: "Active Admins", val: metrics.active_users, color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20" },
                  { label: "AI Conversations", val: metrics.ai_queries, color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
                  { label: "Search Success", val: `${metrics.search_success_rate}%`, color: "text-teal-500 bg-teal-500/10 border-teal-500/20" },
                  { label: "Compliance Audits", val: metrics.compliance_alerts, color: "text-rose-500 bg-rose-500/10 border-rose-500/20" },
                  { label: "Pending Reviews", val: metrics.pending_reviews, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" }
                ].map((m, idx) => (
                  <div key={idx} className="glass-card p-4 flex flex-col justify-between h-24">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">{m.label}</span>
                    <div className="flex justify-between items-baseline mt-2">
                      <span className="text-2xl font-black">{m.val}</span>
                      <span className={`w-2.5 h-2.5 rounded-full ${m.color.split(" ")[2]}`} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Grid content */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Column 1 & 2: Quick Operations */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                  {/* Quick actions box */}
                  <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <h3 className="font-bold text-sm mb-4">Quick Portal Access</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        { title: "Ingest Document", tab: "upload", desc: "Run OCR extraction", icon: UploadCloud, color: "from-blue-600 to-cyan-500 text-white" },
                        { title: "Ask Copilot Chat", tab: "chat", desc: "RAG dialog engine", icon: MessageSquare, color: "from-cyan-600 to-teal-500 text-white" },
                        { title: "Semantic Search", tab: "search", desc: "Search with filter scores", icon: Search, color: "from-teal-600 to-emerald-500 text-white" },
                        { title: "Compliance Center", tab: "compliance", desc: "Run audit trace records", icon: ShieldCheck, color: "from-purple-600 to-indigo-500 text-white" }
                      ].map((act, idx) => {
                        const Icon = act.icon;
                        return (
                          <button
                            key={idx}
                            onClick={() => setActiveTab(act.tab)}
                            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-cyan-500 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/50 text-left transition-all group flex flex-col justify-between h-32"
                          >
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${act.color} flex items-center justify-center`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="mt-3">
                              <h4 className="font-bold text-xs group-hover:text-cyan-500 transition-colors">{act.title}</h4>
                              <p className="text-[9px] text-slate-400 mt-1">{act.desc}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Activity area: Uploads trend Chart */}
                  <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 h-80">
                    <h3 className="font-bold text-sm mb-4">Document Upload Activity Trend</h3>
                    {mounted && chartData.upload_trends.length > 0 ? (
                      <div className="w-full h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData.upload_trends}>
                            <defs>
                              <linearGradient id="colorUploads" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.1}/>
                            <XAxis dataKey="date" stroke="#64748b" fontSize={10}/>
                            <YAxis stroke="#64748b" fontSize={10}/>
                            <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", color: "#fff", fontSize: 10 }}/>
                            <Area type="monotone" dataKey="count" name="Uploads" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorUploads)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-48 text-slate-400 text-xs">Awaiting data...</div>
                    )}
                  </div>
                </div>

                {/* Column 3: Live Alerts & Document Summary */}
                <div className="flex flex-col gap-6">
                  {/* Category Pie */}
                  <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 h-80 flex flex-col justify-between">
                    <h3 className="font-bold text-sm">Category distribution</h3>
                    {mounted && chartData.category_distribution.length > 0 ? (
                      <div className="w-full h-44">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={chartData.category_distribution}
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={65}
                              paddingAngle={4}
                              dataKey="value"
                              nameKey="category"
                            >
                              {chartData.category_distribution.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={["#06b6d4", "#3b82f6", "#10b981", "#ef4444", "#f59e0b", "#6366f1"][index % 6]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", color: "#fff", fontSize: 9 }}/>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="text-center text-slate-400 py-10 text-xs">No documents processed</div>
                    )}
                    <div className="flex flex-wrap gap-2 text-[8px] justify-center">
                      {chartData.category_distribution.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ["#06b6d4", "#3b82f6", "#10b981", "#ef4444", "#f59e0b", "#6366f1"][index % 6] }} />
                          <span className="font-bold uppercase text-slate-400">{entry.category}: {entry.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Active Compliance Warnings */}
                  <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex-1 flex flex-col">
                    <h3 className="font-bold text-sm mb-3">Live Risk Safety Alerts</h3>
                    <div className="flex flex-col gap-2.5 flex-1 overflow-y-auto">
                      {riskAlerts.map((alert, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-slate-400 text-xs flex gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                          <div>
                            <h4 className="font-bold text-[10px] text-slate-200">{alert.title}</h4>
                            <p className="text-[9px] mt-0.5 leading-tight">{alert.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB: UPLOAD CENTER */}
          {activeTab === "upload" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Form card */}
              <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-base mb-4">Ingest New Operational Document</h3>
                
                <form onSubmit={handleUploadSubmit} className="flex flex-col gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-400">Document Display Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Aluva Track Inspection Report May"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none text-sm"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-400">Target Department</label>
                    <select
                      value={uploadDept}
                      onChange={(e) => setUploadDept(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none text-sm"
                    >
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                      ))}
                    </select>
                  </div>

                  {/* Drag drop area */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-400">Select File</label>
                    <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-cyan-500 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors relative bg-white dark:bg-slate-900">
                      <input
                        type="file"
                        required
                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        accept=".pdf,.docx,.pptx,.xlsx,.txt,.csv,.png,.jpg,.jpeg"
                      />
                      <UploadCloud className="w-12 h-12 text-slate-400 mb-2 group-hover:text-cyan-500" />
                      <p className="text-xs font-semibold">{uploadFile ? uploadFile.name : "Drag and drop or click to browse files"}</p>
                      <p className="text-[10px] text-slate-400 mt-1">PDF, DOCX, XLSX, PPTX, TXT, CSV, JPG, PNG up to 10MB</p>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={uploadLoading || !uploadFile}
                    className="py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {uploadLoading ? "Executing Ingestion Pipeline..." : "Upload & Analyze Document"}
                  </button>
                </form>
              </div>

              {/* Progress logger */}
              <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col h-[400px]">
                <h3 className="font-bold text-sm mb-4">Pipeline Ingestion Terminal</h3>
                <div className="flex-1 bg-slate-950 text-emerald-400 rounded-xl p-4 font-mono text-[10px] overflow-y-auto flex flex-col gap-1.5 select-all">
                  <span className="text-slate-500">// System ready. Standard validation scripts mounted.</span>
                  {uploadLogs.map((log, index) => (
                    <span key={index}>{log}</span>
                  ))}
                  {uploadLoading && (
                    <span className="text-cyan-400 animate-pulse">■ Running analysis stages...</span>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB: DOCUMENT REPOSITORY */}
          {activeTab === "repository" && (
            <div className="flex flex-col gap-6">
              {/* Document table/grid layout */}
              <div className="glass-panel rounded-3xl border border-slate-200 dark:border-slate-800 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-sm">Ingested Document Catalog</h3>
                  <button onClick={() => setActiveTab("upload")} className="px-3 py-1.5 rounded-lg bg-cyan-600 text-white text-xs font-bold flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Upload File</button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold">
                        <th className="py-3 px-4">Title</th>
                        <th className="py-3 px-4">File Name</th>
                        <th className="py-3 px-4">Department</th>
                        <th className="py-3 px-4">Size</th>
                        <th className="py-3 px-4">Date Ingested</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.length > 0 ? (
                        documents.map(doc => {
                          const dept = departments.find(d => d.id === doc.department_id);
                          return (
                            <tr key={doc.id} className="border-b border-slate-100 dark:border-slate-900 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                              <td className="py-3.5 px-4 font-bold max-w-xs truncate">
                                <button onClick={() => handleDocClick(doc)} className="hover:text-cyan-500 transition-colors text-left font-bold">{doc.title}</button>
                              </td>
                              <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate">{doc.filename}</td>
                              <td className="py-3.5 px-4">
                                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">{dept ? dept.code : "General"}</span>
                              </td>
                              <td className="py-3.5 px-4 text-slate-400">{(doc.file_size / 1024).toFixed(0)} KB</td>
                              <td className="py-3.5 px-4 text-slate-400">{doc.created_at.substring(0, 10)}</td>
                              <td className="py-3.5 px-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  doc.status === "Completed" 
                                    ? "bg-emerald-500/10 text-emerald-500" 
                                    : doc.status === "Failed" 
                                      ? "bg-rose-500/10 text-rose-500"
                                      : "bg-amber-500/10 text-amber-500 animate-pulse"
                                }`}>
                                  {doc.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 flex justify-center gap-2">
                                <button
                                  onClick={() => handleDocClick(doc)}
                                  className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-cyan-500 transition-colors"
                                  title="View Summaries & OCR text"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                                <a
                                  href={documentApi.getDownloadUrl(doc.id)}
                                  download
                                  className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-500 transition-colors"
                                  title="Download Original"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                                <button
                                  onClick={() => handleDocDelete(doc.id)}
                                  className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-rose-500 transition-colors"
                                  title="Delete Permanent"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">No documents ingested. Navigate to Upload Center to start.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SEMANTIC SEARCH */}
          {activeTab === "search" && (
            <div className="flex flex-col gap-6">
              
              {/* Search Control Board */}
              <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800">
                <form onSubmit={handleSearchSubmit} className="flex flex-col gap-4">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="Search track alignment anomalies, contractor signaling variance, shift timings..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none text-xs"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={searchLoading}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold text-xs"
                    >
                      {searchLoading ? "Retrieving..." : "Search"}
                    </button>
                  </div>

                  {/* Metadata Filters Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-[10px]">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-slate-400">Department</span>
                      <select
                        value={searchFilterDept}
                        onChange={(e) => setSearchFilterDept(e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none"
                      >
                        <option value="">All Departments</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>{d.code}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-slate-400">Status</span>
                      <select
                        value={searchFilterStatus}
                        onChange={(e) => setSearchFilterStatus(e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none"
                      >
                        <option value="">All Statuses</option>
                        <option value="Completed">Completed</option>
                        <option value="Pending">Pending</option>
                        <option value="Failed">Failed</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-slate-400">Date From</span>
                      <input
                        type="date"
                        value={searchFilterDateFrom}
                        onChange={(e) => setSearchFilterDateFrom(e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-slate-400">Date To</span>
                      <input
                        type="date"
                        value={searchFilterDateTo}
                        onChange={(e) => setSearchFilterDateTo(e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>
                </form>
              </div>

              {/* Results Column */}
              <div className="flex flex-col gap-4">
                {searchResults.length > 0 ? (
                  searchResults.map((res, index) => (
                    <div key={index} className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-cyan-500/50 transition-all">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-500 text-[9px] font-bold uppercase">{res.department}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">{res.file_type} file</span>
                        </div>
                        <h4 className="font-bold text-sm mb-1">{res.title}</h4>
                        <p className="text-xs text-slate-400 italic font-mono leading-relaxed">{res.matching_snippet}</p>
                        {res.summary_bullet && (
                          <div className="mt-2.5 p-2.5 rounded bg-slate-50 dark:bg-slate-900/60 text-[10px] text-slate-400 flex items-start gap-2">
                            <Info className="w-3.5 h-3.5 text-cyan-400 mt-0.5 flex-shrink-0" />
                            <span><strong>AI Bullet Point:</strong> {res.summary_bullet}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-center gap-2 w-full md:w-32 flex-shrink-0">
                        <div className="text-center">
                          <span className="text-xs text-slate-400 block">Relevance Score</span>
                          <span className="text-2xl font-black text-cyan-400">{(res.relevance_score * 100).toFixed(0)}%</span>
                        </div>
                        <button
                          onClick={async () => {
                            const matchedDoc = documents.find(d => d.id === res.document_id);
                            if (matchedDoc) handleDocClick(matchedDoc);
                          }}
                          className="w-full py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[10px] font-bold text-center"
                        >
                          Review Summaries
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  searchQuery && !searchLoading && (
                    <div className="text-center text-slate-400 py-10 text-xs">No search results found matching query. Try other keywords or departments.</div>
                  )
                )}
              </div>

            </div>
          )}

          {/* TAB: AI CHAT ASSISTANT (RAG) */}
          {activeTab === "chat" && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-170px)] overflow-hidden">
              
              {/* Sidebar: Conversation history */}
              <div className="glass-panel rounded-3xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col h-full overflow-hidden">
                <button
                  onClick={handleCreateConversation}
                  className="w-full py-2.5 mb-4 rounded-xl border border-dashed border-cyan-500/40 hover:border-cyan-500 text-cyan-400 hover:bg-cyan-500/5 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" /> New Conversation Topic
                </button>

                <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-1">
                  {conversations.map(c => {
                    const isSelected = activeConversation?.id === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => handleSelectConversation(c.id)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs truncate transition-all ${
                          isSelected 
                            ? "bg-slate-200 dark:bg-slate-800 border-l-4 border-cyan-500 font-bold" 
                            : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                        }`}
                      >
                        {c.title}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Chat panel */}
              <div className="lg:col-span-3 glass-panel rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col h-full overflow-hidden">
                {activeConversation ? (
                  <>
                    {/* Header */}
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900/40">
                      <div>
                        <span className="text-[10px] text-cyan-400 font-semibold tracking-wider block uppercase">RAG Session Active</span>
                        <h4 className="font-bold text-xs">{activeConversation.title}</h4>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setAudioVoiceResponse(!audioVoiceResponse)}
                          className={`p-2 rounded-lg border text-[10px] flex items-center gap-1.5 transition-all ${
                            audioVoiceResponse
                              ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                              : "bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-500"
                          }`}
                          title="TTS response"
                        >
                          {audioVoiceResponse ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                          <span className="hidden sm:inline font-bold">Voice Synthesis</span>
                        </button>
                      </div>
                    </div>

                    {/* Messages Body */}
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                      {messages.map((m, idx) => {
                        const isAssistant = m.sender === "assistant";
                        return (
                          <div key={idx} className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}>
                            <div className={`max-w-xl rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                              isAssistant 
                                ? "bg-slate-150 dark:bg-slate-900 border border-slate-200 dark:border-slate-800" 
                                : "bg-gradient-to-tr from-cyan-600 to-blue-600 text-white font-medium"
                            }`}>
                              <p className="whitespace-pre-line">{m.text}</p>
                              
                              {/* Citations block */}
                              {isAssistant && m.source_citations && (
                                <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-1.5">
                                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">Linked Citations ({m.source_citations.length})</span>
                                  {m.source_citations.map((c: any, cidx: number) => (
                                    <button
                                      key={cidx}
                                      onClick={async () => {
                                        const foundDoc = documents.find(doc => doc.id === c.document_id);
                                        if (foundDoc) handleDocClick(foundDoc);
                                      }}
                                      className="inline-flex items-center gap-1.5 hover:text-cyan-500 transition-colors text-[9px] text-slate-400 text-left"
                                    >
                                      <FileText className="w-3 h-3 text-cyan-400" />
                                      <span className="underline font-semibold">{c.title}</span>
                                      {c.score && <span className="text-[8px] px-1 rounded bg-cyan-500/10 text-cyan-400">Relevancy: {(c.score * 100).toFixed(0)}%</span>}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {chatLoading && (
                        <div className="flex justify-start">
                          <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs text-slate-400 animate-pulse flex items-center gap-2">
                            <Cpu className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                            <span>MetroMind is thinking and searching document records...</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Chat Input form */}
                    <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 flex gap-2">
                      <input
                        type="text"
                        required
                        placeholder={`Ask questions about track wear, budgets, shifts to '${activeConversation.title}'...`}
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none text-xs focus:ring-1 focus:ring-cyan-500"
                      />
                      <button
                        type="submit"
                        disabled={chatLoading || !chatInput.trim()}
                        className="p-3 rounded-xl bg-cyan-600 text-white font-bold transition-all disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center flex-1 text-slate-400 p-6 text-center">
                    <MessageSquare className="w-16 h-16 text-slate-700 mb-3" />
                    <h4 className="font-bold text-sm text-slate-200 mb-1">RAG Chat Assistant</h4>
                    <p className="text-xs max-w-xs leading-relaxed mb-4">Converse with all ingested enterprise documents. Cite safety rules or financial statements instantly.</p>
                    <button
                      onClick={handleCreateConversation}
                      className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold"
                    >
                      Start Conversation Topic
                    </button>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB: KNOWLEDGE GRAPH */}
          {activeTab === "graph" && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-170px)]">
              
              {/* SVG Network Graph Canvas */}
              <div className="lg:col-span-3 glass-panel rounded-3xl border border-slate-200 dark:border-slate-800 p-4 relative overflow-hidden h-full flex flex-col bg-white dark:bg-slate-950">
                <div className="absolute top-4 left-4 z-10">
                  <span className="text-[10px] text-cyan-400 font-semibold tracking-wider block uppercase">Visual Relationship Map</span>
                  <h3 className="font-bold text-sm text-slate-700 dark:text-slate-200">KMRL Enterprise Knowledge Graph</h3>
                </div>

                {/* Graph View Frame using raw SVG */}
                <div className="flex-1 relative cursor-grab active:cursor-grabbing select-none">
                  <svg className="w-full h-full" viewBox="0 0 600 400">
                    {/* Draw Edges */}
                    {graphEdges.map((edge, idx) => {
                      const sourceNode = graphNodes.find(n => n.id === edge.source);
                      const targetNode = graphNodes.find(n => n.id === edge.target);
                      if (!sourceNode || !targetNode) return null;
                      
                      return (
                        <g key={idx}>
                          <line
                            x1={sourceNode.x}
                            y1={sourceNode.y}
                            x2={targetNode.x}
                            y2={targetNode.y}
                            stroke={theme === "dark" ? "rgba(6, 182, 212, 0.25)" : "rgba(3, 105, 161, 0.25)"}
                            strokeWidth={1.5}
                          />
                          {/* Midpoint relation text indicator */}
                          <text
                            x={(sourceNode.x + targetNode.x) / 2}
                            y={(sourceNode.y + targetNode.y) / 2 - 2}
                            fill="#64748b"
                            fontSize={6}
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            {edge.label}
                          </text>
                        </g>
                      );
                    })}

                    {/* Draw Nodes */}
                    {graphNodes.map((node) => {
                      const isSelected = selectedGraphNode?.id === node.id;
                      
                      // Node style configurations
                      let fill = "#64748b";
                      if (node.type === "system") fill = "#06b6d4";
                      if (node.type === "department") fill = "#3b82f6";
                      if (node.type === "document") fill = "#10b981";

                      return (
                        <g 
                          key={node.id} 
                          transform={`translate(${node.x}, ${node.y})`}
                          onClick={() => setSelectedGraphNode(node)}
                          className="cursor-pointer"
                        >
                          <circle
                            r={node.size}
                            fill={fill}
                            className={isSelected ? "stroke-cyan-400 stroke-2 animate-glow" : ""}
                            opacity={isSelected ? 1.0 : 0.85}
                          />
                          <text
                            y={node.size + 8}
                            fill={theme === "dark" ? "#f3f4f6" : "#0f172a"}
                            fontSize={7}
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            {node.label}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>

              {/* Node Inspector Side Panel */}
              <div className="glass-panel rounded-3xl border border-slate-200 dark:border-slate-800 p-5 h-full overflow-hidden flex flex-col">
                <h3 className="font-bold text-xs mb-4 uppercase tracking-wider text-slate-400">Node Property Inspector</h3>
                {selectedGraphNode ? (
                  <div className="flex flex-col gap-4 flex-1 overflow-y-auto">
                    <div>
                      <span className="text-[10px] text-cyan-400 font-bold block uppercase">{selectedGraphNode.type}</span>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{selectedGraphNode.name || selectedGraphNode.label}</h4>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] flex flex-col gap-2">
                      <div>
                        <span className="text-slate-400 block">Identifier ID</span>
                        <code className="font-bold text-cyan-400">{selectedGraphNode.id}</code>
                      </div>
                      {selectedGraphNode.file_type && (
                        <div>
                          <span className="text-slate-400 block">Extension</span>
                          <span className="font-bold uppercase text-slate-200">{selectedGraphNode.file_type} File</span>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-400 block">Relative Connections</span>
                        <span className="font-semibold text-slate-300">
                          {graphEdges.filter(e => e.source === selectedGraphNode.id || e.target === selectedGraphNode.id).length} Edge links
                        </span>
                      </div>
                    </div>

                    {selectedGraphNode.type === "document" && (
                      <button
                        onClick={() => {
                          const docId = parseInt(selectedGraphNode.id.split("_")[1]);
                          const doc = documents.find(d => d.id === docId);
                          if (doc) handleDocClick(doc);
                        }}
                        className="w-full py-2.5 rounded-xl bg-cyan-600 text-white font-bold text-xs"
                      >
                        Inspect summaries
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center flex-1 text-slate-500 text-center text-xs">
                    <Info className="w-8 h-8 text-slate-700 mb-2" />
                    <p>Select any node in the relationship network to inspect properties.</p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB: ANALYTICS DASHBOARD */}
          {activeTab === "analytics" && (
            <div className="flex flex-col gap-6">
              
              {/* Reports exporting console */}
              <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-sm mb-3">Enterprise Reporting Exports</h3>
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-semibold">Report Category:</span>
                    <a
                      href={analyticsApi.getExportUrl("compliance", "csv")}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> Compliance Audit Trail (CSV)
                    </a>
                    <a
                      href={analyticsApi.getExportUrl("department", "csv")}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-cyan-500" /> Document Inventory (CSV)
                    </a>
                  </div>
                </div>
              </div>

              {/* Multi chart grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Chart 1: Department Activity */}
                <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 h-80">
                  <h3 className="font-bold text-sm mb-4">Department File Density</h3>
                  {mounted && chartData.department_activity.length > 0 ? (
                    <div className="w-full h-60">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData.department_activity}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1}/>
                          <XAxis dataKey="department" stroke="#64748b" fontSize={10}/>
                          <YAxis stroke="#64748b" fontSize={10}/>
                          <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", color: "#fff", fontSize: 10 }}/>
                          <Bar dataKey="value" name="Documents" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-center py-10 text-xs">Awaiting data...</div>
                  )}
                </div>

                {/* Chart 2: AI Queries usage */}
                <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 h-80">
                  <h3 className="font-bold text-sm mb-4">AI Copilot Chat Queries Usage</h3>
                  {mounted && chartData.ai_usage.length > 0 ? (
                    <div className="w-full h-60">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData.ai_usage}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1}/>
                          <XAxis dataKey="date" stroke="#64748b" fontSize={10}/>
                          <YAxis stroke="#64748b" fontSize={10}/>
                          <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", color: "#fff", fontSize: 10 }}/>
                          <Area type="monotone" dataKey="count" name="Conversations" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.1} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-center py-10 text-xs">Awaiting data...</div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* TAB: COMPLIANCE CENTER */}
          {activeTab === "compliance" && (
            <div className="flex flex-col gap-6">
              
              {/* Safety audits table or alerts */}
              <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-sm mb-4">Compliance Audit Trail & Incident Logs</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold">
                        <th className="py-2.5 px-3">Audit ID</th>
                        <th className="py-2.5 px-3">Operator Name</th>
                        <th className="py-2.5 px-3">Event Action</th>
                        <th className="py-2.5 px-3">Details</th>
                        <th className="py-2.5 px-3">IP Address</th>
                        <th className="py-2.5 px-3">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.length > 0 ? (
                        auditLogs.map(log => (
                          <tr key={log.id} className="border-b border-slate-100 dark:border-slate-900 hover:bg-slate-900/10 text-slate-400">
                            <td className="py-2.5 px-3 font-semibold text-slate-200">{log.id}</td>
                            <td className="py-2.5 px-3 text-slate-300 font-medium">{log.user_name}</td>
                            <td className="py-2.5 px-3">
                              <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold uppercase text-[9px]">{log.action}</span>
                            </td>
                            <td className="py-2.5 px-3 truncate max-w-xs">{log.details}</td>
                            <td className="py-2.5 px-3 font-mono">{log.ip_address || "127.0.0.1"}</td>
                            <td className="py-2.5 px-3 text-[10px]">{log.timestamp.replace("T", " ").substring(0, 19)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-500">Security audit history list restricted to Super Administrators.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: USER MANAGEMENT */}
          {activeTab === "users" && (
            <div className="flex flex-col gap-6">
              
              <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-sm mb-4">Enterprise Accounts & Security clearances</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold">
                        <th className="py-3 px-4">Name</th>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Role ID</th>
                        <th className="py-3 px-4">Department ID</th>
                        <th className="py-3 px-4">Account Status</th>
                        <th className="py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersList.length > 0 ? (
                        usersList.map(u => (
                          <tr key={u.id} className="border-b border-slate-100 dark:border-slate-900 text-slate-400">
                            <td className="py-3 px-4 font-bold text-slate-200">{u.name}</td>
                            <td className="py-3 px-4 font-mono">{u.email}</td>
                            <td className="py-3 px-4">{u.role_id === 1 ? "Super Admin" : u.role_id === 2 ? "Dept Admin" : "Employee"}</td>
                            <td className="py-3 px-4">Dept {u.department_id || "General"}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${u.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                                {u.status}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <button
                                onClick={async () => {
                                  const newStatus = u.status === "active" ? "inactive" : "active";
                                  try {
                                    await userApi.updateUser(u.id, { status: newStatus });
                                    const updated = await userApi.listUsers();
                                    setUsersList(updated);
                                  } catch {
                                    alert("Unauthorized change");
                                  }
                                }}
                                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                              >
                                Toggle Status
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-500">Security list restricted to Super Administrators.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB: SETTINGS */}
          {activeTab === "settings" && (
            <div className="max-w-3xl glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col gap-6">
              <h3 className="font-bold text-base">MetroMind AI Platform Settings</h3>
              
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center py-3 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="font-semibold text-xs block">Visual Interface Theme</span>
                    <span className="text-[10px] text-slate-400">Toggle between Light and Dark SaaS modes.</span>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold"
                  >
                    Set to {theme === "dark" ? "Light Mode" : "Dark Mode"}
                  </button>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="font-semibold text-xs block">Fallback System Integration</span>
                    <span className="text-[10px] text-slate-400">Simulate RAG and OCR offline when local servers are unreachable.</span>
                  </div>
                  <span className="px-3 py-1 rounded bg-cyan-500/10 text-cyan-400 text-[10px] font-bold">Enabled Fallbacks</span>
                </div>

                <div className="flex justify-between items-center py-3">
                  <div>
                    <span className="font-semibold text-xs block">Clear Temporary Data</span>
                    <span className="text-[10px] text-slate-400">Flush locally configured localStorage auth sessions.</span>
                  </div>
                  <button
                    onClick={() => {
                      clearToken();
                      router.push("/login");
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 text-xs font-bold"
                  >
                    Reset Session
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* 4. MODAL: DOCUMENT DETAILS / AI SUMMARY PANEL */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-end z-50">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 h-full p-6 shadow-2xl flex flex-col gap-4 overflow-hidden border-l border-slate-800">
            {/* Header */}
            <div className="flex justify-between items-start pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest block">Document Profile</span>
                <h3 className="font-bold text-base">{selectedDoc.title}</h3>
                <span className="text-[10px] text-slate-400">{selectedDoc.filename} ({(selectedDoc.file_size/1024).toFixed(0)} KB)</span>
              </div>
              <button
                onClick={() => {
                  setSelectedDoc(null);
                  setSelectedDocDetails(null);
                }}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Selectors */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider gap-3">
              {[
                { id: "executive", label: "Executive Summary" },
                { id: "detailed", label: "Detailed Text" },
                { id: "bullets", label: "Key Bullets" },
                { id: "compliance", label: "Compliance findings" },
                { id: "actions", label: "Action items" }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setDocDetailsTab(tab.id)}
                  className={`pb-2 transition-colors ${docDetailsTab === tab.id ? "border-b-2 border-cyan-500 text-cyan-400 font-black" : "text-slate-400 hover:text-white"}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto pr-1 text-xs leading-relaxed text-slate-300">
              {selectedDocDetails ? (
                <>
                  {/* Summary text display */}
                  <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-200 dark:border-slate-800 whitespace-pre-wrap">
                    {docDetailsTab === "executive" && selectedDocDetails.summary?.executive_summary}
                    {docDetailsTab === "detailed" && (
                      <div className="font-mono text-[10px] leading-relaxed">
                        {selectedDocDetails.ocr_result?.extracted_text}
                      </div>
                    )}
                    {docDetailsTab === "bullets" && selectedDocDetails.summary?.bullet_summary}
                    {docDetailsTab === "compliance" && selectedDocDetails.summary?.compliance_summary}
                    {docDetailsTab === "actions" && selectedDocDetails.summary?.action_items}
                  </div>

                  {/* Extracted Entities badges */}
                  <div className="mt-5">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-2.5">Extracted Named Entities ({selectedDocDetails.entities?.length || 0})</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedDocDetails.entities && selectedDocDetails.entities.length > 0 ? (
                        selectedDocDetails.entities.map((e: any, index: number) => (
                          <div
                            key={index}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-[10px]"
                          >
                            <span className="font-bold text-[9px] text-cyan-400 uppercase">{e.entity_type}:</span>
                            <span className="font-semibold">{e.entity_value}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-[10px] text-slate-500">No entities extracted from content.</p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
                  <Cpu className="w-8 h-8 text-cyan-400 animate-spin" />
                  <span>Loading summarization engine metrics...</span>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between">
              <a
                href={documentApi.getDownloadUrl(selectedDoc.id)}
                download
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold flex items-center gap-2 text-slate-300"
              >
                <Download className="w-4 h-4" /> Download Original file
              </a>
              <button
                onClick={() => handleDocDelete(selectedDoc.id)}
                className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-bold"
              >
                Delete Ingested Profile
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
