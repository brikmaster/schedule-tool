// ScoreStream Header Component

export default function Header() {
  return (
    <header className="ss-header flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="text-white font-bold text-xl">scorestream</div>
      </div>
      <div className="flex-1 max-w-md mx-8">
        <input
          type="search"
          placeholder="Search..."
          className="w-full px-4 py-2 rounded bg-white/20 text-white placeholder-white/70 border-none focus:outline-none focus:bg-white/30"
        />
      </div>
    </header>
  );
}
