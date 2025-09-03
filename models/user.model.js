export const USER_COLLECTION = 'users';

export default class UserModel {
    constructor({ username, fullname, email, password, avatar, role = 'user' }) {
        this.username = username;
        this.fullname = fullname;
        this.email = email;
        this.password = password;
        this.avatar = avatar ?? process.env.DEFAULT_AVATAR_URL;
        this.role = role;
        this.createdAt = new Date();
        this.updatedAt = new Date();
        this.status = 'active';

        // Trạng thái xác thực email
        this.emailVerified = false;

        // =============== HYBRID VERIFY (TOKEN + OTP) ===============
        this.emailVerification = {
            // TOKEN mode
            tokenHash: null,         
            tokenExpiresAt: null,     

            // OTP mode
            codeHash: null,          
            codeExpiresAt: null,     
            codeAttempts: 0,          
            codeLastSentAt: null
        };

        // =============== HYBRID RESET PASSWORD (TOKEN + OTP) ===============
        this.passwordReset = {
            // TOKEN mode
            tokenHash: null,
            tokenExpiresAt: null,

            // OTP mode
            codeHash: null,
            codeExpiresAt: null,
            codeAttempts: 0,
            codeLastSentAt: null
        };

        this.lastEmailChangedAt = null;
    }
}
