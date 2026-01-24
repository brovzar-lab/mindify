interface VersionFooterProps {
    version?: string;
    updateDescription?: string;
}

export function VersionFooter({
    version = '2.0.0',
    updateDescription = 'Android build with Java 21'
}: VersionFooterProps) {
    return (
        <footer className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
            <div className="flex justify-center pb-2">
                <div className="text-xs text-gray-500 opacity-60">
                    v{version} • {updateDescription}
                </div>
            </div>
        </footer>
    );
}
