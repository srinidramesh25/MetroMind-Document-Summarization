// Frontend API Client for MetroMind AI

const BACKEND_URL = "http://localhost:8000/api/v1";

// Custom helper to check if backend is online
let isBackendOnline = false;

// Basic token handlers
export function setToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("metromind_token", token);
  }
}

export function getToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("metromind_token");
  }
  return null;
}

export function clearToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("metromind_token");
    localStorage.removeItem("metromind_user");
  }
}

export function getCurrentUser() {
  if (typeof window !== "undefined") {
    const userStr = localStorage.getItem("metromind_user");
    if (userStr) return JSON.parse(userStr);
  }
  return null;
}

// Check backend health
async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch("http://localhost:8000/", { signal: AbortSignal.timeout(1200) });
    const data = await res.json();
    isBackendOnline = data.status === "online";
    return isBackendOnline;
  } catch {
    isBackendOnline = false;
    return false;
  }
}

// Request Helper
async function request(endpoint: string, options: RequestInit = {}) {
  await checkHealth();

  if (!isBackendOnline) {
    // Return mock data fallback
    return handleMockRequest(endpoint, options);
  }

  const token = getToken();
  const headers = new Headers(options.headers || {});
  
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errText = await response.text();
    let errMessage = "API Request failed";
    try {
      const errJSON = JSON.parse(errText);
      errMessage = errJSON.detail || errMessage;
    } catch {}

    if (response.status === 401) {
      clearToken();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }

    throw new Error(errMessage);
  }

  return response.json();
}

// --- MOCK DATABASE (Browser-side Fallback State) ---
const MOCK_DEPARTMENTS = [
  { id: 1, name: "Operations", code: "OPS", description: "Scheduling & movement" },
  { id: 2, name: "HR & Administration", code: "HR", description: "Policies & shift crew" },
  { id: 3, name: "Finance & Accounts", code: "FIN", description: "Expenses & ledgers" },
  { id: 4, name: "Legal Cell", code: "LEG", description: "Contracts & regulations" },
  { id: 5, name: "Procurement", code: "PRC", description: "Tenders & vendors" },
  { id: 6, name: "Maintenance", code: "MNT", description: "Track & signaling alignment" },
  { id: 7, name: "Safety & Quality", code: "SAF", description: "Audits & hazards" },
  { id: 8, name: "Compliance Control", code: "COM", description: "Risk review log" },
];

let mockDocuments = [
  {
    id: 101,
    title: "Monsoon Track Safety Directive 2026",
    filename: "KMRL-SAF-Monsoon-Safety.pdf",
    file_size: 420500,
    file_type: "pdf",
    status: "Completed",
    uploaded_by: 1,
    department_id: 7,
    category_id: 7,
    created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
    updated_at: new Date().toISOString(),
    ocr_result: {
      extracted_text: "KOCHI METRO RAIL LIMITED - SAFETY DIRECTIVE\nRef: KMRL-SAF-2026-042\nDuring monsoons on viaduct paths, maximum speed limit must not exceed 40 km/h under crosswinds exceeding 60 km/h. Clear drainages before June 1. Sector engineers verify Muttom depot water logs."
    },
    summary: {
      executive_summary: "Emergency safety guidelines for running metro train operations during heavy monsoon rains.",
      detailed_summary: "Establishes a mandatory speed reduction on elevated viaduct structures, clearing gutters, and running drainage pumps.",
      bullet_summary: "- Limits speed to 40 km/h under winds > 60 km/h\n- Drainage clearance deadline: June 1\n- Muttom depot track logging required",
      compliance_summary: "Directives governed under Section 14 safety guidelines of the Metro Railways Act 2002.",
      action_items: "- [ ] Run drainage inspection at depot by May 28\n- [ ] Clean gutters by June 1\n- [ ] Deploy anemometers on viaduct heights"
    },
    entities: [
      { id: 1, entity_type: "Location", entity_value: "Muttom Depot", confidence: 0.98 },
      { id: 2, entity_type: "ProjectName", entity_value: "Monsoon Safety Upgrades", confidence: 0.92 },
      { id: 3, entity_type: "ReferenceID", entity_value: "KMRL-SAF-2026-042", confidence: 0.99 },
      { id: 4, entity_type: "Person", entity_value: "Rajendran Pillai", confidence: 0.95 }
    ]
  },
  {
    id: 102,
    title: "Q1 Signaling Maintenance Cost Ledger",
    filename: "KMRL-FIN-Signaling-Costs.xlsx",
    file_size: 154000,
    file_type: "xlsx",
    status: "Completed",
    uploaded_by: 1,
    department_id: 3,
    category_id: 3,
    created_at: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
    updated_at: new Date().toISOString(),
    ocr_result: {
      extracted_text: "KMRL MAINTENANCE AUDIT LEDGER\nAlstom Transportation signaling system intersections at Vytila and Edappally Q1 budget: INR 88,00,000. Actual expenditure: INR 89,50,000. Variance: +1.7% overrun."
    },
    summary: {
      executive_summary: "Financial statement outlining the expense ledger for signaling repairs at major junctions.",
      detailed_summary: "Alstom signaling upgrades experienced a cost overrun of INR 1.5 Lakhs (1.7% variance), which needs steering board clearance.",
      bullet_summary: "- Allocates INR 88,00,000 for signaling upgrade\n- Alstom actual cost is INR 89,50,000\n- Identifies budget overrun of +1.7%",
      compliance_summary: "Signaling contracts comply with central railway bidding norms and internal cost controls.",
      action_items: "- [ ] Request steering board variance override approval\n- [ ] Audit Alstom invoice details at Edappally"
    },
    entities: [
      { id: 5, entity_type: "Organization", entity_value: "Alstom Transportation India", confidence: 0.97 },
      { id: 6, entity_type: "MonetaryValue", entity_value: "INR 89,50,000", confidence: 0.99 },
      { id: 7, entity_type: "Location", entity_value: "Edappally", confidence: 0.94 },
      { id: 8, entity_type: "Location", entity_value: "Vytila", confidence: 0.95 }
    ]
  }
];

