/**
 * Imports a page's lazily loaded module so that it still runs before the window load event.
 *
 * Playwright's goto waits for load, and specs act right after it, as they could when every module was
 * a static import of the entry. import() alone doesn't delay load; a module <script> element does,
 * until its module has run. So in development the module is imported by its URL and also through such
 * a script: both share one module record (it runs once), and the import resolves, and the page renders,
 * before load. `url` is the module's source URL, which only the dev server serves: builds use `load`.
 */
export function importBeforeLoad<T>(load: () => Promise<T>, url: URL): Promise<T> {
  if (!import.meta.env.DEV || document.readyState === 'complete') return load();
  const script = document.createElement('script');
  script.type = 'module';
  script.src = url.href;
  document.head.append(script);
  return import(/* @vite-ignore */ url.href) as Promise<T>;
}
