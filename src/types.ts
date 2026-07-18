/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = "citizen" | "lawyer";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LawCitation {
  id: string;
  actName: string;      // e.g., "The Constitution of Kenya 2010"
  section: string;      // e.g., "Section 27" or "Article 41"
  title: string;        // e.g., "Equality and freedom from discrimination"
  text: string;         // The full verbatim text chunk of that law
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  citations?: LawCitation[]; // Relevant citations embedded or found in this query
}

export interface ScratchpadDocument {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  role: UserRole;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

