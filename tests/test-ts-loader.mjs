export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (specifier === "@khlim/api-client") {
      return nextResolve(
        new URL("../packages/api-client/src/index.ts", import.meta.url).href,
        context,
      );
    }
    if (specifier.startsWith(".") || specifier.startsWith("/")) {
      for (const ext of [".ts", ".tsx", ".js", ".mjs"]) {
        try {
          return await nextResolve(specifier + ext, context);
        } catch {}
      }
    }
    throw err;
  }
}
