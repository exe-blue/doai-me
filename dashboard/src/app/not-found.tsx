import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-void text-ethereal flex items-center justify-center px-6">
      <div className="text-center">
        <h1 className="font-mono text-6xl text-doai mb-4">404</h1>
        <p className="font-serif text-xl text-ethereal-dim mb-8">
          The void does not contain what you seek.
        </p>
        <Link 
          href="/"
          className="font-mono text-sm text-doai hover:text-doai-bright transition-colors"
        >
          ← Return to Terminal
        </Link>
      </div>
    </div>
  );
}
