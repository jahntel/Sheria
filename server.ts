/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import crypto from "crypto";
import dotenv from "dotenv";
import fs from "fs";
import { User, UserRole, LawCitation, ScratchpadDocument, ChatSession } from "./src/types.js";

// Load environment variables
dotenv.config();

// Helpful environment warnings for developers
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.warn("[JUA SHERIA] WARNING: GOOGLE_APPLICATION_CREDENTIALS is not set. Server-side Google API calls may fail with 'Could not load the default credentials'. See https://cloud.google.com/docs/authentication/getting-started");
} else {
  try {
    if (!fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
      console.warn("[JUA SHERIA] WARNING: GOOGLE_APPLICATION_CREDENTIALS points to a file that does not exist:", process.env.GOOGLE_APPLICATION_CREDENTIALS);
    }
  } catch (e) {
    /* ignore */
  }
}

if (!process.env.GEMINI_API_KEY) {
  console.warn("[JUA SHERIA] WARNING: GEMINI_API_KEY is not defined. The Google GenAI client may not authenticate correctly.");
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Setup Gemini Client (or a local mock when credentials are not provided)
let ai: any;

const haveGeminiKey = !!process.env.GEMINI_API_KEY;

if (haveGeminiKey) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
} else {
  console.warn("[JUA SHERIA] No GEMINI_API_KEY found — using local mock AI for development.");

  // Minimal mock implementation that matches the small part of the GenAI surface used in this app.
  ai = {
    models: {
      async generateContent(opts: any) {
        const lastPart = Array.isArray(opts.contents) ? opts.contents[opts.contents.length - 1] : opts.contents;
        const text = (lastPart && lastPart.parts && lastPart.parts.length > 0 && lastPart.parts[0].text) || "(no input)";
        return { text: `Mocked answer (local dev):\n\n${text}\n\n[This response was generated locally because GEMINI_API_KEY is not set].` };
      },

      async *generateContentStream(opts: any) {
        // Create a simple echoed response split into chunks to simulate streaming
        const combined = (opts.contents || []).map((c: any) => (c.parts && c.parts.map((p: any) => p.text).join(" ")) || "").join(" \n\n");
        const reply = `Mocked stream reply (local dev):\n\n${combined}\n\n[End of mock reply]`;
        // Split into small chunks by sentences
        const chunks = reply.match(/[^\.?!]+[\.?!]+|[^\.?!]+$/g) || [reply];
        for (const ch of chunks) {
          yield { text: ch.trim() + " " };
        }
      },
    },
  };
}

// Configure base middleware
app.use(express.json());

// JWT Auth Config
const JWT_SECRET = process.env.JWT_SECRET || "jua-sheria-kenya-2026-secret-token";

function base64url(str: string | Buffer): string {
  const base64 = typeof str === "string" ? Buffer.from(str).toString("base64") : str.toString("base64");
  return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function signJwt(payload: any): string {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(signatureInput)
    .digest();
  const encodedSignature = base64url(signature);
  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

function verifyJwt(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;
    const signatureInput = `${header}.${payload}`;
    const expectedSignature = base64url(
      crypto.createHmac("sha256", JWT_SECRET).update(signatureInput).digest()
    );
    if (signature !== expectedSignature) return null;
    // Decode with base64url to prevent syntax errors caused by special characters like _ and -
    const decodedPayload = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (decodedPayload.exp && Date.now() / 1000 > decodedPayload.exp) {
      return null; // Expired
    }
    return decodedPayload;
  } catch (e) {
    return null;
  }
}

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// File Paths for Persistence
const baseDbPath = process.env.VERCEL ? "/tmp" : process.cwd();
const USERS_FILE = path.join(baseDbPath, "users_db.json");
const DOCS_FILE = path.join(baseDbPath, "documents_db.json");
const CHATS_FILE = path.join(baseDbPath, "chats_db.json");

// Seed standard mock users for easy citizen/lawyer testing
const seedUsers = [
  {
    id: "user-citizen",
    email: "citizen@juasheria.co.ke",
    passwordHash: hashPassword("citizen123"),
    role: "citizen" as UserRole,
    fullName: "Mwangi Kamau",
    createdAt: new Date().toISOString(),
  },
  {
    id: "user-lawyer",
    email: "lawyer@juasheria.co.ke",
    passwordHash: hashPassword("lawyer123"),
    role: "lawyer" as UserRole,
    fullName: "Counsel Adhiambo Onyango",
    createdAt: new Date().toISOString(),
  },
];

// Helper to load users from file with fallback to seed users
function loadUsers(): Array<User & { passwordHash: string }> {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, "utf8");
      const loaded = JSON.parse(data);
      if (Array.isArray(loaded) && loaded.length > 0) {
        return loaded;
      }
    }
  } catch (err) {
    console.error("Error loading users database:", err);
  }
  return [...seedUsers];
}