let mockConversations = [
  {
    id: 1,
    title: "Track Safety Operations",
    created_at: new Date().toISOString(),
    messages: [
      { id: 1, sender: "user", text: "What is the speed limit during heavy monsoons?", timestamp: new Date().toISOString() },
      {
        id: 2,
        sender: "assistant",
        text: "According to the **Monsoon Track Safety Directive 2026** (KMRL-SAF-2026-042), the maximum speed limit on elevate viaduct paths must not exceed **40 km/h** when crosswinds exceed **60 km/h**.",
        timestamp: new Date().toISOString(),
        source_citations: [{ document_id: 101, title: "Monsoon Track Safety Directive 2026", score: 0.99 }]
      }
    ]
  }
];

let mockNotifications = [
  { id: 1, title: "Database Synced", message: "Mock local storage initialized.", type: "success", read_status: false, created_at: new Date().toISOString() },
  { id: 2, title: "Safety Alert", message: "Track joint wear warnings registered for Aluva station.", type: "warning", read_status: false, created_at: new Date().toISOString() }
];

let mockUsers = [
  { id: 99, name: "KMRL Super Administrator", email: "admin@kmrl.co.in", role_id: 1, department_id: 1, status: "active", created_at: new Date().toISOString() },
  { id: 100, name: "KMRL Operations Officer", email: "employee@kmrl.co.in", role_id: 3, department_id: 1, status: "active", created_at: new Date().toISOString() }
];

