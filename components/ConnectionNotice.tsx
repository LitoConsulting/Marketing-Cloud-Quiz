// Shown instead of an endless spinner when the game server can't be reached.
export function ConnectionNotice({ problem, label = 'Connecting...' }: { problem: boolean; label?: string }) {
  if (!problem) {
    return <div className="min-h-screen flex items-center justify-center text-white/20 text-sm">{label}</div>;
  }
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass rounded-2xl p-8 max-w-sm text-center">
        <div className="text-4xl mb-3">📡</div>
        <p className="text-white font-semibold">Can&apos;t reach the quiz server</p>
        <p className="text-white/40 text-sm mt-1">Retrying automatically...</p>
      </div>
    </div>
  );
}
