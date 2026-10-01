import { ActionItem, Workspace } from '../../types.js';

export interface NotionCreatePageResult {
  pageId: string;
  pageUrl: string;
  isMock: boolean;
}

export class NotionAdapter {
  public async testConnection(config: {
    apiKey?: string;
    databaseId?: string;
    isMockMode?: boolean;
  }): Promise<{ success: boolean; message: string; databaseTitle?: string }> {
    if (config.isMockMode || !config.apiKey || !config.databaseId) {
      return {
        success: true,
        message: 'Connected successfully to Notion Mock Adapter (Database: Engineering Backlog)',
        databaseTitle: 'Engineering Backlog (Mock)',
      };
    }

    try {
      const dbId = config.databaseId.replace(/-/g, '');
      const res = await fetch(`https://api.notion.com/v1/databases/${dbId}`, {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const errorText = await res.text();
        return {
          success: false,
          message: `Notion database verification failed (${res.status}): ${errorText.slice(0, 150)}`,
        };
      }

      const data = (await res.json()) as any;
      const title = data.title?.[0]?.plain_text || 'Notion Database';
      return {
        success: true,
        message: `Successfully connected to Notion database: "${title}"`,
        databaseTitle: title,
      };
    } catch (e: any) {
      return {
        success: false,
        message: `Network error connecting to Notion: ${e.message}`,
      };
    }
  }

  public async createPage(params: {
    action: ActionItem;
    workspace: Workspace;
    meetingTitle: string;
    notionConfig: {
      apiKey?: string;
      databaseId: string;
      titleProperty?: string;
      statusProperty?: string;
      priorityProperty?: string;
      dueDateProperty?: string;
      isMockMode?: boolean;
    };
  }): Promise<NotionCreatePageResult> {
    const { action, notionConfig } = params;

    if (notionConfig.isMockMode || !notionConfig.apiKey || !notionConfig.databaseId) {
      const mockId = Math.random().toString(36).substring(2, 10);
      return {
        pageId: `notion-page-${mockId}`,
        pageUrl: `https://notion.so/acme-workspace/${mockId}`,
        isMock: true,
      };
    }

    const dbId = notionConfig.databaseId.replace(/-/g, '');
    const titleKey = notionConfig.titleProperty || 'Name';

    const properties: any = {
      [titleKey]: {
        title: [
          {
            text: {
              content: action.title.slice(0, 200),
            },
          },
        ],
      },
    };

    if (action.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(action.dueDate)) {
      const dateKey = notionConfig.dueDateProperty || 'Due Date';
      properties[dateKey] = {
        date: {
          start: action.dueDate,
        },
      };
    }

    if (action.priority) {
      const prioKey = notionConfig.priorityProperty || 'Priority';
      properties[prioKey] = {
        select: {
          name: action.priority.toUpperCase(),
        },
      };
    }

    // Children content blocks
    const children: any[] = [
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: { content: action.description },
            },
          ],
        },
      },
    ];

    if (action.evidence.quote) {
      children.push({
        object: 'block',
        type: 'quote',
        quote: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: `Evidence: "${action.evidence.quote}" (${action.evidence.speaker || 'Unknown'})`,
              },
            },
          ],
        },
      });
    }

    if (action.acceptanceCriteria.length > 0) {
      children.push({
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [{ type: 'text', text: { content: 'Acceptance Criteria' } }],
        },
      });
      for (const crit of action.acceptanceCriteria) {
        children.push({
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [{ type: 'text', text: { content: crit } }],
          },
        });
      }
    }

    const payload = {
      parent: { database_id: dbId },
      properties,
      children,
    };

    const res = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${notionConfig.apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Notion API error (${res.status}): ${errText}`);
    }

    const pageData = (await res.json()) as any;
    return {
      pageId: pageData.id,
      pageUrl: pageData.url || `https://notion.so/${pageData.id.replace(/-/g, '')}`,
      isMock: false,
    };
  }
}

export const notionAdapter = new NotionAdapter();