// Helper to save users to file
function saveUsers(usersList: Array<User & { passwordHash: string }>) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(usersList, null, 2), "utf8");
  } catch (err) {
    console.error("Error saving users database:", err);
  }
}

// Helper to load documents from file with fallback
function loadDocuments(): Map<string, ScratchpadDocument[]> {
  const map = new Map<string, ScratchpadDocument[]>();
  try {
    if (fs.existsSync(DOCS_FILE)) {
      const data = fs.readFileSync(DOCS_FILE, "utf8");
      const parsed = JSON.parse(data);
      for (const [key, val] of Object.entries(parsed)) {
        map.set(key, val as ScratchpadDocument[]);
      }
      return map;
    }
  } catch (err) {
    console.error("Error loading documents database:", err);
  }
  // Set default seed doc for lawyers
  map.set("user-lawyer", [
    {
      id: "doc-1",
      title: "Draft Defense - Tenant Eviction Claim",
      content: `IN THE RENT RESTRICTION TRIBUNAL AT NAIROBI
TRIBUNAL CASE NO. RRT/504 OF 2026

BETWEEN:
JOHN KAMAU ------------------------------------------- APPLICANT/TENANT
AND
MAWINGU INVESTMENTS LTD ------------------------------ RESPONDENT/LANDLORD

MEMORANDUM OF DEFENSE

1. The Tenant states that the Landlord breached Section 4 of the Landlord and Tenant Act (Cap 301) by issuing a rent increment notice without utilizing the statutory form.
2. The Tenant further points out that pursuant to Section 12 of the Landlord and Tenant Act, the landlord failed to maintain the premises in a tenantable and habitable condition, despite written requests dated 10th February 2026.
3. Consequently, the Tenant prays that the rent increment be declared null and void, and the eviction order be suspended.`,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);
  return map;
}

// Helper to save documents to file
function saveDocuments(map: Map<string, ScratchpadDocument[]>) {
  try {
    const obj: Record<string, ScratchpadDocument[]> = {};
    for (const [key, val] of map.entries()) {
      obj[key] = val;
    }
    fs.writeFileSync(DOCS_FILE, JSON.stringify(obj, null, 2), "utf8");
  } catch (err) {
    console.error("Error saving documents database:", err);
  }
}

// Helper to load chat sessions from file
function loadChatSessions(): ChatSession[] {
  try {
    if (fs.existsSync(CHATS_FILE)) {
      const data = fs.readFileSync(CHATS_FILE, "utf8");
      const loaded = JSON.parse(data);
      if (Array.isArray(loaded)) {
        return loaded;
      }
    }
  } catch (err) {
    console.error("Error loading chat sessions database:", err);
  }
  return [];
}

// Helper to save chat sessions to file
function saveChatSessions(sessionsList: ChatSession[]) {
  try {
    fs.writeFileSync(CHATS_FILE, JSON.stringify(sessionsList, null, 2), "utf8");
  } catch (err) {
    console.error("Error saving chat sessions database:", err);
  }
}

// Initialize persistent databases
const users: Array<User & { passwordHash: string }> = loadUsers();
const lawyerDocuments: Map<string, ScratchpadDocument[]> = loadDocuments();
const chatSessions: ChatSession[] = loadChatSessions();

// Seed documents for counsel Onyango
lawyerDocuments.set("user-lawyer", [
  {
    id: "doc-1",
    title: "Draft Defense - Tenant Eviction Claim",
    content: `IN THE RENT RESTRICTION TRIBUNAL AT NAIROBI
TRIBUNAL CASE NO. RRT/504 OF 2026

BETWEEN:
JOHN KAMAU ------------------------------------------- APPLICANT/TENANT
AND
MAWINGU INVESTMENTS LTD ------------------------------ RESPONDENT/LANDLORD

MEMORANDUM OF DEFENSE

1. The Tenant states that the Landlord breached Section 4 of the Landlord and Tenant Act (Cap 301) by issuing a rent increment notice without utilizing the statutory form.
2. The Tenant further points out that pursuant to Section 12 of the Landlord and Tenant Act, the landlord failed to maintain the premises in a tenantable and habitable condition, despite written requests dated 10th February 2026.
3. Consequently, the Tenant prays that the rent increment be declared null and void, and the eviction order be suspended.`,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
]);

// Curated Kenyan Statutory Laws Database (representing Kenyan Legal Fetch Service dataset)
const lawsDatabase: LawCitation[] = [
  {
    id: "const-art2",
    actName: "The Constitution of Kenya 2010",
    section: "Article 2",
    title: "Supremacy of the Constitution",
    text: "This Constitution is the supreme law of the Republic and binds all persons and all State organs at both levels of government. No person may claim or exercise State authority except as authorised under this Constitution. Any law, including customary law, that is inconsistent with this Constitution is void to the extent of the inconsistency, and any act or omission in contravention of this Constitution is invalid.",
  },
  {
    id: "const-art27",
    actName: "The Constitution of Kenya 2010",
    section: "Article 27",
    title: "Equality and freedom from discrimination",
    text: "Every person is equal before the law and has the right to equal protection and equal benefit of the law. Equality includes the full and equal enjoyment of all rights and fundamental freedoms. Women and men have the right to equal treatment, including the right to equal opportunities in political, economic, cultural and social spheres. The State shall not discriminate directly or indirectly against any person on any ground, including race, sex, pregnancy, marital status, health status, ethnic or social origin, colour, age, disability, religion, conscience, belief, culture, dress, language or birth.",
  },
  {
    id: "const-art40",
    actName: "The Constitution of Kenya 2010",
    section: "Article 40",
    title: "Right to property",
    text: "Subject to Article 65, every person has the right, either individually or in association with others, to acquire and own property of any description and in any part of Kenya. The State shall not deprive a person of property of any description, or of any interest in or right over property of any description, unless the deprivation is for a public purpose and is carried out in accordance with this Constitution, prompt payment of full and just compensation is made, and any person who has an interest in, or right over, that property has a right of access to a court of law.",
  },
  {
    id: "const-art41",
    actName: "The Constitution of Kenya 2010",
    section: "Article 41",
    title: "Labour relations",
    text: "Every person has the right to fair labour practices. Every worker has the right to fair remuneration, to reasonable working conditions, to form, join or participate in the activities and programmes of a trade union, and to go on strike. Every employer has the right to form and join an employers' organisation, and to participate in the activities and programmes of an employers' organisation.",
  },
  {
    id: "const-art43",
    actName: "The Constitution of Kenya 2010",
    section: "Article 43",
    title: "Economic and social rights",
    text: "Every person has the right to the highest attainable standard of health, which includes the right to health care services, including reproductive health care; to accessible and adequate housing, and to reasonable standards of sanitation; to be free from hunger, and to have adequate food of acceptable quality; to clean and safe water in adequate quantities; to social security; and to education. A person shall not be denied emergency medical treatment.",
  },
  {
    id: "emp-sec5",
    actName: "The Employment Act, 2007",
    section: "Section 5",
    title: "Equality and discrimination",
    text: "An employer shall promote equal opportunity in employment and strive to eliminate discrimination in any employment policy or practice. An employer shall register and submit to the Director of Employment a report regarding discrimination patterns. No employer shall discriminate directly or indirectly against an employee or prospective employee on grounds of race, color, sex, language, religion, political or other opinion, nationality, ethnic or social origin, disability, pregnancy, mental status or HIV status.",
  },
  {
    id: "emp-sec26",
    actName: "The Employment Act, 2007",
    section: "Section 26",
    title: "Minimum conditions of employment",
    text: "This Part shall constitute basic minimum conditions of employment and shall apply to all employees. Any contract of service that provides for terms that are less favorable to the employee than the minimum conditions prescribed herein shall be deemed to be modified to conform to the statutory minimum conditions.",
  },
  {
    id: "emp-sec29",
    actName: "The Employment Act, 2007",
    section: "Section 29",
    title: "Maternity leave",
    text: "A female employee shall be entitled to three months' maternity leave with full pay. She shall give her employer not less than seven days' written notice of her intention to proceed on maternity leave. On expiry of maternity leave, she shall have the right to return to the job which she held immediately before her maternity leave or to a reasonably suitable job on terms and conditions which are not less favorable.",
  },
  {
    id: "emp-sec35",
    actName: "The Employment Act, 2007",
    section: "Section 35",
    title: "Termination of employment",
    text: "Where a contract of service is to be terminated, it shall be terminated as follows: (a) where the contract is for a period of less than a month, it may be terminated by either party on twenty-four hours' notice; (b) where the contract is a monthly contract, by not less than twenty-eight days' notice or payment in lieu of notice; (c) where the contract is for a fixed period or specific task, on expiry or completion.",
  },
  {
    id: "landlord-sec4",
    actName: "The Landlord and Tenant Act",
    section: "Section 4",
    title: "Restrictions on increasing rent and changing tenancy",
    text: "No landlord shall increase the rent of any premises, or alter any terms of tenancy, or evict a tenant without first serving a notice of increment or change in the prescribed statutory form, or by obtaining a corresponding consent from the tenant. Any dispute concerning rent increments or unilateral alterations shall be referred to the Rent Restriction Tribunal for adjudication.",
  },
  {
    id: "landlord-sec12",
    actName: "The Landlord and Tenant Act",
    section: "Section 12",
    title: "Landlord obligations to maintain premises",
    text: "It is an implied covenant in every tenancy agreement that the landlord is responsible for keeping the premises in a good state of repair and fit for human habitation. The landlord shall undertake structural repairs, water and drainage system maintenance, and common area upkeep. If the landlord fails, the tenant may seek remedy from the Tribunal, or seek authorization to repair and deduct costs from rent.",
  },
  {
    id: "landlord-sec15",
    actName: "The Landlord and Tenant Act",
    section: "Section 15",
    title: "Tenant obligations",
    text: "The tenant shall pay the rent on the dates and in the manner agreed. The tenant shall maintain the interior of the premises in a clean and tenantable condition, repair damage caused by direct negligence, and shall not assign, sublet, or part with possession of the premises without prior written consent from the landlord.",
  },
  {
    id: "penal-sec203",
    actName: "The Penal Code",
    section: "Section 203",
    title: "Murder",
    text: "Any person who of malice aforethought causes the death of another person by an unlawful act or omission is guilty of murder and shall, upon conviction, be sentenced to death, subject to constitutional guidelines on capital punishment and statutory reviews.",
  },
  {
    id: "penal-sec268",
    actName: "The Penal Code",
    section: "Section 268",
    title: "Theft defined",
    text: "A person who fraudulently and without claim of right takes anything capable of being stolen, or fraudulently converts to the use of any person other than the general or special owner thereof, steals that thing. A taking is deemed fraudulent if it is done with intent to permanently deprive the owner, or to use the thing as security, or to deal with it in a manner that cannot be resolved without risk of loss to the owner.",
  },
];

// Mock API service layer representing KenyanLegalFetchService
class KenyanLegalFetchService {
  static lookupLaws(query: string): LawCitation[] {
    const q = query.toLowerCase();
    const results: LawCitation[] = [];

    // Simple keyword mapping
    const keywords = [
      { terms: ["discrim", "equal", "fair", "tribe", "tribunal", "bias"], ids: ["const-art27", "emp-sec5", "landlord-sec4"] },
      { terms: ["fire", "dismiss", "terminat", "contract", "notice", "job", "work"], ids: ["emp-sec35", "emp-sec26", "const-art41"] },
      { terms: ["maternity", "pregnant", "birth", "baby", "leave"], ids: ["emp-sec29", "const-art27"] },
      { terms: ["rent", "landlord", "tenant", "evict", "house", "apartment", "lease"], ids: ["landlord-sec4", "landlord-sec12", "landlord-sec15"] },
      { terms: ["property", "land", "own", "house", "asset"], ids: ["const-art40"] },
      { terms: ["social", "health", "water", "food", "education", "rights"], ids: ["const-art43"] },
      { terms: ["labor", "remuneration", "strike", "union", "salary", "wage"], ids: ["const-art41", "emp-sec26"] },
      { terms: ["murder", "kill", "death"], ids: ["penal-sec203"] },
      { terms: ["theft", "steal", "stolen", "rob"], ids: ["penal-sec268"] },
    ];

    const matchedIds = new Set<string>();

    for (const kw of keywords) {
      if (kw.terms.some((term) => q.includes(term))) {
        kw.ids.forEach((id) => matchedIds.add(id));
      }
    }

    // Direct section matches e.g. "Article 27", "Section 5"
    if (q.includes("article 27") || q.includes("art 27")) matchedIds.add("const-art27");
    if (q.includes("article 2") || q.includes("art 2 ")) matchedIds.add("const-art2");
    if (q.includes("article 40") || q.includes("art 40")) matchedIds.add("const-art40");
    if (q.includes("article 41") || q.includes("art 41")) matchedIds.add("const-art41");
    if (q.includes("article 43") || q.includes("art 43")) matchedIds.add("const-art43");
    if (q.includes("section 5")) matchedIds.add("emp-sec5");
    if (q.includes("section 26")) matchedIds.add("emp-sec26");
    if (q.includes("section 29")) matchedIds.add("emp-sec29");
    if (q.includes("section 35")) matchedIds.add("emp-sec35");
    if (q.includes("section 4") || q.includes("rent restrictions")) matchedIds.add("landlord-sec4");
    if (q.includes("section 12") || q.includes("habitability") || q.includes("repair")) matchedIds.add("landlord-sec12");
    if (q.includes("section 15") || q.includes("tenant obligations")) matchedIds.add("landlord-sec15");
    if (q.includes("section 203") || q.includes("murder")) matchedIds.add("penal-sec203");
    if (q.includes("section 268") || q.includes("theft")) matchedIds.add("penal-sec268");

    // Retrieve full citation details
    matchedIds.forEach((id) => {
      const match = lawsDatabase.find((law) => law.id === id);
      if (match) results.push(match);
    });

    // Default to supremacy of the constitution and equality clause if no laws are matched
    if (results.length === 0) {
      const default1 = lawsDatabase.find((l) => l.id === "const-art2");
      const default2 = lawsDatabase.find((l) => l.id === "const-art27");
      if (default1) results.push(default1);
      if (default2) results.push(default2);
    }

    return results;
  }
}

// Authentication Middleware
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  const payload = verifyJwt(token);
  if (!payload) {
    return res.status(403).json({ error: "Invalid or expired session token" });
  }

  req.user = payload;
  next();
}

// -------------------------------------------------------------
// API ENDPOINTS
// -------------------------------------------------------------

// REGISTER
app.post("/api/auth/register", (req, res) => {
  const { email, password, fullName, role } = req.body;

  if (!email || !password || !fullName || !role) {
    return res.status(400).json({ error: "Please fill in all details." });
  }

  if (role !== "citizen" && role !== "lawyer") {
    return res.status(400).json({ error: "Invalid portal selection." });
  }

  const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: "User with this email already exists." });
  }

  const newUser = {
    id: "user-" + Math.random().toString(36).substr(2, 9),
    email: email.toLowerCase(),
    passwordHash: hashPassword(password),
    role: role as UserRole,
    fullName,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  saveUsers(users);

  // Generate JWT token (exp in 7 days)
  const token = signJwt({
    id: newUser.id,
    email: newUser.email,
    role: newUser.role,
    fullName: newUser.fullName,
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
  });

  res.status(201).json({
    user: {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      fullName: newUser.fullName,
      createdAt: newUser.createdAt,
    },
    token,
  });
});

