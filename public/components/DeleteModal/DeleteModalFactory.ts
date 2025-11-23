import { DeleteModal } from './DeleteModal';
import { dispatcher } from '../../dispatcher/dispatcher';

export class DeleteModalFactory {
    // Для удаления поста
    static createPostDeleteModal(postId: string): DeleteModal {
        return new DeleteModal({
            title: 'Удаление поста',
            message: 'Пост будет удален без возможности восстановления. Вы уверены, что хотите удалить пост?',
            cancelText: 'Отмена',
            deleteText: 'Удалить',
            deleteLoadingText: 'Удаление...',
            onDelete: async () => {
                dispatcher.dispatch('POST_DELETE_REQUEST', { postId });
            }
        });
    }

    // Для удаления аккаунта
    static createAccountDeleteModal(): DeleteModal {
        return new DeleteModal({
            title: 'Удаление аккаунта',
            message: 'Аккаунт будет удален без возможности восстановления. Вы уверены, что хотите удалить аккаунт?',
            cancelText: 'Отмена',
            deleteText: 'Удалить',
            deleteLoadingText: 'Удаление...',
            onDelete: async () => {
                dispatcher.dispatch('ACCOUNT_DELETE_REQUEST');
            }
        });
    }

    // Для удаления комментария
    static createCommentDeleteModal(commentId: string): DeleteModal {
        return new DeleteModal({
            title: 'Удаление комментария',
            message: 'Комментарий будет удален. Вы уверены?',
            cancelText: 'Отмена',
            deleteText: 'Удалить комментарий',
            deleteLoadingText: 'Удаление...',
            onDelete: async () => {
                dispatcher.dispatch('COMMENT_DELETE_REQUEST', { commentId });
            }
        });
    }

        static createAvatarDeleteModal(): DeleteModal {
        return new DeleteModal({
            title: 'Удаление фото профиля',
            message: 'Фото профиля будет удалено. Вы уверены?',
            cancelText: 'Отмена',
            deleteText: 'Удалить фото',
            deleteLoadingText: 'Удаление...',
            onDelete: async () => {
                dispatcher.dispatch('AVATAR_DELETE_REQUEST');
            }
        });
    }

    // Для удаления обложки
    static createCoverDeleteModal(): DeleteModal {
        return new DeleteModal({
            title: 'Удаление обложки профиля',
            message: 'Обложка профиля будет удалена. Вы уверены?',
            cancelText: 'Отмена',
            deleteText: 'Удалить обложку',
            deleteLoadingText: 'Удаление...',
            onDelete: async () => {
                dispatcher.dispatch('COVER_DELETE_REQUEST');
            }
        });
    }

    // Универсальный метод для кастомных случаев
    static createCustomModal(config: {
        title: string;
        message: string;
        cancelText?: string;
        deleteText?: string;
        deleteLoadingText?: string;
        onDelete: () => void | Promise<void>;
        onCancel?: () => void;
        isLoading?: boolean;
    }): DeleteModal {
        return new DeleteModal({
            title: config.title,
            message: config.message,
            cancelText: config.cancelText,
            deleteText: config.deleteText,
            deleteLoadingText: config.deleteLoadingText,
            onDelete: config.onDelete,
            onCancel: config.onCancel,
            isLoading: config.isLoading
        });
    }
}