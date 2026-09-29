import { randomInt } from "node:crypto";

const BASE62_CHARACTERS =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export const SHORT_CODE_LENGTH = 7;

export function generateShortCode(length = SHORT_CODE_LENGTH) {
    let shortCode = "";

    for (let position = 0; position < length; position++) {
        const randomIndex = randomInt(BASE62_CHARACTERS.length);
        shortCode += BASE62_CHARACTERS[randomIndex];
    }

    return shortCode;
}

export function isValidShortCode(code) {
    return /^[a-zA-Z0-9]{1,16}$/.test(code);
}