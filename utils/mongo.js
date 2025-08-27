import { ObjectId } from "mongodb";

/**
 * Chuyển string sang ObjectId an toàn
 * @param {string} id
 * @returns {ObjectId|null}
 */
export function toObjectId(id) {
    if (!id || !ObjectId.isValid(String(id))) {
        return null;
    }
    return new ObjectId(String(id));
}