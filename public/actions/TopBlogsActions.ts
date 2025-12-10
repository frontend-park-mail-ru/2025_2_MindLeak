export const TopBlogsActions = {
    LOAD_TOP_BLOGS_REQUEST: 'LOAD_TOP_BLOGS_REQUEST',
    LOAD_TOP_BLOGS_SUCCESS: 'LOAD_TOP_BLOGS_SUCCESS',
    LOAD_TOP_BLOGS_FAILURE: 'LOAD_TOP_BLOGS_FAILURE'
};

export const TopBlogsActionCreators = {
    loadTopBlogsRequest: () => ({
        type: TopBlogsActions.LOAD_TOP_BLOGS_REQUEST
    }),

    loadTopBlogsSuccess: (blogs: TopBlogDto[]) => ({
        type: TopBlogsActions.LOAD_TOP_BLOGS_SUCCESS,
        payload: blogs
    }),

    loadTopBlogsFailure: (error: string) => ({
        type: TopBlogsActions.LOAD_TOP_BLOGS_FAILURE,
        payload: error
    })
};

export interface TopBlogDto {
    id: string;
    name: string;
    avatar: string;
    subscribers: number;
}