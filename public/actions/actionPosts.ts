/**
 * @file Действия для управления лентой постов
 * @module actions/posts
 */

import { dispatcher } from '../dispatcher/dispatcher';
import { Post } from '../stores/storePosts';

/**
 * Набор фабрик действий для работы с лентой постов.
 */
export const postsActions = {

    /**
     * Инициирует загрузку постов.
     */
    loadStart(): void {
        dispatcher.dispatch('POSTS_LOAD_START');
    },

    /**
     * Уведомляет об успешной загрузке постов.
     * @param {Post[]} posts - Массив загруженных постов.
     */
    loadSuccess(posts: Post[]): void {
        dispatcher.dispatch('POSTS_LOAD_SUCCESS', { posts });
    },

    /**
     * Уведомляет о неудачной попытке загрузки постов.
     * @param {string} error - Сообщение об ошибке.
     */
    loadFail(error: string): void {
        dispatcher.dispatch('POSTS_LOAD_FAIL', { error });
    },

    /**
     * Очищает текущий список постов.
     */
    clear(): void {
        dispatcher.dispatch('POSTS_CLEAR');
    }
};