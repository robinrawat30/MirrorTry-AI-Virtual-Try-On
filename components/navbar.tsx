import Link from "next/link";

import { Container } from "@/components/container";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/85 backdrop-blur-xl">
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight text-zinc-950">
          Mirror<span className="text-teal-600">Try</span>
        </Link>

        <nav aria-label="Main navigation" className="flex items-center gap-6">
          <Link
            href="/"
            className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-950"
          >
            Shop
          </Link>
        </nav>
      </Container>
    </header>
  );
}
