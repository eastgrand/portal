// This utility will help us differentiate between normal links and PDF links
export function isPdfUrl(url: string): boolean {
  return url.toLowerCase().endsWith('.pdf');
}
