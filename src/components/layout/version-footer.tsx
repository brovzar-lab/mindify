export function VersionFooter() {
  const version = '2.0.0';
  const updateDescription = 'Version footer & Android build';

  return (
    <footer className="fixed bottom-20 left-0 right-0 text-center py-2 pointer-events-none">
      <p className="text-xs text-[#9B9B9B]">
        v{version} &middot; {updateDescription}
      </p>
    </footer>
  );
}
