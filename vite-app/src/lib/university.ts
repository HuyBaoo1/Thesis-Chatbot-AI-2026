export const universityName =
  import.meta.env.VITE_UNIVERSITY_NAME || "DATA_REQUIRED"

export const universityShortName =
  import.meta.env.VITE_UNIVERSITY_SHORT_NAME || universityName

export const universityWebsite =
  import.meta.env.VITE_UNIVERSITY_WEBSITE || "#"

export const universityLabel =
  universityShortName &&
  universityName &&
  universityShortName.toLowerCase() !== universityName.toLowerCase()
    ? `${universityName} (${universityShortName})`
    : universityName || universityShortName || "configured university"
