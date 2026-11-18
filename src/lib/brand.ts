// Brand tokens pulled from bluebellscakery.com (Atlas theme CSS variables + typography)
export const brand = {
  fonts: {
    heading: { family: "Crimson Pro", fallback: "'Times New Roman', Times, serif", google: "Crimson+Pro:wght@400;500;600" },
    body: { family: "Poppins", fallback: "Arial, 'Noto Sans', sans-serif", google: "Poppins:wght@400;500;600;700" },
  },
  type: [
    { name: "Page heading / H1", font: "heading", size: 70, line: 80, weight: 400, mobile: "50/54" },
    { name: "H2", font: "heading", size: 66, line: 70, weight: 400, mobile: "44/44" },
    { name: "H3", font: "heading", size: 50, line: 60, weight: 400, mobile: "30" },
    { name: "H4", font: "heading", size: 40, line: 50, weight: 400, mobile: "28" },
    { name: "H5", font: "heading", size: 32, line: 40, weight: 400, mobile: "24" },
    { name: "H6", font: "heading", size: 22, line: 30, weight: 400 },
    { name: "Subheading", font: "body", size: 22, line: 28, weight: 400 },
    { name: "Body / Label / Button", font: "body", size: 18, line: 22, weight: 400 },
    { name: "Subheading heavy", font: "body", size: 14, line: 17, weight: 700 },
  ],
  // Official palette from the Bluebells brand sheet (Nov 2026). Everything in the app that offers colours reads from here.
  colours: {
    "Core": [
      ["Navy", "#262967"], ["Cream", "#f4f2df"], ["White", "#ffffff"],
    ],
    "Pastels": [
      ["Baby Pink", "#f7d1d4"], ["Baby Blue", "#c0e6ef"], ["Baby Teal", "#cbecd7"], ["Lemon", "#fffabd"], ["Peach", "#fcd1bd"], ["Lilac", "#e4c5e0"],
    ],
  } as Record<string, [string, string][]>,
  // Wave edge matched to the one the designer uses in Canva (Nov 2026): a smooth cosine, 3 waves across the width, crest at each edge.
  // Coordinates are 10x the 1158x40 viewBox with y pointing up; the shape is the filled area below the wavy edge.
  wavePath: "M0 0 L0 320 48 320 96 319 145 317 193 315 241 312 290 308 338 304 386 299 434 294 482 288 531 281 579 275 627 267 676 260 724 252 772 244 820 236 868 227 917 219 965 210 1013 201 1062 193 1110 184 1158 176 1206 168 1254 160 1303 153 1351 145 1399 139 1448 132 1496 126 1544 121 1592 116 1640 112 1689 108 1737 105 1785 103 1834 101 1882 100 1930 100 1978 100 2026 101 2075 103 2123 105 2171 108 2220 112 2268 116 2316 121 2364 126 2412 132 2461 139 2509 145 2557 153 2606 160 2654 168 2702 176 2750 184 2798 193 2847 201 2895 210 2943 219 2992 227 3040 236 3088 244 3136 252 3184 260 3233 267 3281 275 3329 281 3378 288 3426 294 3474 299 3522 304 3570 308 3619 312 3667 315 3715 317 3764 319 3812 320 3860 320 3908 320 3956 319 4005 317 4053 315 4101 312 4150 308 4198 304 4246 299 4294 294 4342 288 4391 281 4439 275 4487 267 4536 260 4584 252 4632 244 4680 236 4728 227 4777 219 4825 210 4873 201 4922 193 4970 184 5018 176 5066 168 5114 160 5163 153 5211 145 5259 139 5308 132 5356 126 5404 121 5452 116 5500 112 5549 108 5597 105 5645 103 5694 101 5742 100 5790 100 5838 100 5886 101 5935 103 5983 105 6031 108 6080 112 6128 116 6176 121 6224 126 6272 132 6321 139 6369 145 6417 153 6466 160 6514 168 6562 176 6610 184 6658 193 6707 201 6755 210 6803 219 6852 227 6900 236 6948 244 6996 252 7044 260 7093 267 7141 275 7189 281 7238 288 7286 294 7334 299 7382 304 7430 308 7479 312 7527 315 7575 317 7624 319 7672 320 7720 320 7768 320 7816 319 7865 317 7913 315 7961 312 8010 308 8058 304 8106 299 8154 294 8202 288 8251 281 8299 275 8347 267 8396 260 8444 252 8492 244 8540 236 8588 227 8637 219 8685 210 8733 201 8782 193 8830 184 8878 176 8926 168 8974 160 9023 153 9071 145 9119 139 9168 132 9216 126 9264 121 9312 116 9360 112 9409 108 9457 105 9505 103 9554 101 9602 100 9650 100 9698 100 9746 101 9795 103 9843 105 9891 108 9940 112 9988 116 10036 121 10084 126 10132 132 10181 139 10229 145 10277 153 10326 160 10374 168 10422 176 10470 184 10518 193 10567 201 10615 210 10663 219 10712 227 10760 236 10808 244 10856 252 10904 260 10953 267 11001 275 11049 281 11098 288 11146 294 11194 299 11242 304 11290 308 11339 312 11387 315 11435 317 11484 319 11532 320 11580 320 L11580 0 Z",
  elements: [
    { id: "logo", name: "Logo", file: "/brand/logo.svg", kind: "svg", recolour: false },
    { id: "star", name: "Star sticker", file: "/brand/star.svg", kind: "svg", recolour: true },
    { id: "squiggle", name: "Squiggle underline", file: "/brand/squiggle.svg", kind: "svg", recolour: true },
    { id: "banana", name: "Banana icon", file: "/brand/banana.svg", kind: "svg", recolour: true },
    { id: "knife", name: "Knife icon", file: "/brand/knife.svg", kind: "svg", recolour: true },
    { id: "soup", name: "Bowl icon", file: "/brand/soup.svg", kind: "svg", recolour: true },
  ],
};

export const NAVY = "#262967", CREAM = "#f4f2df", WHITE = "#ffffff";
export const PASTELS = brand.colours["Pastels"].map(c => c[1]);
/** Swatch row for colour pickers: the six pastels, then navy, cream, white. */
export const SWATCHES = [...PASTELS, NAVY, CREAM, WHITE];
