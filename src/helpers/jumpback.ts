
const KEY = "magicbroad_jumpbackto";

export const setJumpback = (path: string) => {
    window.localStorage.setItem(KEY, path);
};

export const getJumpback = (): string | null  => {
    return window.localStorage.getItem(KEY);
};

export const clearJumpback = () => {
    window.localStorage.removeItem(KEY);
};

export const getAndClearJumpback = (): string | null => {
    const path = getJumpback();
    clearJumpback();
    return path;
};
