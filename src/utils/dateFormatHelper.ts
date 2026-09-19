// Helper to format date display cleanly
export const formatCleanExamDate = (dayName?: string, dateDisplay?: string): string => {
  if (!dateDisplay && !dayName) return '-';
  if (!dateDisplay) return dayName || '';
  if (!dayName) return dateDisplay;
  
  // If dateDisplay already starts with dayName (e.g., "Senin, 24 Agustus 2026"), avoid repeating dayName
  if (dateDisplay.toLowerCase().startsWith(dayName.toLowerCase())) {
    return dateDisplay;
  }
  
  return `${dayName}, ${dateDisplay}`;
};