// LOGIN
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Please provide email and password" });
  }

  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user || user.passwordHash !== hashPassword(password)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = signJwt({
    id: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
  });

  res.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      createdAt: user.createdAt,
    },
    token,
  });
});

// AUTH ME
app.get("/api/auth/me", authenticateToken, (req: any, res) => {
  const user = users.find((u) => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: "User profile not found" });
  }
  res.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      createdAt: user.createdAt,
    },
  });
});

// GET SEED/LAWS LIST
app.get("/api/laws", (req, res) => {
  res.json(lawsDatabase);
});

// DOCUMENT WORKSPACE (Lawyers only)
app.get("/api/documents", authenticateToken, (req: any, res) => {
  if (req.user.role !== "lawyer") {
    return res.status(403).json({ error: "Documents are only available in the Lawyer Workspace." });
  }
  const docs = lawyerDocuments.get(req.user.id) || [];
  res.json(docs);
});

app.post("/api/documents", authenticateToken, (req: any, res) => {
  if (req.user.role !== "lawyer") {
    return res.status(403).json({ error: "Documents are only available in the Lawyer Workspace." });
  }
  const { title, content, id } = req.body;

  if (!title) {
    return res.status(400).json({ error: "Document title is required" });
  }

  const userDocs = lawyerDocuments.get(req.user.id) || [];

  if (id) {
    // Edit existing doc
    const index = userDocs.findIndex((d) => d.id === id);
    if (index !== -1) {
      userDocs[index] = {
        ...userDocs[index],
        title,
        content,
        updatedAt: new Date().toISOString(),
      };
      lawyerDocuments.set(req.user.id, userDocs);
      saveDocuments(lawyerDocuments);
      return res.json(userDocs[index]);
    }
  }

  // Create new doc
  const newDoc: ScratchpadDocument = {
    id: "doc-" + Math.random().toString(36).substr(2, 9),
    title,
    content: content || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  userDocs.unshift(newDoc);
  lawyerDocuments.set(req.user.id, userDocs);
  saveDocuments(lawyerDocuments);
  res.status(201).json(newDoc);
});

app.delete("/api/documents/:id", authenticateToken, (req: any, res) => {
  if (req.user.role !== "lawyer") {
    return res.status(403).json({ error: "Documents are only available in the Lawyer Workspace." });
  }
  const docId = req.params.id;
  const userDocs = lawyerDocuments.get(req.user.id) || [];
  const filtered = userDocs.filter((d) => d.id !== docId);
  lawyerDocuments.set(req.user.id, filtered);
  saveDocuments(lawyerDocuments);
  res.json({ success: true });
});

// CHAT SESSIONS PERSISTENCE
app.get("/api/chat/sessions", authenticateToken, (req: any, res) => {
  const userSessions = chatSessions.filter(
    (s) => s.userId === req.user.id && s.role === req.user.role
  );
  res.json(userSessions);
});

app.post("/api/chat/sessions", authenticateToken, (req: any, res) => {
  const { id, title, messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Messages list is required." });
  }

  const existingIndex = chatSessions.findIndex((s) => s.id === id && s.userId === req.user.id);
  if (existingIndex !== -1) {
    // Update existing session
    chatSessions[existingIndex] = {
      ...chatSessions[existingIndex],
      title: title || chatSessions[existingIndex].title,
      messages,
      updatedAt: new Date().toISOString(),
    };
    saveChatSessions(chatSessions);
    return res.json(chatSessions[existingIndex]);
  } else {
    // Create new session
    const newSession: ChatSession = {
      id: id || "session-" + Math.random().toString(36).substr(2, 9),
      userId: req.user.id,
      title: title || (messages[0]?.content ? (messages[0].content.slice(0, 40) + (messages[0].content.length > 40 ? "..." : "")) : "New Conversation"),
      role: req.user.role,
      messages,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    chatSessions.unshift(newSession);
    saveChatSessions(chatSessions);
    return res.status(201).json(newSession);
  }
});

app.delete("/api/chat/sessions/:id", authenticateToken, (req: any, res) => {
  const sessionId = req.params.id;
  const index = chatSessions.findIndex((s) => s.id === sessionId && s.userId === req.user.id);
  if (index !== -1) {
    chatSessions.splice(index, 1);
    saveChatSessions(chatSessions);
    return res.json({ success: true });
  }
  res.status(404).json({ error: "Session not found." });
});

// PARSE PDF ENDPOINT
app.post("/api/parse-pdf", authenticateToken, async (req: any, res) => {
  const { pdfData } = req.body;

  if (!pdfData) {
    return res.status(400).json({ error: "Missing pdfData base64 payload" });
  }

  try {
    const pdfPart = {
      inlineData: {
        mimeType: "application/pdf",
        data: pdfData,
      },
    };

    const textPart = {
      text: "Please extract all text content from this document verbatim. Do not write summaries, intros, or descriptions; just return the text found inside the document. Preserve layout, headings, and lists as best as possible.",
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [pdfPart, textPart] },
    });

    res.json({ text: response.text || "" });
  } catch (error: any) {
    console.error("PDF Parsing Error:", error);
    res.status(500).json({ error: error.message || "Failed to extract text from PDF" });
  }
});

