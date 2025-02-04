class MarkdownParser {
    private static readonly patterns = {
        headers: /^(#{1,6})\s+(.+)$/gm,
        lists: /^[-*+]\s+(.+)$/gm,
        codeBlocks: /```[\s\S]*?```/g,
        inlineCode: /`([^`]+)`/g,
        links: /\[([^\]]+)\]\([^)]+\)/g,
        images: /!\[([^\]]*)\]\([^)]+\)/g,
        formatting: /(\*\*|__)(.*?)\1/g,
        emphasis: /(\*|_)(.*?)\1/g,
        strikethrough: /~~(.*?)~~/g
    };

    static toPlainText(markdown: string): string {
        let text = markdown.replace(/\r\n|\n/g, ' ');

        // Handle headers and lists
        text = text.replace(this.patterns.headers, '$2');
        text = text.replace(this.patterns.lists, '• $1');

        // Remove complex elements
        text = text.replace(this.patterns.codeBlocks, '');
        text = text.replace(this.patterns.inlineCode, '$1');
        text = text.replace(this.patterns.links, '$1');
        text = text.replace(this.patterns.images, '$1');

        // Handle formatting
        text = text.replace(this.patterns.formatting, '$2');
        text = text.replace(this.patterns.emphasis, '$2');
        text = text.replace(this.patterns.strikethrough, '$1');

        // Clean up whitespace
        text = text.replace(/\s+/g, ' ').trim();

        return text;
    }
}

export default MarkdownParser;