function handleMockRequest(endpoint: string, options: RequestInit) {
  console.warn(`[MetroMind Demo] API server is offline. Simulating response for ${endpoint}`);
  
  const [path, query] = endpoint.split("?");
  
  if (path.startsWith("/auth/login")) {
    const body = options.body ? new URLSearchParams(options.body.toString()) : null;
    const email = body?.get("username") || "admin@kmrl.co.in";
    const user = {
      id: 99,
      name: email.includes("admin") ? "KMRL Super Administrator" : "KMRL Operations Officer",
      email,
      role_id: email.includes("admin") ? 1 : 3,
      department_id: 1,
      status: "active",
      created_at: new Date().toISOString()
    };
    
    // Save in storage
    localStorage.setItem("metromind_user", JSON.stringify(user));
    return {
      access_token: "mock_jwt_token_for_metro_mind_development",
      token_type: "bearer",
      role: email.includes("admin") ? "Super Admin" : "Employee",
      name: user.name,
      email: user.email,
      department_id: user.department_id
    };
  }

  if (path.startsWith("/auth/register")) {
    const body = JSON.parse(options.body as string);
    return {
      id: Math.floor(Math.random() * 100) + 10,
      name: body.name,
      email: body.email,
      role_id: body.role_id,
      department_id: body.department_id,
      status: "active",
      created_at: new Date().toISOString()
    };
  }

  if (path.startsWith("/auth/me")) {
    return getCurrentUser() || {
      id: 99,
      name: "KMRL Super Administrator",
      email: "admin@kmrl.co.in",
      role_id: 1,
      department_id: 1,
      status: "active",
      created_at: new Date().toISOString()
    };
  }

  if (path === "/users/departments") {
    return MOCK_DEPARTMENTS;
  }

  if (path.startsWith("/documents")) {
    if (options.method === "POST") {
      // Create a mock document upload
      const formData = options.body as FormData;
      const title = formData.get("title") as string;
      const deptId = parseInt(formData.get("department_id") as string || "1");
      const file = formData.get("file") as File;
      const name = file ? file.name : "uploaded_document.pdf";
      
      const newDoc = {
        id: Math.floor(Math.random() * 1000) + 200,
        title,
        filename: name,
        file_size: file ? file.size : 320400,
        file_type: name.split(".").pop() || "pdf",
        status: "Completed",
        uploaded_by: 99,
        department_id: deptId,
        category_id: deptId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ocr_result: {
          extracted_text: `KMRL INTEL DOCUMENT\nTitle: ${title}\nThis is mock text extracted from ${name}. It contains operations logs and procurement data at Muttom depot. Vendor Alstom and L&T are active in Phase 2 Project operations.`
        },
        summary: {
          executive_summary: `Executive summary review of document titled ${title}.`,
          detailed_summary: `Complete parsed transcript logs of ${name} covering Kochi Metro internal workflows.`,
          bullet_summary: `- Initial metadata parsed\n- Department category alignment successful\n- High relevancy keywords index`,
          compliance_summary: "Fully compliant with Metro Railways general operations regulations act.",
          action_items: "- [ ] Audit operations checklists\n- [ ] Update category indices"
        },
        entities: [
          { id: 990, entity_type: "Location", entity_value: "Muttom", confidence: 0.95 },
          { id: 991, entity_type: "Organization", entity_value: "L&T", confidence: 0.90 }
        ]
      };
      
      mockDocuments = [newDoc, ...mockDocuments];
      // Trigger notification
      mockNotifications = [{
        id: Math.floor(Math.random() * 1000) + 10,
        title: "Upload Processed",
        message: `Successfully analyzed and indexed '${title}' in department database.`,
        type: "success",
        read_status: false,
        created_at: new Date().toISOString()
      }, ...mockNotifications];
      
      return newDoc;
    }
    
    // Check if ID request
    const matches = path.match(/\/documents\/(\d+)/);
    if (matches) {
      const docId = parseInt(matches[1]);
      const found = mockDocuments.find(d => d.id === docId);
      if (!found) throw new Error("Document not found");
      return found;
    }
    
    return mockDocuments;
  }

  if (path.startsWith("/search")) {
    const params = new URLSearchParams(query || "");
    const q = (params.get("q") || "").toLowerCase();
    
    const results = mockDocuments.filter(d => 
      d.title.toLowerCase().includes(q) || 
      d.ocr_result.extracted_text.toLowerCase().includes(q)
    ).map(d => ({
      document_id: d.id,
      title: d.title,
      file_type: d.file_type,
      relevance_score: 0.95,
      matching_snippet: d.ocr_result.extracted_text.substring(0, 180) + "...",
      summary_bullet: d.summary.bullet_summary.split("\n")[0].replace("- ", ""),
      department: MOCK_DEPARTMENTS.find(dept => dept.id === d.department_id)?.name || "Operations"
    }));
    
    return { results };
  }

  if (path.startsWith("/chat/conversations")) {
    // Message send
    const sendMatch = path.match(/\/chat\/conversations\/(\d+)\/messages/);
    if (sendMatch) {
      const body = JSON.parse(options.body as string);
      const text = body.text;
      
      let reply = "I've analyzed the Kochi Metro Rail databases. I could not locate a matching clause for that question. Can you specify a department, or upload the document?";
      let refs: any[] = [];
      
      const query_l = text.toLowerCase();
      if (query_l.includes("speed") || query_l.includes("monsoon") || query_l.includes("wind")) {
        reply = "According to the **Monsoon Track Safety Directive 2026** (KMRL-SAF-2026-042), maximum train speeds on elevates viaducts must be limited to **40 km/h** when wind gusts exceed **60 km/h**.";
        refs = [{ document_id: 101, title: "Monsoon Track Safety Directive 2026", score: 0.99 }];
      } else if (query_l.includes("cost") || query_l.includes("contractor") || query_l.includes("alstom")) {
        reply = "According to Q1 financial ledgers, **Alstom Transportation India** registered the highest maintenance expenditure of **INR 89,50,000**, representing a **+1.7% overrun** due to signalling upgrades at Edappally junctions.";
        refs = [{ document_id: 102, title: "Q1 Signaling Maintenance Cost Ledger", score: 0.98 }];
      }
      
      const newMsg = {
        id: Math.floor(Math.random() * 1000) + 100,
        sender: "assistant",
        text: reply,
        timestamp: new Date().toISOString(),
        ...(refs.length > 0 ? { source_citations: refs } : {})
      };
      
      const convId = parseInt(sendMatch[1]);
      const conv = mockConversations.find(c => c.id === convId);
      if (conv) {
        conv.messages.push({
          id: Math.floor(Math.random() * 1000) + 20,
          sender: "user",
          text,
          timestamp: new Date().toISOString()
        });
        conv.messages.push(newMsg);
      }
      
      return newMsg;
    }
    
    // Conversation list / create
    if (options.method === "POST") {
      const body = JSON.parse(options.body as string);
      const newConv = {
        id: mockConversations.length + 1,
        title: body.title,
        created_at: new Date().toISOString(),
        messages: []
      };
      mockConversations.push(newConv);
      return newConv;
    }
    
    // Single convo get
    const convoGetMatch = path.match(/\/chat\/conversations\/(\d+)/);
    if (convoGetMatch) {
      const convId = parseInt(convoGetMatch[1]);
      const found = mockConversations.find(c => c.id === convId);
      if (!found) throw new Error("Conversation not found");
      return found;
    }
    
    return mockConversations;
  }

  if (path === "/analytics/metrics") {
    return {
      total_documents: mockDocuments.length,
      active_users: 4,
      ai_queries: mockConversations.reduce((acc, c) => acc + c.messages.filter(m => m.sender === "user").length, 0) + 15,
      search_success_rate: 94.6,
      compliance_alerts: mockNotifications.filter(n => n.type === "warning" || n.type === "alert").length,
      pending_reviews: mockDocuments.filter(d => d.status === "Pending").length
    };
  }

  if (path === "/analytics/charts") {
    return {
      upload_trends: [
        { date: "Jun 14", count: 1 },
        { date: "Jun 15", count: 3 },
        { date: "Jun 16", count: 2 },
        { date: "Jun 17", count: 5 },
        { date: "Jun 18", count: 4 },
        { date: "Jun 19", count: mockDocuments.length },
        { date: "Jun 20", count: 2 }
      ],
      department_activity: MOCK_DEPARTMENTS.map(d => ({
        department: d.code,
        value: mockDocuments.filter(doc => doc.department_id === d.id).length
      })),
      category_distribution: [
        { category: "Operations", value: 1 },
        { category: "HR", value: 0 },
        { category: "Finance", value: mockDocuments.filter(doc => doc.department_id === 3).length },
        { category: "Safety", value: mockDocuments.filter(doc => doc.department_id === 7).length }
      ],
      ai_usage: [
        { date: "Jun 14", count: 2 },
        { date: "Jun 15", count: 5 },
        { date: "Jun 16", count: 8 },
        { date: "Jun 17", count: 4 },
        { date: "Jun 18", count: 12 },
        { date: "Jun 19", count: 15 },
        { date: "Jun 20", count: 1 }
      ],
      search_analytics: [
        { term: "safety rules", count: 8 },
        { term: "monsoon limits", count: 5 },
        { term: "signaling cost", count: 4 }
      ]
    };
  }

  if (path === "/compliance/risk-alerts") {
    return [
      {
        severity: "HIGH",
        category: "Operational Safety",
        title: "Track Joint Wear Close to Threshold",
        description: "Aluva Station Chainage 12/400 reports 3.8mm wear (safety threshold: 4.0mm). Action required within 15 days.",
        timestamp: new Date().toISOString()
      },
      {
        severity: "MEDIUM",
        category: "Financial Overrun",
        title: "Alstom Signalling Variance Alert",
        description: "Q1 signalling upkeep allocation exceeded by +1.7% variance. Board review requested.",
        timestamp: new Date().toISOString()
      }
    ];
  }

  if (path === "/compliance/audit-logs") {
    return [
      { id: 1, user_id: 99, user_name: "Super Admin", action: "USER_LOGIN", ip_address: "127.0.0.1", details: "Admin login successful", timestamp: new Date().toISOString() },
      { id: 2, user_id: 99, user_name: "Super Admin", action: "DOCUMENT_UPLOAD", ip_address: "127.0.0.1", details: "Uploaded ledger.xlsx", timestamp: new Date().toISOString() }
    ];
  }

  if (path === "/users/notifications") {
    return mockNotifications;
  }

  if (path === "/users/notifications/read-all") {
    mockNotifications = mockNotifications.map(n => ({ ...n, read_status: true }));
    return { detail: "Read success" };
  }

  if (path === "/users") {
    return mockUsers;
  }

  const userPutMatch = path.match(/\/users\/(\d+)/);
  if (userPutMatch) {
    const userId = parseInt(userPutMatch[1]);
    const body = JSON.parse(options.body as string);
    mockUsers = mockUsers.map(u => u.id === userId ? { ...u, ...body } : u);
    return mockUsers.find(u => u.id === userId) || null;
  }

  throw new Error(`Endpoint mock not implemented: ${endpoint}`);
}

