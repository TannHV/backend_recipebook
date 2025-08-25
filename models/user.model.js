export const USER_COLLECTION = 'users';

export default class UserModel {
    constructor({ username, fullname, email, password, avatar, role = 'user' }) {
        this.username = username;
        this.fullname = fullname;
        this.email = email;
        this.password = password;
        this.avatar = avatar;
        this.role = role;
        this.createdAt = new Date();
        this.updatedAt = new Date();
        this.status = 'active';
    }
}
