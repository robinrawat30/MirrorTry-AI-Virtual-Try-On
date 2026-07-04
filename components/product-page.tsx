"use client";

import Image from "next/image";
import { useState } from "react";

import { Container } from "@/components/container";
import { TryOnModal } from "@/components/try-on-modal";

const colors = [
  { name: "Ivory", value: "#f8f4ec" },
  { name: "Rose", value: "#d27d83" },
  { name: "Sage", value: "#7b8f80" },
  { name: "Charcoal", value: "#2f3133" },
];

const sizes = ["XS", "S", "M", "L", "XL"];
const garmentImagePath = "/products/tshirt.jpg";

export function ProductPage() {
  const [selectedColor, setSelectedColor] = useState(colors[0]);
  const [selectedSize, setSelectedSize] = useState("M");
  const [isTryOnOpen, setIsTryOnOpen] = useState(false);

  return (
    <>
      <Container className="py-8 sm:py-12 lg:py-16">
        <section className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)] lg:items-center">
          <div className="group relative overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 shadow-sm transition duration-300 hover:shadow-xl hover:shadow-zinc-200/80">
            <div className="absolute left-5 top-5 z-10 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-zinc-700 shadow-sm backdrop-blur">
              New season
            </div>
            <div className="relative aspect-[4/5] w-full">
              <Image
                src={garmentImagePath}
                alt="MirrorTry premium tailored shirt"
                fill
                priority
                className="object-cover transition duration-500 group-hover:scale-[1.03]"
                sizes="(min-width: 1024px) 52vw, 100vw"
              />
            </div>
          </div>

          <div className="mx-auto w-full max-w-xl lg:mx-0">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-700">
              MirrorTry Atelier
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
              Sculpted Everyday Shirt
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-zinc-600">
              A polished wardrobe staple with a soft structure, clean drape, and
              premium finish for workdays, weekends, and everything between.
            </p>

            <div className="mt-7 flex items-end justify-between border-y border-zinc-200 py-5">
              <div>
                <p className="text-sm text-zinc-500">Price</p>
                <p className="mt-1 text-3xl font-semibold text-zinc-950">$128</p>
              </div>
              <p className="text-sm font-medium text-teal-700">In stock</p>
            </div>

            <div className="mt-7 space-y-7">
              <fieldset>
                <div className="flex items-center justify-between">
                  <legend className="text-sm font-semibold text-zinc-950">
                    Color
                  </legend>
                  <span className="text-sm text-zinc-500">{selectedColor.name}</span>
                </div>
                <div className="mt-3 flex gap-3">
                  {colors.map((color) => (
                    <button
                      key={color.name}
                      type="button"
                      aria-label={`Select ${color.name}`}
                      onClick={() => setSelectedColor(color)}
                      className={`h-10 w-10 rounded-full border p-1 transition hover:scale-105 hover:border-zinc-950 ${
                        selectedColor.name === color.name
                          ? "border-zinc-950 shadow-sm"
                          : "border-zinc-300"
                      }`}
                    >
                      <span
                        className="block h-full w-full rounded-full border border-black/10"
                        style={{ backgroundColor: color.value }}
                      />
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <div className="flex items-center justify-between">
                  <legend className="text-sm font-semibold text-zinc-950">
                    Size
                  </legend>
                  <span className="text-sm text-zinc-500">Selected {selectedSize}</span>
                </div>
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {sizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`h-12 rounded-lg border text-sm font-semibold transition hover:border-zinc-950 hover:bg-white ${
                        selectedSize === size
                          ? "border-zinc-950 bg-zinc-950 text-white hover:bg-zinc-900"
                          : "border-zinc-200 bg-white/70 text-zinc-700"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                className="h-13 rounded-lg bg-zinc-950 px-6 py-4 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-zinc-800 hover:shadow-lg"
              >
                Buy Now
              </button>
              <button
                type="button"
                onClick={() => setIsTryOnOpen(true)}
                className="h-13 rounded-lg border border-zinc-300 bg-white px-6 py-4 text-sm font-semibold text-zinc-950 transition hover:-translate-y-0.5 hover:border-teal-700 hover:text-teal-800 hover:shadow-lg hover:shadow-teal-900/10"
              >
                Try On
              </button>
            </div>
          </div>
        </section>
      </Container>

      <TryOnModal
        garmentImagePath={garmentImagePath}
        isOpen={isTryOnOpen}
        onClose={() => setIsTryOnOpen(false)}
      />
    </>
  );
}
