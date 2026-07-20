// ── Auth ─────────────────────────────────────────────────────────────────────
export interface User {
  id: string
  name: string
  email: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
}

// ── Session ───────────────────────────────────────────────────────────────────
export interface PodcastSession {
  id: string
  project_name: string
  current_stage: number
  current_section: number
  data: Record<string, unknown>
  created_at: string
  updated_at: string
}

// ── Wizard ────────────────────────────────────────────────────────────────────
export type WizardView = "splash" | "auth" | "home" | "wizard"

export type AITask = "research" | "draft1" | "draft2" | "polish" | "production" | "titles"

export type AIStatus = "idle" | "loading" | "streaming" | "done" | "error"

export interface AIState {
  status: AIStatus
  content: string
  model?: string
  error?: string
}

// ── Podcast data constants ────────────────────────────────────────────────────
export const PODCAST_TYPES = [
  "Investigative Reporting", "True Crime", "News", "Current Events",
  "Documentary", "Historical", "Educational", "Interview",
  "Solo Commentary", "Opinion", "Political", "Technology",
  "Science", "Business", "Finance", "Health", "Biography",
  "Narrative Storytelling", "Fiction", "Audio Drama", "Comedy",
  "Sports", "Entertainment", "Music", "Gaming",
  "Religion and Spirituality", "Society and Culture", "Personal Story",
  "Product Review", "How-To", "Panel Discussion", "Custom",
] as const

export const RUNTIME_OPTIONS = [
  "5 minutes", "10 minutes", "15 minutes", "20 minutes",
  "30 minutes", "45 minutes", "60 minutes", "90 minutes", "Custom",
] as const

export const TONE_OPTIONS = [
  "Conversational", "Serious", "Investigative", "Objective",
  "Emotional", "Dramatic", "Suspenseful", "Educational",
  "Professional", "Humorous", "Inspirational", "Documentary",
  "News-style", "Casual", "Reflective", "Cinematic", "Let AI decide",
] as const

export const CRIME_TYPES = [
  "Murder", "Attempted Murder", "Missing Person", "Kidnapping",
  "Robbery", "Fraud", "Organized Crime", "Unsolved Case",
  "Wrongful Conviction", "Other",
] as const

export const CASE_STATUS_OPTIONS = ["Solved", "Unsolved", "Disputed", "Unknown"] as const

export const PODCAST_SUB_TYPES: Record<string, string[]> = {
  "Investigative Reporting": ["Corporate Corruption", "Government Misconduct", "Environmental Investigation", "Financial Fraud", "Social Justice", "Healthcare Investigation", "Tech Industry", "Education System", "Housing and Real Estate", "Other"],
  "True Crime": ["Murder", "Attempted Murder", "Missing Person", "Kidnapping", "Robbery", "Fraud", "Organized Crime", "Unsolved Case", "Wrongful Conviction", "Other"],
  "News": ["Breaking News", "Political", "International", "Local", "Business", "Technology", "Science", "Health", "Other"],
  "Current Events": ["Social Issues", "Political Analysis", "Economic News", "International Affairs", "Cultural Trends", "Other"],
  "Documentary": ["Historical", "Social", "Environmental", "Biography", "Cultural", "Crime", "Political", "Science", "Other"],
  "Historical": ["Ancient History", "Medieval", "Modern History", "War & Conflict", "Cultural History", "Political History", "Economic History", "Other"],
  "Educational": ["Science", "History", "Technology", "Arts", "Language", "Mathematics", "Social Studies", "Life Skills", "Other"],
  "Interview": ["Celebrity", "Expert/Professional", "Author", "Activist", "Entrepreneur", "Athlete", "Artist", "Politician", "Other"],
  "Solo Commentary": ["Opinion", "Analysis", "Lifestyle", "Personal Development", "Humor", "Cultural Commentary", "Other"],
  "Opinion": ["Political", "Social", "Cultural", "Technology", "Economic", "Other"],
  "Political": ["Conservative", "Liberal", "Centrist", "International", "Policy Analysis", "Election Coverage", "Other"],
  "Technology": ["AI & Machine Learning", "Software Development", "Consumer Tech", "Cybersecurity", "Startups", "Gaming", "Blockchain", "Other"],
  "Science": ["Physics", "Biology", "Chemistry", "Astronomy", "Environmental Science", "Medicine", "Psychology", "Other"],
  "Business": ["Entrepreneurship", "Management", "Marketing", "Finance", "Real Estate", "Startups", "Corporate", "Other"],
  "Finance": ["Personal Finance", "Investing", "Cryptocurrency", "Real Estate", "Economic Analysis", "Other"],
  "Health": ["Mental Health", "Fitness", "Nutrition", "Medical", "Wellness", "Other"],
  "Biography": ["Historical Figures", "Contemporary Figures", "Artists", "Scientists", "Politicians", "Athletes", "Other"],
  "Narrative Storytelling": ["Personal Stories", "Fiction", "Historical Narrative", "Adventure", "Mystery", "Other"],
  "Fiction": ["Thriller", "Mystery", "Science Fiction", "Fantasy", "Horror", "Romance", "Drama", "Other"],
  "Audio Drama": ["Thriller", "Mystery", "Sci-Fi", "Fantasy", "Historical", "Comedy", "Other"],
  "Comedy": ["Stand-Up", "Sketch", "Improv", "Political Satire", "Observational", "Other"],
  "Sports": ["Football", "Basketball", "Baseball", "Soccer", "Tennis", "Golf", "Combat Sports", "Other"],
  "Entertainment": ["Movies & TV", "Music", "Celebrity", "Pop Culture", "Awards", "Other"],
  "Music": ["Rock", "Pop", "Hip-Hop", "Country", "Classical", "Jazz", "Electronic", "Other"],
  "Gaming": ["Video Games", "Board Games", "Game Reviews", "Industry News", "Esports", "Other"],
  "Religion and Spirituality": ["Christianity", "Islam", "Judaism", "Buddhism", "Hinduism", "Spirituality", "Philosophy", "Other"],
  "Society and Culture": ["Social Issues", "Cultural Trends", "Demographics", "Anthropology", "Other"],
  "Personal Story": ["Life Experience", "Travel", "Relationships", "Career", "Health Journey", "Other"],
  "Product Review": ["Tech Products", "Books", "Movies", "Services", "Consumer Goods", "Other"],
  "How-To": ["DIY", "Cooking", "Technology", "Finance", "Career", "Relationships", "Other"],
  "Panel Discussion": ["Politics", "Technology", "Culture", "Business", "Society", "Science", "Other"],
  "Custom": ["Custom"],
}

export const STAGE_NAMES: Record<number, string> = {
  1: "Brainstorm",
  2: "Intake Review",
  3: "Research",
  4: "Research Review",
  5: "Draft 1",
  6: "Draft 1 Review",
  7: "Draft 2",
  8: "Draft 2 Review",
  9: "Final Polish",
  10: "Script Review",
  11: "Production Blocks",
  12: "Export",
}

export const TOTAL_STEPS = 13 // 2 brainstorm sections + 11 stages

export function isTrueCrime(podcastType?: string): boolean {
  return (podcastType || "").toLowerCase().includes("true crime")
}

export function getStepNumber(stage: number, section: number): number {
  if (stage === 1) return section + 1
  return 2 + (stage - 1)
}
