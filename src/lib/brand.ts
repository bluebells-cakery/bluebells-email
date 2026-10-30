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
  colours: {
    "Core": [
      ["Navy (text / primary)", "#262967"], ["Cream (page background)", "#fffdf8"], ["Teal (buttons / links)", "#00bfb3"], ["Teal hover", "#2dccd3"], ["Charcoal", "#333333"], ["White", "#ffffff"],
    ],
    "Pastel accents": [
      ["Blush", "#fbe7e6"], ["Peach", "#fcd1bd"], ["Butter", "#fff9ea"], ["Lilac", "#e4c5e0"], ["Sky", "#c0e6ef"], ["Rose mist", "#fcf0f0"],
    ],
  } as Record<string, [string, string][]>,
  wavePath: "M645 344 c-91 -14 -210 -43 -365 -89 -46 -14 -128 -33 -182 -42 l-98 -16 0 -99 0 -98 5790 0 5790 0 0 95 0 95 -159 0 c-88 0 -213 7 -278 15 -106 14 -166 28 -418 96 -133 36 -290 52 -495 52 -228 -1 -354 -17 -534 -70 -66 -20 -165 -46 -219 -59 -273 -64 -595 -56 -875 22 -328 91 -386 101 -607 111 -237 10 -499 -23 -679 -86 -332 -115 -771 -116 -1142 -1 -148 46 -262 68 -426 81 -248 21 -567 -14 -748 -81 -161 -59 -455 -97 -665 -86 -177 10 -311 32 -479 81 -203 58 -284 73 -458 87 -172 14 -403 1 -584 -32 -105 -19 -138 -27 -324 -84 -252 -77 -617 -69 -915 20 -186 56 -263 74 -368 89 -134 19 -438 18 -562 -1z",
  elements: [
    { id: "logo", name: "Logo", file: "/brand/logo.svg", kind: "svg", recolour: false },
    { id: "star", name: "Star sticker", file: "/brand/star.svg", kind: "svg", recolour: true },
    { id: "squiggle", name: "Squiggle underline", file: "/brand/squiggle.svg", kind: "svg", recolour: true },
    { id: "banana", name: "Banana icon", file: "/brand/banana.svg", kind: "svg", recolour: true },
    { id: "knife", name: "Knife icon", file: "/brand/knife.svg", kind: "svg", recolour: true },
    { id: "soup", name: "Bowl icon", file: "/brand/soup.svg", kind: "svg", recolour: true },
  ],
};
