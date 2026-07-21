/** Shared Markdown-friendly Output Channel formatting. */

export interface MarkdownOutputChannel {
  appendLine(value: string): void;
  show(preserveFocus?: boolean): void;
}

export interface MarkdownSection {
  heading: string;
  items: string[];
  emptyText?: string;
}

export function writeMarkdownResult(
  outputChannel: MarkdownOutputChannel,
  title: string,
  sections: MarkdownSection[],
): void {
  outputChannel.appendLine(`# DevPilot: ${title}`);
  outputChannel.appendLine("---");
  for (const section of sections) {
    outputChannel.appendLine(`## ${section.heading}`);
    if (!section.items.length) {
      outputChannel.appendLine(`- ${section.emptyText ?? "None."}`);
      continue;
    }
    for (const item of section.items) {
      outputChannel.appendLine(`- ${item}`);
    }
  }
  outputChannel.appendLine("");
  outputChannel.show(true);
}
