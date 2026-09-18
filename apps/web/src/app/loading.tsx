export default function RootLoading(): JSX.Element {
  return (
    <div
      role="status"
      aria-label="Carregando"
      className="flex min-h-[60vh] flex-1 flex-col items-center justify-center bg-transparent px-4"
    >
      <div className="relative flex items-center justify-center">
        {/* Glow halo */}
        <div className="absolute h-16 w-16 animate-ping rounded-full bg-teal-500/20 duration-1000" />
        {/* Spinner ring */}
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-teal-500/20 border-t-teal-500" />
      </div>
      <p className="mt-4 text-xs font-medium tracking-wide text-slate-400">
        Carregando EnergivIA...
      </p>
    </div>
  );
}
