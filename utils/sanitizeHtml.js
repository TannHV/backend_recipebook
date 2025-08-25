import sanitizeHtml from "sanitize-html";

export const sanitizeBlogContent = (html) => {
    return sanitizeHtml(html, {
        allowedTags: [
            "h1", "h2", "h3", "h4", "h5", "h6",
            "blockquote", "p", "a", "ul", "ol", "nl", "li", "b", "i", "strong", "em",
            "span", "br", "div", "img"
        ],
        allowedAttributes: {
            a: ["href", "name", "target"],
            img: ["src", "alt", "style", "width", "height"],
            "*": ["style"]
        },
        allowedSchemes: ["http", "https", "data"], // Cho phép ảnh base64 hoặc ảnh từ Cloudinary
        allowProtocolRelative: true,
    });
};


export const sanitizeRecipeContent = (html) => {
    return sanitizeHtml(html, {
        allowedTags: [
            "h1", "h2", "h3", "h4",
            "p", "ul", "ol", "li", "b", "i", "strong", "em",
            "span", "br", "div",
            "img"
        ],
        allowedAttributes: {
            a: ["href", "target"],              // link (nếu muốn)
            img: ["src", "alt", "style", "width", "height"],
            "*": ["style"]                      // cho phép inline style cơ bản
        },
        allowedSchemes: ["http", "https", "data"],
        allowProtocolRelative: true,
    });
};