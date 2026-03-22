export function AuthLoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-kern-bg">
      <span className="text-xl font-semibold tracking-tight text-kern-text">kern</span>
      <div className="mt-4 flex gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-kern-accent animate-pulse [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 rounded-full bg-kern-accent animate-pulse [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 rounded-full bg-kern-accent animate-pulse [animation-delay:300ms]" />
      </div>
    </div>
  );
}
