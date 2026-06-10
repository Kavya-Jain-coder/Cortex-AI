export type BlockType = "text" | "code";

export interface NotebookBlock {
  id: string;
  type: BlockType;
  content: string;
  language?: string;
}

export function parseMarkdownToBlocks(markdown: string): NotebookBlock[] {
  if (!markdown) {
    return [{ id: generateId(), type: "text", content: "" }];
  }

  const blocks: NotebookBlock[] = [];
  const lines = markdown.split("\n");
  
  let currentBlockType: BlockType = "text";
  let currentContent: string[] = [];
  let currentLanguage = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] || "";
    if (line.startsWith("```")) {
      if (currentBlockType === "text") {
        // We hit the start of a code block. Save the current text block if it has content.
        // We only save if there is content or if we haven't created any blocks yet.
        if (currentContent.length > 0 || currentContent.join("").trim() !== "") {
          blocks.push({
            id: generateId(),
            type: "text",
            content: currentContent.join("\n").trim(),
          });
        }
        currentContent = [];
        currentBlockType = "code";
        currentLanguage = line.slice(3).trim();
      } else {
        // We hit the end of a code block.
        blocks.push({
          id: generateId(),
          type: "code",
          content: currentContent.join("\n"),
          language: currentLanguage,
        });
        currentContent = [];
        currentLanguage = "";
        currentBlockType = "text";
      }
    } else {
      currentContent.push(line);
    }
  }

  // push any remaining content
  if (currentContent.length > 0 || blocks.length === 0) {
    if (currentBlockType === "text" && currentContent.join("").trim() === "" && blocks.length > 0) {
      // Don't push empty trailing text blocks if we already have blocks
    } else {
      blocks.push({
        id: generateId(),
        type: currentBlockType,
        content: currentBlockType === "text" ? currentContent.join("\n").trim() : currentContent.join("\n"),
        language: currentBlockType === "code" ? currentLanguage : undefined,
      });
    }
  }

  // Ensure there's always at least one block
  if (blocks.length === 0) {
    return [{ id: generateId(), type: "text", content: "" }];
  }

  return blocks;
}

export function serializeBlocksToMarkdown(blocks: NotebookBlock[]): string {
  return blocks
    .map((block) => {
      if (block.type === "code") {
        return `\`\`\`${block.language || ""}\n${block.content}\n\`\`\``;
      }
      return block.content.trim();
    })
    .filter(Boolean) // remove empty blocks
    .join("\n\n");
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}
