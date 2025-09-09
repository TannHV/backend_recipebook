export function parseSortParam(s) {
    if (!s) return { createdAt: -1 };
    if (typeof s === "object") return s;
    const str = String(s).trim().toLowerCase();

    if (str === "newest" || str === "created_desc") return { createdAt: -1 };
    if (str === "oldest" || str === "created_asc") return { createdAt: 1 };
    if (str === "updated_desc") return { updatedAt: -1 };
    if (str === "updated_asc") return { updatedAt: 1 };
    if (str === "likes_desc" || str === "most_liked" || str === "popular")
        return { likesCount: -1, createdAt: -1 };
    if (str === "rating_desc" || str === "top")
        return { "metrics.avgRating": -1, createdAt: -1 };

    try {
        const obj = JSON.parse(s);
        if (obj && typeof obj === "object" && !Array.isArray(obj)) return obj;
    } catch (_) { }
    return { createdAt: -1 };
}
