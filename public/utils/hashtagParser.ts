// utils/hashtagParser.ts
export class HashtagParser {
    /**
     * Заменяет хештеги в тексте на HTML-ссылки
     */
    static replaceHashtagsWithLinks(text: string): string {
        if (!text) return '';
        
        // Обновляем регулярное выражение для поддержки русских букв
        const hashtagRegex = /#([\w\u0400-\u04FF]+)/g;
        const result = text.replace(hashtagRegex, (match, tag) => {
            console.log(`🔍 HashtagParser: Found hashtag: ${match} -> ${tag}`);
            return `<a href="/search?q=%23${encodeURIComponent(tag)}" class="hashtag-link" data-hashtag="${tag}">${match}</a>`;
        });

        return result;
    }

    static isHashtagSearch(query: string): boolean {
        return query.startsWith('#');
    }

    static extractHashtagFromQuery(query: string): string {
        return query.startsWith('#') ? query.substring(1) : query;
    }
}