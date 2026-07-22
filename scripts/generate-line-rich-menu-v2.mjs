import sharp from "sharp";

const overlay = `<svg width="2500" height="1686" xmlns="http://www.w3.org/2000/svg">
  <rect x="857" y="902" width="785" height="710" rx="38" fill="#e0f2fe"/>
  <circle cx="1249" cy="1166" r="112" fill="#0284c7"/>
  <path d="M1185 1092h128v148h-128zM1208 1120h82M1208 1156h82M1208 1192h55" stroke="white" stroke-width="20" fill="none" stroke-linecap="round"/>
  <text x="1249" y="1396" text-anchor="middle" fill="#075985" font-family="Tahoma, sans-serif" font-size="48" font-weight="700">&#x0E40;&#x0E27;&#x0E47;&#x0E1A;&#x0E44;&#x0E0B;&#x0E15;&#x0E4C;</text>
  <text x="1249" y="1461" text-anchor="middle" fill="#475569" font-family="Tahoma, sans-serif" font-size="30">&#x0E40;&#x0E1B;&#x0E34;&#x0E14;&#x0E23;&#x0E30;&#x0E1A;&#x0E1A;&#x0E1A;&#x0E19;&#x0E40;&#x0E27;&#x0E47;&#x0E1A;</text>
</svg>`;

await sharp("public/line-admin-rich-menu.png")
  .composite([{ input: Buffer.from(overlay) }])
  .png({ compressionLevel: 9 })
  .toFile("public/line-admin-rich-menu-v2.png");
