const stripMarkdown = (text: string | null | undefined): string => {
  if (!text) return ""
  return text
    .replace(/^#{1,6}\s+/gm, "")           // headers
    .replace(/\*{3,}/g, "")               // hr-like ***
    .replace(/_{3,}/g, "")               // hr-like ___
    .replace(/-{3,}/g, "")               // hr-like ---
    .replace(/`{3}[\s\S]*?`{3}/g, " ")    // code blocks
    .replace(/\*\*(.+?)\*\*/g, "$1")      // bold
    .replace(/_{2}(.+?)_{2}/g, "$1")     // underline bold
    .replace(/\*(.+?)\*/g, "$1")         // italic
    .replace(/`(.+?)`/g, "$1")           // inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")   // images
    .replace(/\|\s*/g, " ")                // table cell separators
    .replace(/^>\s+/gm, "")              // blockquotes
    .replace(/^\s*[-*+]\s+/gm, "")       // list markers
    .replace(/^\s*\d+\.\s+/gm, "")       // numbered lists
    .replace(/^\s+/gm, "")               // leading whitespace
    .replace(/\n{3,}/g, "\n\n")          // excess newlines
    .replace(/\s{2,}/g, " ")             // multiple spaces
    .trim()
}

export { stripMarkdown }