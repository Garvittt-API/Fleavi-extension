export function renderMarkdown(text) {
  if (!text) return '';

  return text
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`(.+?)`/g, '<code>$1</code>')
    // Source citations: [source: N] -> clickable link
    .replace(/\[source:\s*(\d+)\]/g, '<a class="source-link" data-source="$1" title="Jump to source paragraph">[$1]</a>')
    // Headers
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Wrap consecutive <li> in <ul>
    .replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>')
    // Line breaks
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>');
}

export function extractSources(text) {
  if (!text) return [];
  const sources = [];
  const regex = /\[source:\s*(\d+)\]/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    sources.push(parseInt(match[1], 10));
  }
  return [...new Set(sources)];
}

export function truncateText(text, maxLength = 200) {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

export function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function plainTextToMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/^#{3}\s/gm, '### ')
    .replace(/^#{2}\s/gm, '## ')
    .replace(/^#\s/gm, '# ')
    .replace(/^\s*[-*]\s/gm, '- ')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .trim();
}
