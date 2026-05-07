export function toCamelCase(str) {
    return str
        .replace(/[^a-zA-Z0-9 ]+/g, '')      // remove non-alphanumeric
        .replace(/\s+(.)/g, (_, chr) => chr.toUpperCase()) // capitalize letters after spaces
        .replace(/^(.)/, (_, chr) => chr.toLowerCase());   // lowercase first letter
};

export const capitalize = ([first, ...rest]) => first.toUpperCase() + rest.join("");

export function getTodayStart() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}