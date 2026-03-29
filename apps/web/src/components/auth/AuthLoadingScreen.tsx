export function AuthLoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-kern-bg">
      <span className="text-xl font-semibold tracking-tight text-kern-text">kern</span>
      <div className="mt-5 flex h-0.5 w-28 overflow-hidden bg-kern-surface-2" aria-hidden>
        <div className="h-full w-1/3 bg-kern-accent animate-kern-upload-bar" />
      </div>
    </div>
  );
}
