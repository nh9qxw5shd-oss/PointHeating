// Hand-built URLs (fetch, window.open, plain anchors) do not get Next's basePath; route them here.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const withBase = (path: string) => `${BASE_PATH}${path}`;
