import { config } from '../config/env.js';
import nodemailer from 'nodemailer';
import { emailTemplates } from "../templates/emailTemplates.js";

const createTransporter = () => {
    if (config.emailService === "gmail") {
        return nodemailer.createTransport({
            service: "gmail",
            auth: { user: config.email.smtpUser, pass: config.email.smtpPass },
            family: 4,
            connectionTimeout: 10000,
            greetingTimeout: 10000,
        });
    }
    return nodemailer.createTransport({
        host: config.email.smtpHost,
        port: config.email.smtpPort,
        secure: !!config.email.smtpSecure,
        auth: { user: config.email.smtpUser, pass: config.email.smtpPass },
        family: 4,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        tls: { servername: config.email.smtpHost },
    });
};

export async function verifySmtp() {
    const transporter = createTransporter();
    return transporter.verify();
}

export async function sendEmail({ to, subject, html }) {
    try {
        if (!to) throw new Error("Missing recipient 'to'");
        const transporter = createTransporter();
        const result = await transporter.sendMail({
            from: config.email.emailFrom,
            to,
            subject,
            html,
        });
        return { success: true, messageId: result.messageId };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * Gửi email XÁC THỰC (dùng 1 template chung)
 * Truyền link (token) hoặc code (OTP) hoặc cả hai.
 * @param {object} params
 * @param {string} params.to
 * @param {string} params.username
 * @param {string|null} params.verifyLink
 * @param {string|null} params.verifyCode
 * @param {number} [params.expiresMin]  // mặc định 60p
 */
export async function sendVerificationEmail({
    to, username, verifyLink = null, verifyCode = null, expiresMin = 60
}) {
    const { subject, html } = emailTemplates.verification({
        name: username,
        link: verifyLink,
        code: verifyCode,
        minutes: expiresMin
    });
    return sendEmail({ to, subject, html });
}

/**
 * Gửi email RESET (dùng 1 template chung)
 * @param {object} params
 * @param {string} params.to
 * @param {string} params.username
 * @param {string|null} params.resetLink
 * @param {string|null} params.resetCode
 * @param {number} [params.expiresMin]  // mặc định 30p
 */
export async function sendResetPasswordEmail({
    to, username, resetLink = null, resetCode = null, expiresMin = 30
}) {
    const { subject, html } = emailTemplates.reset({
        name: username,
        link: resetLink,
        code: resetCode,
        minutes: expiresMin
    });
    return sendEmail({ to, subject, html });
}

/**
 * Gửi email thông báo đổi email (giữ nguyên)
 */
export async function sendEmailChangedNotice({ to, username, newEmail }) {
    const { subject, html } = emailTemplates.emailChanged({
        name: username,
        newEmail,
    });
    return sendEmail({ to, subject, html });
}
