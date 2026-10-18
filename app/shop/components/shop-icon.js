const illustrations = {
  points: <><path d="m32 5 24 27-24 27L8 32Z" /><path d="m24 32 6 6 12-14" /></>,
  bag: <><path d="M15 21h34l3 35H12Z" /><path d="M23 24V16a9 9 0 0 1 18 0v8" /></>,
  close: <path d="m17 17 30 30m0-30L17 47" />,
  check: <path d="m15 33 11 11 24-25" />,
  henna: <><path d="M21 58v-9L10 34a4 4 0 0 1 6-5l7 8V15a4 4 0 0 1 8 0v17V9a4 4 0 0 1 8 0v23V15a4 4 0 0 1 8 0v20-10a4 4 0 0 1 8 0v17c0 7-7 10-7 16" /><circle cx="36" cy="43" r="5" /><path d="m36 33 2 5 5-2-2 5 5 2-5 2 2 5-5-2-2 5-2-5-5 2 2-5-5-2 5-2-2-5 5 2Z" /></>,
  cocktail: <><path d="M8 16h48L32 39ZM32 39v18m-12 0h24M39 16l5-11h12" /><path d="M17 23h30" /></>,
  walk: <><circle cx="35" cy="9" r="5" /><path d="m28 57 6-19 9 8 7 11M15 55l10-20 4-17 9 4 7 12h10M29 20 18 31H8m17 4 12 4" /></>,
  car: <><path d="m12 28 5-15h30l5 15M7 28h50v22H7ZM7 50v6h9v-6m32 0v6h9v-6M7 28l-3-5m53 5 3-5M14 37h8m20 0h8m-24 7h12" /></>,
  bowling: <><circle cx="40" cy="41" r="17" /><circle cx="36" cy="33" r="1.5" /><circle cx="42" cy="32" r="1.5" /><circle cx="40" cy="38" r="1.5" /><path d="M13 8h9l-2 12c0 10 9 15 9 25M13 8l2 12c0 10-9 15-9 25v10h16m-8-34h8m-9 5h10" /></>,
  arcade: <><path d="M17 5h31l8 51H8l10-23ZM20 12h22l3 19H16Zm-3 28h30M24 40v-5m14 1h5M17 48h29" /></>,
  dart: <><circle cx="28" cy="36" r="22" /><circle cx="28" cy="36" r="14" /><circle cx="28" cy="36" r="5" /><path d="m28 36 22-22m-6 6 1-11 11-4-2 12-10 3" /></>,
  beer: <><path d="M12 23h30v32H12ZM42 28h8a6 6 0 0 1 6 6v8a6 6 0 0 1-6 6h-8M21 31v16m12-16v16" /><path d="M12 23c-9-5-3-17 5-13 0-9 14-11 17-2 10-3 16 10 8 15" /></>,
  cards: <><rect x="20" y="7" width="32" height="48" rx="3" /><path d="m16 15-7 2a3 3 0 0 0-2 4l9 36 7-2M36 21l8 10-8 10-8-10Z" /></>,
  bottle: <><path d="M26 5h12v13l7 12v28H19V30l7-12ZM26 10h12M19 35h26M19 48h26" /></>,
  whistle: <><path d="M29 24h24v12H40a16 16 0 1 1-11-12Z" /><circle cx="24" cy="40" r="7" /><path d="M40 24v12M53 26h5v8h-5M17 16l-4-6m16 4V6m11 10 4-6" /></>,
  spinner: <><path d="M23 24c-12-19 30-19 18 0 22-1 20 31 0 24-5-2-6-7-9-7s-4 5-9 7C3 55 1 23 23 24Z" /><circle cx="32" cy="32" r="6" /><circle cx="32" cy="14" r="4" /><circle cx="16" cy="41" r="4" /><circle cx="48" cy="41" r="4" /></>,
  jojo: <><path d="M33 6h11a4 4 0 0 1 0 8H33a8 8 0 0 0-8 8v5" /><ellipse cx="30" cy="43" rx="18" ry="15" /><path d="M30 28h7a18 15 0 0 1 0 30h-7" /><circle cx="30" cy="43" r="8" /><circle cx="30" cy="43" r="2" /></>,
  unicorn: <><path d="m24 20 2-14 9 12 9-12-2 17 12 16-5 9-13-2-5 12H11l7-22 6-16Zm7 2c-15-3-23 10-22 23m26-27-11 9" /><circle cx="38" cy="30" r="1.5" /><path d="m44 38 5 2" /></>,
  interview: <><rect x="23" y="6" width="18" height="31" rx="9" /><path d="M16 27v5a16 16 0 0 0 32 0v-5M32 48v10m-11 0h22M29 13h6m-6 6h6m-6 6h6" /></>,
  gift: <><path d="M10 29h44v28H10ZM6 19h52v10H6ZM32 19v38" /><path d="M32 19C11 20 14 3 23 7c5 2 9 12 9 12Zm0 0C53 20 50 3 41 7c-5 2-9 12-9 12Z" /></>,
  dinner: <><circle cx="32" cy="32" r="18" /><circle cx="32" cy="32" r="12" /><path d="M5 8v15a4 4 0 0 0 8 0V8M9 8v48m48 0V8c-5 4-6 15-6 23h6" /></>,
};

export default function ShopIcon({ name, className = "" }) {
  return (
    <svg className={`shop-icon ${className}`} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {illustrations[name] || illustrations.bag}
    </svg>
  );
}
