import { brand } from "@/lib/brand";
import { BrandClient } from "./client";

export default function BrandPage() {
  const g = `https://fonts.googleapis.com/css2?family=${brand.fonts.heading.google}&family=${brand.fonts.body.google}&display=swap`;
  return (<>
    <link rel="stylesheet" href={g} />
    <BrandClient brand={brand} />
  </>);
}
