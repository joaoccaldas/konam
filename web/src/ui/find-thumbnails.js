// Lazy collected-Find thumbnail helper. No ownership logic lives here.
(()=>{const safe=s=>String(s??'').replace(/[&<>"']/g,'');
const glyph=item=>{const t=(item.name+' '+item.category+' '+item.place).toLowerCase();
 if(/flower|plumeria/.test(t))return '✦';if(/shell|cowrie/.test(t))return '◒';
 if(/bib|number|timing|clock|stopwatch/.test(t))return '09';if(/rock|lava|basalt|stone|shard/.test(t))return '◆';
 if(/coral|reef/.test(t))return '⌁';if(/spoke|bearing|chain|valve|torx|carbon|aero|wind/.test(t))return '△';
 if(/coffee|gel|bottle/.test(t))return '◉';if(/pin|sticker|tag|chip|token/.test(t))return '◇';
 return String(item.number||'').padStart(2,'0').slice(-2);};
globalThis.__findThumbnailData=item=>{const g=safe(glyph(item)),n=safe(item.name),r=safe(String(item.rarity||'find').toUpperCase());
 const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><rect width="320" height="200" rx="24" fill="#f3eee5"/><circle cx="253" cy="41" r="72" fill="#e96a2818"/><path d="M0 160 C65 122 108 183 168 148 S269 101 320 131 V200 H0Z" fill="#0d7c8618"/><text x="24" y="96" font-family="Georgia,serif" font-size="64" fill="#182126">'+g+'</text><text x="24" y="151" font-family="Arial,sans-serif" font-size="16" font-weight="700" fill="#182126">'+n+'</text><text x="24" y="176" font-family="Arial,sans-serif" font-size="11" letter-spacing="2" fill="#687277">'+r+'</text></svg>';
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);};
})();