// --- API METHOD EXPORTS ---
export const authApi = {
  login: async (username: string, password: string) => {
    // OAuth2 body payload formatting
    const body = new URLSearchParams();
    body.append("username", username);
    body.append("password", password);
    
    const data = await request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    });

    if (data.access_token) {
      setToken(data.access_token);
      const user = {
        name: data.name,
        email: data.email,
        role: data.role,
        department_id: data.department_id
      };
      localStorage.setItem("metromind_user", JSON.stringify(user));
    }
    return data;
  },

  register: async (userForm: any) => {
    return request("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userForm)
    });
  },

  getMe: async () => {
    return request("/auth/me");
  }
};

export const documentApi = {
  upload: async (title: string, departmentId: number, file: File) => {
    const formData = new FormData();
    formData.append("title", title);
    formData.append("department_id", String(departmentId));
    formData.append("file", file);

    return request("/documents/upload", {
      method: "POST",
      body: formData // Fetch handles Content-Type boundaries for FormDatas automatically
    });
  },

  list: async (filters: { department_id?: number; category_id?: number } = {}) => {
    let url = "/documents";
    const params = new URLSearchParams();
    if (filters.department_id) params.append("department_id", String(filters.department_id));
    if (filters.category_id) params.append("category_id", String(filters.category_id));
    
    const queryStr = params.toString();
    if (queryStr) url += `?${queryStr}`;
    
    return request(url);
  },

  getDetails: async (id: number) => {
    return request(`/documents/${id}`);
  },

  delete: async (id: number) => {
    return request(`/documents/${id}`, {
      method: "DELETE"
    });
  },

  getDownloadUrl: (id: number) => {
    if (!isBackendOnline) {
      // Simulate file download by returning a sample base64 text document
      return "data:text/plain;base64,S01STCBFbWVyZ2VuY3kgTW9uc29vbiBTYWZldHkgRGlyZWN0aXZlIDIwMjYK";
    }
    return `${BACKEND_URL}/documents/${id}/download`;
  }
};