// STREAMING LEGAL CHAT ENDPOINT
app.post("/api/chat", authenticateToken, async (req: any, res) => {
  const { messages } = req.body;
  const userRole: UserRole = req.user.role;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Invalid chat history payload" });
  }

  const lastMessage = messages[messages.length - 1];
  const queryText = lastMessage.content;

  // 1. Look up real citations using KenyanLegalFetchService
  const citations = KenyanLegalFetchService.lookupLaws(queryText);

  // 2. Format grounding text context for prompt
  const groundingContext = citations
    .map(
      (c) =>
        `--- CITATION RECORD: ${c.actName} (${c.section}) ---\nTitle: ${c.title}\nVerbatim Content: ${c.text}`
    )
    .join("\n\n");

  // 3. Define customized persona instructions
  let systemInstruction = "";

  if (userRole === "citizen") {
    systemInstruction = `
You are "Jua Sheria", a Swahili-accented, warm, and friendly legal information chatbot for Kenyan citizens.
Your job is to translate complex statutory legal terms and codes of Kenya into clear, plain, and conversational Swahili-English (Sheng and plain English elements are encouraged but keep the core language professional yet easy to understand).

Key Directives:
- Use clear analogies (e.g., relating lease agreements to household terms, or labor laws to daily workplace scenarios in Kenya).
- Absolutely omit heavy legalese (like "inter alia", "mutatis mutandis") or define it immediately inline with simpler terms.
- NEVER offer official formal attorney-client legal advice. Explicitly state that you provide helpful legal information for awareness only, not attorney-client service.
- Structure your advice in clear, beautiful bullet points with bold steps.
- When referring to a specific law chunk provided in your context, cite it strictly as "[Citation: Article X of the Constitution of Kenya 2010]" or "[Citation: Section X of the Employment Act, 2007]" or "[Citation: Section X of the Landlord and Tenant Act]". This allows our frontend to make it clickable.
- Rely ONLY on the verified Kenyan legal context provided below. If you don't know something or it is not covered, explain simply that you lack records for that specific section but suggest where they can look (e.g. Huduma Centres or Rent Tribunals).

VERIFIED KENYAN LEGAL GROUNDING CONTEXT:
${groundingContext}
`;
  } else if (userRole === "lawyer") {
    systemInstruction = `
You are "Jua Sheria - Counsel Workspace", an advanced, precise legal brainstorming and research assistant for Kenyan attorneys.
Your job is to assist Counsel with complex statutory analysis, evaluating elements of proof, drafting, litigation strategy, and legal brainstorming.

Key Directives:
- Use formal, precise Kenyan legal terminology. Refer to relevant precedents, procedures, and statutory interpretations of Kenya.
- Detail the elements of proof needed to succeed in litigation for the client's position.
- Critically evaluate potential adversarial counter-arguments and defenses Counsel should prepare for.
- Structure your responses with clear headings, bold statutory terms, and legal sections, ready to be copied directly into the lawyer's scratchpad workspace.
- Include precise, specific statutory citation tags like "[Citation: Section X of the Employment Act, 2007]" or "[Citation: Article X of the Constitution of Kenya 2010]" or "[Citation: Section X of the Landlord and Tenant Act]" so the frontend can display clickable visual badges of the verbatim text.
- Do NOT use generic advice. Dive deep into the grounding context provided below.

VERIFIED KENYAN LEGAL GROUNDING CONTEXT:
${groundingContext}
`;
  }

  // 4. Start Event Stream response
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Send the matched citations list to the frontend first so it can register them immediately
  res.write(`event: citations\ndata: ${JSON.stringify(citations)}\n\n`);

  try {
    // Map conversation messages to the format required by `@google/genai`
    // Convert message list into Gemini content format
    const geminiContents = messages.map((m) => {
      return {
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      };
    });

    // Request stream from Gemini
    const chatStream = await ai.models.generateContentStream({
      model: "gemini-3.5-flash",
      contents: geminiContents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.2, // Low temperature for high factual accuracy in legal queries
      },
    });

    for await (const chunk of chatStream) {
      if (chunk.text) {
        // Send the chunk text as standardized SSE data
        res.write(`event: chunk\ndata: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }

    res.write("event: end\ndata: {}\n\n");
    res.end();
  } catch (error: any) {
    console.error("Gemini stream error:", error);
    res.write(`event: error\ndata: ${JSON.stringify({ error: error.message || "Unknown server error" })}\n\n`);
    res.end();
  }
});

// AGGRESSIVE ARGUMENT CRITIQUE ENDPOINT (for lawyers)
app.post("/api/critique", authenticateToken, async (req: any, res) => {
  const { argument } = req.body;
  const userRole: UserRole = req.user.role;

  if (!argument || typeof argument !== "string" || argument.trim().length === 0) {
    return res.status(400).json({ error: "Please provide a legal argument to critique." });
  }

  // Only lawyers can use the critique feature
  if (userRole !== "lawyer") {
    return res.status(403).json({ error: "Critique feature is reserved for advocates." });
  }

  // Look up related laws for context
  const citations = KenyanLegalFetchService.lookupLaws(argument);

  const groundingContext = citations
    .map(
      (c) =>
        `--- CITATION RECORD: ${c.actName} (${c.section}) ---\nTitle: ${c.title}\nVerbatim Content: ${c.text}`
    )
    .join("\n\n");

  const critiqueSystemInstruction = `
You are **Jua Sheria - Aggressive Critique Engine** for Kenyan Advocates. Your role is to RUTHLESSLY critique legal arguments, pointing out:

1. **CRITICAL GAPS IN EVIDENCE**: What facts are missing? What assumptions are unfounded? What documentation should have been provided but is absent?
2. **WEAK LEGAL POSITIONS**: Which statutory provisions contradict or undermine the argument? Are there case precedents that work against this position?
3. **ADVERSARIAL COUNTER-ARGUMENTS**: How will opposing counsel tear this apart in a Kenyan court? What procedural defects exist? What standing issues might arise?
4. **EVIDENTIARY WEAKNESSES**: Which claims lack proper legal foundation under Kenyan evidence law? What chain-of-custody or authentication problems exist?
5. **SENTENCING OR REMEDIAL GAPS**: If applicable, what remedies are being sought that may be unavailable? What statutory limits apply?

Your critique should be **AGGRESSIVE, SPECIFIC, AND PRACTICAL**—as if you are a senior opposing counsel preparing to demolish this argument in court.

Finally, suggest ONE CONCRETE REVISION the advocate should make immediately.

VERIFIED KENYAN LEGAL GROUNDING CONTEXT (use this to ground your critique):
${groundingContext}
`;

  // Start Event Stream response
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const critiqueStream = await ai.models.generateContentStream({
      model: "gemini-3.5-flash",
      contents: {
        parts: [
          {
            text: `ARGUMENT TO CRITIQUE:\n\n${argument}`,
          },
        ],
      },
      config: {
        systemInstruction: critiqueSystemInstruction,
        temperature: 0.7, // Slightly higher temperature to encourage creative adversarial thinking
      },
    });

    for await (const chunk of critiqueStream) {
      if (chunk.text) {
        res.write(`event: chunk\ndata: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }

    res.write("event: end\ndata: {}\n\n");
    res.end();
  } catch (error: any) {
    console.error("Critique stream error:", error);
    res.write(`event: error\ndata: ${JSON.stringify({ error: error.message || "Critique engine failed" })}\n\n`);
    res.end();
  }
});

// -------------------------------------------------------------
// VITE AND STATIC ASSET SERVING MIDDLEWARE
// -------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Jua Sheria Server] Running full-stack service on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
