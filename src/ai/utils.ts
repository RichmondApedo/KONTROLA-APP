/**
 * Robustly extracts a JSON object or array from a markdown-formatted AI response.
 */
export function extractJsonFromText(text: string): string {
  let rawText = text.trim();
  
  // Strip markdown code fences if present
  const match = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (match && match[1]) {
    rawText = match[1].trim();
  }
  
  // Isolate the outermost JSON object or array
  const startObj = rawText.indexOf('{');
  const startArr = rawText.indexOf('[');
  
  let start = -1;
  if (startObj !== -1 && startArr !== -1) {
    start = Math.min(startObj, startArr);
  } else if (startObj !== -1) {
    start = startObj;
  } else {
    start = startArr;
  }
  
  if (start !== -1) {
    const isObj = rawText[start] === '{';
    const endChar = isObj ? '}' : ']';
    const end = rawText.lastIndexOf(endChar);
    
    if (end !== -1 && end >= start) {
      return rawText.substring(start, end + 1);
    }
  }
  
  return rawText;
}
