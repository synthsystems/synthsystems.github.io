(() => {
  const KINDS = [
    { id: "all", label: "All", plural: "items", one: "item" },
    { id: "app", label: "Apps", plural: "apps", one: "app" },
    { id: "repo", label: "Repos", plural: "repos", one: "repo" },
    { id: "extension", label: "Extensions", plural: "extensions", one: "extension" },
    { id: "news", label: "News", plural: "news items", one: "news item" },
  ];
  const $ = (id) => document.getElementById(id);
  const pad = (n) => String(n).padStart(2, "0");
  // Entries are added ahead of time; each one shows from its video's publish date (viewer's local day).
  const now = new Date();
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  let tools = [];
  let kind = "all";

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  function query() {
    const raw = $("q").value.trim().toLowerCase().replace(/^#/, "");
    if (!raw) return { raw, num: null, text: "" };
    const num = /^\d+$/.test(raw) ? Number(raw) : null;
    return { raw, num, text: num === null ? raw : "" };
  }

  function rowHtml(t, hit) {
    const k = KINDS.find((x) => x.id === t.kind);
    const kindLabel = k ? k.one.replace(/^./, (c) => c.toUpperCase()) : t.kind;
    return `<tr id="t${pad(t.n)}" class="${hit ? "hit" : ""}">
      <td class="c-n">${pad(t.n)}</td>
      <td class="c-tool"><div class="name">${esc(t.name)}</div><div class="what">${esc(t.what)}</div>
        <div class="meta">${esc(t.job)} · ${esc(kindLabel)} · <span class="nowrap">added ${esc(t.added)}</span></div></td>
      <td class="c-job">${esc(t.job)}</td>
      <td class="c-added">${esc(t.added)}</td>
      <td class="c-open"><a class="open" href="${esc(t.url)}" rel="noopener" aria-label="Open ${esc(t.name)}">Open ↗</a></td>
    </tr>`;
  }

  function render(scrollToHit) {
    const q = query();
    const newest = tools.reduce((m, t) => Math.max(m, t.n), 0);
    const inKind = tools.filter((t) => kind === "all" || t.kind === kind);

    $("tabs").innerHTML = KINDS.map((k) => {
      const n = tools.filter((t) => k.id === "all" || t.kind === k.id).length;
      return `<button class="tab" role="tab" type="button" data-kind="${k.id}" aria-selected="${k.id === kind}">${k.label}<span class="num">${n}</span></button>`;
    }).join("");

    let rows = inKind;
    if (q.text) rows = inKind.filter((t) => `${t.name} ${t.job} ${t.what}`.toLowerCase().includes(q.text));
    rows = [...rows].sort((a, b) => b.n - a.n);

    const hit = q.num !== null ? tools.find((t) => t.n === q.num) : null;
    const answer = $("answer");
    if (q.num !== null && hit) {
      answer.innerHTML = `#${pad(hit.n)} is <strong>${esc(hit.name)}</strong>. <a href="${esc(hit.url)}" rel="noopener">Open ${esc(hit.name)} ↗</a>`;
    } else if (q.num !== null) {
      answer.textContent = `There's no #${pad(q.num)} yet. The newest tool is #${pad(newest)}.`;
    } else if (q.text && rows.length === 0) {
      answer.textContent = `Nothing matches "${q.raw}".`;
    } else {
      answer.textContent = "";
    }
    if (hit && kind !== "all" && hit.kind !== kind) rows = [hit, ...rows];

    const cur = KINDS.find((k) => k.id === kind);
    const plural = cur.plural;
    $("count").textContent = `${rows.length} ${rows.length === 1 ? cur.one : plural} · newest first`;

    $("rows").innerHTML = rows.length
      ? rows.map((t) => rowHtml(t, hit && t.n === hit.n)).join("")
      : `<tr class="empty"><td colspan="5">No ${plural} yet. They show up here as the Shorts go out.</td></tr>`;

    if (scrollToHit && hit) $("t" + pad(hit.n))?.scrollIntoView({ block: "center" });
  }

  function fromHash() {
    const m = location.hash.match(/^#0*(\d+)$/);
    if (!m) return false;
    $("q").value = m[1];
    return true;
  }

  $("q").addEventListener("input", () => {
    const q = query();
    history.replaceState(null, "", q.num !== null ? `#${pad(q.num)}` : location.pathname);
    render(false);
  });
  $("tabs").addEventListener("click", (e) => {
    const b = e.target.closest(".tab");
    if (!b) return;
    kind = b.dataset.kind;
    render(false);
  });
  window.addEventListener("hashchange", () => fromHash() && render(true));

  fetch("tools.json", { cache: "no-cache" })
    .then((r) => {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    })
    .then((data) => {
      tools = data.tools.filter((t) => t.added <= today);
      console.assert(new Set(tools.map((t) => t.n)).size === tools.length, "tool numbers must be unique");
      $("updated").textContent = `Updated ${data.updated}`;
      render(fromHash());
    })
    .catch(() => {
      $("rows").innerHTML = `<tr class="empty"><td colspan="5">The list didn't load. Refresh the page, or open <a href="tools.json">tools.json</a>.</td></tr>`;
    });
})();
