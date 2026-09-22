import type { Resource } from "@/types/book";

interface CachedResource {
  resource: Resource;
  url: string;
  owned: boolean;
}

export function rewriteResourcePaths(
  input: string,
  resources: Map<string, Resource>,
  resolve: (path: string) => string | undefined,
): string {
  return input.replace(
    /((?:src|href)\s*=\s*["']|url\(\s*["']?)(images\/[^"')\s]+)(["']?\s*\)?)/gi,
    (match, prefix: string, path: string, suffix: string) => {
      if (!resources.has(path)) return match;
      return `${prefix}${resolve(path) ?? path}${suffix}`;
    },
  );
}

export function createResourceUrlCache() {
  const cache = new Map<string, CachedResource>();

  function sameResource(left: Resource, right: Resource) {
    if (left.mediaType !== right.mediaType || left.bytes.length !== right.bytes.length)
      return false;
    return left.bytes.every((byte, index) => byte === right.bytes[index]);
  }

  function createUrl(resource: Resource): { url: string; owned: boolean } {
    const blob = new Blob([resource.bytes as unknown as BlobPart], { type: resource.mediaType });
    if (typeof URL.createObjectURL === "function") {
      return { url: URL.createObjectURL(blob), owned: true };
    }
    return { url: `blob:edb-${Math.random().toString(36).slice(2)}`, owned: false };
  }

  function sync(resources: Map<string, Resource>) {
    for (const [path, cached] of cache) {
      const resource = resources.get(path);
      if (!resource || !sameResource(cached.resource, resource)) {
        if (cached.owned && typeof URL.revokeObjectURL === "function")
          URL.revokeObjectURL(cached.url);
        cache.delete(path);
      }
    }
    for (const [path, resource] of resources) {
      if (!cache.has(path)) cache.set(path, { resource, ...createUrl(resource) });
    }
  }

  function resolve(path: string) {
    return cache.get(path)?.url;
  }

  function releaseAll() {
    for (const cached of cache.values())
      if (cached.owned && typeof URL.revokeObjectURL === "function")
        URL.revokeObjectURL(cached.url);
    cache.clear();
  }

  return { sync, resolve, releaseAll };
}
