// Export integrations for Notion, Obsidian, and Kindle

export async function exportToNotion(summary, title, url, apiKey) {
  if (!apiKey) {
    return { error: 'Notion API key not configured. Add it in Settings.' };
  }

  // Find or create a Fleavi page in Notion
  try {
    // Search for existing Fleavi database or page
    const searchRes = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: 'Fleavi Summaries',
        filter: { value: 'database', property: 'object' }
      })
    });

    const searchData = await searchRes.json();
    let databaseId;

    if (searchData.results?.length > 0) {
      databaseId = searchData.results[0].id;
    } else {
      // Create a new page as a simple document
      const createRes = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          parent: { type: 'page_id', page_id: await findTopLevelPage(apiKey) },
          properties: {
            title: [{ text: { content: `Fleavi: ${title || 'Untitled'}` } }]
          },
          children: [
            {
              object: 'block',
              type: 'bookmark',
              bookmark: { url: url || 'https://example.com' }
            },
            {
              object: 'block',
              type: 'paragraph',
              paragraph: {
                rich_text: [{ text: { content: summary.slice(0, 2000) } }]
              }
            }
          ]
        })
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        return { error: `Notion API error: ${err.message || createRes.status}` };
      }

      return { success: true, url: (await createRes.json()).url };
    }

    // Add to existing database
    const pageRes = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties: {
          Name: { title: [{ text: { content: title || 'Untitled' } }] },
          URL: { url: url || null },
          'Date': { date: { start: new Date().toISOString().split('T')[0] } }
        },
        children: [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ text: { content: summary.slice(0, 2000) } }]
            }
          }
        ]
      })
    });

    if (!pageRes.ok) {
      const err = await pageRes.json();
      return { error: `Notion API error: ${err.message || pageRes.status}` };
    }

    const pageData = await pageRes.json();
    return { success: true, url: pageData.url };
  } catch (err) {
    return { error: `Notion export failed: ${err.message}` };
  }
}

async function findTopLevelPage(apiKey) {
  const res = await fetch('https://api.notion.com/v1/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      filter: { value: 'page', property: 'object' },
      page_size: 1
    })
  });
  const data = await res.json();
  return data.results?.[0]?.id;
}

export function exportToObsidian(summary, title, vaultName) {
  // Obsidian URI scheme: obsidian://new?vault=VAULT&name=TITLE&content=CONTENT
  const vault = vaultName || 'MyVault';
  const fileName = (title || 'Fleavi Summary').replace(/[\/\\:*?"<>|]/g, '-').slice(0, 100);
  const content = `# ${title || 'Summary'}\n\n${summary}\n\n---\n*Summarized by Fleavi on ${new Date().toLocaleDateString()}*\n*Source: ${window.location?.href || 'N/A'}*`;

  const uri = `obsidian://new?vault=${encodeURIComponent(vault)}&name=${encodeURIComponent(fileName)}&content=${encodeURIComponent(content)}`;
  return uri;
}

export function exportToKindle(summary, title, kindleEmail) {
  if (!kindleEmail) {
    return { error: 'Kindle email not configured. Add it in Settings.' };
  }

  // Create a mailto link with the summary as body
  const subject = `Fleavi: ${title || 'Summary'}`;
  const body = `${title || 'Summary'}\n\n${summary}\n\n---\nSummarized by Fleavi`;
  const mailto = `mailto:${kindleEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return { mailto };
}

export async function exportToReadwise(summary, title, url, apiKey) {
  if (!apiKey) {
    return { error: 'Readwise API key not configured.' };
  }

  try {
    const res = await fetch('https://readwise.io/api/v3/highlights/', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        highlights: [{
          text: summary.slice(0, 2096),
          title: title || 'Untitled',
          source_url: url || '',
          category: 'articles'
        }]
      })
    });

    if (!res.ok) {
      return { error: `Readwise API error: ${res.status}` };
    }

    return { success: true };
  } catch (err) {
    return { error: `Readwise export failed: ${err.message}` };
  }
}
