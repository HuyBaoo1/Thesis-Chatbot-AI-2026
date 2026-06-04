export const LEAD_STATUS = {
  NEW: "NEW",
  CONTACTED: "CONTACTED",
  QUALIFIED: "QUALIFIED",
  APPLIED: "APPLIED",
  ENROLLED: "ENROLLED",
  LOST: "LOST",
};

export const LEAD_TEMPERATURE = {
  HOT: "HOT",
  WARM: "WARM",
  COLD: "COLD",
};

export const ADMISSION_STAGE = {
  NEW: "NEW",
  PROFILE_SUBMITTED: "PROFILE_SUBMITTED",
  DOCUMENT_REVIEW: "DOCUMENT_REVIEW",
  INTERVIEW: "INTERVIEW",
  OFFER_EXTENDED: "OFFER_EXTENDED",
  ENROLLED: "ENROLLED",
  REJECTED: "REJECTED",
};

export const STAFF_ROLE = {
  ADMIN: "ADMIN",
  COUNSELOR: "COUNSELOR",
};

export const CONVERSATION_STATUS = {
  OPEN: "OPEN",
  HANDOFF: "HANDOFF",
  CLOSED: "CLOSED",
};

export const ROUTES = {
  LOGIN: "/login",
  DASHBOARD: "/dashboard",
  LEADS: "/leads",
  LEAD_DETAIL: "/leads/:id",
  APPLICATIONS: "/applications",
  APPLICATION_DETAIL: "/applications/:id",
  CHAT_INBOX: "/chat/inbox",
  CONVERSATION: "/chat/:id",
  NOTIFICATIONS: "/notifications",
  STAFF: "/staff",
  MAJORS: "/majors",
  SCHOLARSHIPS: "/scholarships",
  TUITION: "/tuition",
  KNOWLEDGE: "/knowledge",
  ANALYTICS: "/analytics",
  PROFILE: "/profile",
};

export const STATUS_COLORS = {
  [LEAD_STATUS.NEW]: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  [LEAD_STATUS.CONTACTED]: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  [LEAD_STATUS.QUALIFIED]: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  [LEAD_STATUS.APPLIED]: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  [LEAD_STATUS.ENROLLED]: "bg-green-500/20 text-green-400 border-green-500/30",
  [LEAD_STATUS.LOST]: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

export const TEMPERATURE_COLORS = {
  [LEAD_TEMPERATURE.HOT]: "bg-red-500/20 text-red-400 border-red-500/30",
  [LEAD_TEMPERATURE.WARM]: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  [LEAD_TEMPERATURE.COLD]: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

export const STAGE_COLORS = {
  [ADMISSION_STAGE.NEW]: "bg-blue-500/20 text-blue-400",
  [ADMISSION_STAGE.PROFILE_SUBMITTED]: "bg-indigo-500/20 text-indigo-400",
  [ADMISSION_STAGE.DOCUMENT_REVIEW]: "bg-purple-500/20 text-purple-400",
  [ADMISSION_STAGE.INTERVIEW]: "bg-amber-500/20 text-amber-400",
  [ADMISSION_STAGE.OFFER_EXTENDED]: "bg-orange-500/20 text-orange-400",
  [ADMISSION_STAGE.ENROLLED]: "bg-green-500/20 text-green-400",
  [ADMISSION_STAGE.REJECTED]: "bg-red-500/20 text-red-400",
};

export const MAJOR_TYPE = {
  UNDERGRAD_MAJOR: "UNDERGRAD_MAJOR",
  GRAD_MAJOR: "GRAD_MAJOR",
  CERTIFICATE_PROGRAM: "CERTIFICATE_PROGRAM",
};
