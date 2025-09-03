// src/templates/emailTemplates.js

// helper: khối “nút nhấn link” (TOKEN)
const linkBlock = (href, label) => `
    <div style="text-align:center;margin:24px 0;">
        <a href="${href}"
        style="background:#4CAF50;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">
        ${label}
        </a>
    </div>
    `;

// helper: khối “mã OTP to đậm”
const codeBlock = (code) => `
    <div style="font-size:32px;letter-spacing:6px;font-weight:bold;text-align:center;margin:16px 0;">
        ${code}
    </div>
    `;

export const emailTemplates = {
    /**
     * Template CHUNG cho xác thực email (dùng được cả link hoặc code, hoặc cả hai)
     * @param {string} name
     * @param {string|null} link - link token (tuỳ chọn)
     * @param {string|null} code - mã OTP (tuỳ chọn)
     * @param {number} minutes - thời hạn (phút)
     */
    verification: ({ name = "", link = null, code = null, minutes = 60 }) => {
        const parts = [];
        if (link) {
            parts.push(`
            <p><b>Cách 1 (link):</b> Nhấp vào nút bên dưới để xác thực email của bạn:</p>
            ${linkBlock(link, "Xác thực email")}
        `);
        }
        if (code) {
            parts.push(`
            <p><b>Cách 2 (mã OTP):</b> Nhập mã dưới đây trong ứng dụng/web:</p>
            ${codeBlock(code)}
        `);
        }
        // nếu cả link & code đều không có → vẫn trả text fallback
        if (!parts.length) {
            parts.push(`<p>Không có phương thức xác thực khả dụng. Vui lòng yêu cầu gửi lại.</p>`);
        }

        return {
            subject: "Xác thực tài khoản - Recipe Food App",
            html: `
            <div style="font-family:Arial, sans-serif; max-width:600px; margin:0 auto;">
            <h2 style="color:#2c5aa0;">Xác thực tài khoản</h2>
            <p>Xin chào <strong>${name}</strong>,</p>
            ${parts.join("")}
            <p><strong>Lưu ý:</strong> Mã/đường dẫn có hiệu lực trong <strong>${minutes} phút</strong>.</p>
            <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
            <hr style="margin:24px 0;border:none;border-top:1px solid #eee;">
            <p style="color:#666;font-size:12px;">Email tự động, vui lòng không trả lời.</p>
            </div>
        `
        };
    },

    /**
     * Template CHUNG cho reset mật khẩu (link hoặc code)
     */
    reset: ({ name = "", link = null, code = null, minutes = 30 }) => {
        const parts = [];
        if (link) {
            parts.push(`
            <p><b>Cách 1 (link):</b> Nhấp để đặt lại mật khẩu:</p>
            ${linkBlock(link, "Đặt lại mật khẩu")}
        `);
        }
        if (code) {
            parts.push(`
            <p><b>Cách 2 (mã OTP):</b> Nhập mã dưới đây để đặt lại mật khẩu:</p>
            ${codeBlock(code)}
        `);
        }
        if (!parts.length) {
            parts.push(`<p>Không có phương thức đặt lại khả dụng. Vui lòng yêu cầu gửi lại.</p>`);
        }

        return {
            subject: "Đặt lại mật khẩu - Recipe Food App",
            html: `
            <div style="font-family:Arial, sans-serif; max-width:600px; margin:0 auto;">
            <h2 style="color:#f44336;">Đặt lại mật khẩu</h2>
            <p>Xin chào <strong>${name}</strong>,</p>
            ${parts.join("")}
            <p><strong>Lưu ý:</strong> Mã/đường dẫn có hiệu lực trong <strong>${minutes} phút</strong>.</p>
            <p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
            <hr style="margin:24px 0;border:none;border-top:1px solid #eee;">
            <p style="color:#666;font-size:12px;">Email tự động, vui lòng không trả lời.</p>
            </div>
        `
        };
    },

    // Giữ nguyên thông báo đổi email
    emailChanged: ({ name = "", newEmail }) => ({
        subject: "Email tài khoản đã được thay đổi - Recipe Food App",
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color:#ff9800;">Thông báo thay đổi email</h2>
            <p>Xin chào <strong>${name}</strong>,</p>
            <p>Email tài khoản của bạn đã được thay đổi thành: <strong>${newEmail}</strong></p>
            <p>Trạng thái xác thực email đã được reset. Vui lòng xác thực email mới để sử dụng đầy đủ tính năng.</p>
            <hr style="margin:24px 0;border:none;border-top:1px solid #eee;">
            <p style="color:#666;font-size:12px;">Email tự động, vui lòng không trả lời.</p>
        </div>
    `
    })
};
