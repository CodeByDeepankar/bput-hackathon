/**
 * Context Builder Utility for DeepBot AI Chatbot
 * 
 * Safely extracts non-sensitive user authentication details and website page context 
 * to personalize AI chatbot responses (e.g., answering "What is my name?").
 */

export function buildUserContext(clerkUser, extraProfile = {}, pageContext = {}) {
  // Retrieve authenticated user's name dynamically from Clerk or DB profile
  const name =
    clerkUser?.fullName ||
    (clerkUser?.firstName && clerkUser?.lastName
      ? `${clerkUser.firstName} ${clerkUser.lastName}`
      : clerkUser?.firstName) ||
    extraProfile?.name ||
    "";

  // Retrieve non-sensitive profile details
  const email =
    clerkUser?.primaryEmailAddress?.emailAddress ||
    extraProfile?.email ||
    "";

  const userId = clerkUser?.id || extraProfile?.userId || extraProfile?.user_id || "";

  const userClass =
    clerkUser?.publicMetadata?.year ||
    extraProfile?.class ||
    "";

  const branch =
    clerkUser?.publicMetadata?.branch ||
    extraProfile?.branch ||
    "";

  const role = extraProfile?.role || "student";

  const language = pageContext?.language || "English";
  const currentRoute =
    pageContext?.route ||
    (typeof window !== "undefined" ? window.location.pathname : "");

  return {
    userId,
    name: name ? String(name).trim() : "",
    email: email ? String(email).trim() : "",
    role,
    class: userClass,
    branch,
    language,
    currentRoute,
    selectedSubject: pageContext?.selectedSubject || null,
    selectedCourse: pageContext?.selectedCourse || null,
    learningProgress: pageContext?.learningProgress || null,
  };
}

/**
 * Constructs a prompt combining System Context and User Question.
 */
export function formatPromptWithContext(userMessage, context = {}) {
  const contextLines = [];

  if (context?.name) {
    contextLines.push(`- Currently Logged-in User's Name: ${context.name}`);
  } else {
    contextLines.push(`- Currently Logged-in User: Unauthenticated / Guest (Not logged in)`);
  }

  if (context?.email) contextLines.push(`- Email: ${context.email}`);
  if (context?.role) contextLines.push(`- Role: ${context.role}`);
  if (context?.branch) contextLines.push(`- Branch: ${context.branch}`);
  if (context?.class) contextLines.push(`- Class / Year: ${context.class}`);
  if (context?.currentRoute) contextLines.push(`- Current Website Page: ${context.currentRoute}`);
  if (context?.selectedSubject) contextLines.push(`- Selected Subject: ${context.selectedSubject}`);
  if (context?.selectedCourse) contextLines.push(`- Selected Course: ${context.selectedCourse}`);

  const systemContextStr = contextLines.length
    ? `[System Context:\n${contextLines.join("\n")}\n]\n\n`
    : "";

  return `${systemContextStr}User Question: ${userMessage}`;
}