export const searchApi = {
  query: async (q: string, filters: any = {}) => {
    const params = new URLSearchParams({ q });
    if (filters.department_id) params.append("department_id", String(filters.department_id));
    if (filters.category_id) params.append("category_id", String(filters.category_id));
    if (filters.status) params.append("status", filters.status);
    if (filters.date_from) params.append("date_from", filters.date_from);
    if (filters.date_to) params.append("date_to", filters.date_to);

    return request(`/search?${params.toString()}`);
  }
};

export const chatApi = {
  listConversations: async () => {
    return request("/chat/conversations");
  },

  getConversation: async (id: number) => {
    return request(`/chat/conversations/${id}`);
  },

  createConversation: async (title: string) => {
    return request("/chat/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title })
    });
  },

  sendMessage: async (conversationId: number, text: string) => {
    return request(`/chat/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
  }
};

export const analyticsApi = {
  getMetrics: async () => {
    return request("/analytics/metrics");
  },

  getCharts: async () => {
    return request("/analytics/charts");
  },

  getExportUrl: (type: string, format: string = "csv") => {
    if (!isBackendOnline) {
      return "data:text/csv;base64,QXVkaXQgTG9nIElELEFjdGlvbixEZXRhaWxzLFRpbWVzdGFtcAoxLFNZU1RFTV9CSU5ELFNlZWRpbmcgc3VjY2Vzc2Z1bCwyMDI2LTA2LTIw";
    }
    return `${BACKEND_URL}/analytics/export?type=${type}&format=${format}`;
  }
};

export const complianceApi = {
  getRiskAlerts: async () => {
    return request("/compliance/risk-alerts");
  },

  getAuditLogs: async (limit: number = 50) => {
    return request(`/compliance/audit-logs?limit=${limit}`);
  }
};

export const userApi = {
  getDepartments: async () => {
    return request("/users/departments");
  },

  getNotifications: async (unreadOnly: boolean = false) => {
    return request(`/users/notifications?unread_only=${unreadOnly}`);
  },

  readAllNotifications: async () => {
    return request("/users/notifications/read-all", {
      method: "POST"
    });
  },

  listUsers: async () => {
    return request("/users");
  },

  updateUser: async (id: number, form: any) => {
    return request(`/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
  }
};
