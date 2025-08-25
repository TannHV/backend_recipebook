export const BLOG_COLLECTION = 'blogs';

export default class BlogModel {
    constructor({ title, thumbnail, content, author }) {
        this.title = title;
        this.thumbnail = thumbnail;
        this.content = content;
        this.author = author;
        this.createdAt = new Date();
        this.updatedAt = new Date();
        this.comments = [];
    }
}

