// utils/sanitizeHtml.js
import sanitizeHtml from 'sanitize-html';

/** Link an toàn cho <a> */
const transformSafeLink = sanitizeHtml.simpleTransform(
    'a',
    { rel: 'nofollow noopener noreferrer', target: '_blank' },
    true
);

/** Whitelist style cơ bản cho text (nếu bạn MUỐN giữ style). 
 *  Nếu không cần style → bỏ 'allowedStyles' và bỏ allowedAttributes.style luôn. */
const allowedStyles = {
    '*': {
        'text-align': [/^left$|^right$|^center$|^justify$/],
        'font-weight': [/^bold$|^normal$/],
        'font-style': [/^italic$|^normal$/],
    },
    img: {
        width: [/^\d+(?:px|%)$/],
        height: [/^\d+(?:px|%)$/],
    },
};

const commonOptions = {
    // Chỉ định link an toàn
    transformTags: { a: transformSafeLink },

    // Không cho script/chèn event handler, v.v. (sanitize-html mặc định đã cấm)
    disallowedTagsMode: 'discard',

    // Nếu dùng v2: enforce boundary
    enforceHtmlBoundary: true,
};

/** BLOG: Cho phép HTML nhẹ + ảnh */
export const sanitizeBlogContent = (html) =>
    sanitizeHtml(html, {
        allowedTags: [
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'blockquote', 'p', 'a', 'ul', 'ol', 'li', 'b', 'i', 'strong', 'em',
            'span', 'br', 'div', 'img', 'code', 'pre'
        ],
        allowedAttributes: {
            a: ['href', 'name', 'target', 'rel'],
            img: ['src', 'alt', 'width', 'height', 'style'],
            span: ['class', 'style'],
            div: ['class', 'style'],
            p: ['class', 'style'],
            code: ['class'],
            pre: ['class'],
        },
        // Chỉ cho http/https cho <a>, cho http/https/data cho <img>
        allowedSchemes: ['http', 'https'],
        allowedSchemesByTag: { img: ['http', 'https', 'data'] },
        allowedStyles,
        ...commonOptions,
    });

/** RECIPE: Nhẹ hơn blog (ít tag hơn tuỳ ý) */
export const sanitizeRecipeContent = (html) =>
    sanitizeHtml(html, {
        allowedTags: [
            'h1', 'h2', 'h3', 'h4',
            'p', 'ul', 'ol', 'li', 'b', 'i', 'strong', 'em',
            'span', 'br', 'div', 'img'
        ],
        allowedAttributes: {
            a: ['href', 'target', 'rel'],
            img: ['src', 'alt', 'width', 'height', 'style'],
            span: ['class', 'style'],
            div: ['class', 'style'],
            p: ['class', 'style'],
        },
        allowedSchemes: ['http', 'https'],
        allowedSchemesByTag: { img: ['http', 'https', 'data'] },
        allowedStyles,
        ...commonOptions,
    });

/** COMMENT: plain-text (không HTML) */
export const sanitizeCommentText = (text) =>
    sanitizeHtml(String(text || ''), {
        allowedTags: [],
        allowedAttributes: {},
        enforceHtmlBoundary: true,
    });
