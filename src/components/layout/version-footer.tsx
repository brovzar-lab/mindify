import packageJson from '../../../package.json';

// Build timestamp is injected at build time
const BUILD_TIME = import.meta.env.VITE_BUILD_TIME || new Date().toISOString();

export function VersionFooter() {
  const version = packageJson.version;
  const buildDate = new Date(BUILD_TIME).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <footer className="fixed bottom-20 left-0 right-0 text-center py-2 pointer-events-none">
      <p className="text-xs text-[#9B9B9B]">
        v{version} &middot; {buildDate}
      </p>
    </footer>
  );
}
