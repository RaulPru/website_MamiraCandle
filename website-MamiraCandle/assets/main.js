// Conținutul produselor este citit din index.html, nu duplicat în acest fișier.
function salvieApp() {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const money = (value) => new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 2 }).format(value) + " lei";
  const parsePrice = (text) => {
    const number = Number(text.replace(/[^\d,.\s]/g, "").trim().replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(number) && number > 0 ? Math.round(number * 100) / 100 : null;
  };
  const products = () => $$("[data-product]").map((node) => ({
    id: node.dataset.id,
    name: $("h3", node).textContent.trim(),
    price: parsePrice($(".price", node).textContent),
    image: $("img", node).getAttribute("src"),
    aroma: node.dataset.aroma,
    notes: $(".product-notes", node).textContent.trim(),
    gramaj: $(".product-meta", node).textContent.split("·")[0].trim(),
    ardere: ($(".product-meta", node).textContent.split("·")[1] || "").trim(),
    description: node.dataset.descriere,
    node
  }));
  let cart = {};
  let editing = false;
  let currentProduct = null;
  let focusBefore = null;
  let toastTimer;
  try {
    const saved = JSON.parse(localStorage.getItem("salvie-cos") || "{}");
    const ids = products().map((product) => product.id);
    for (const [id, quantity] of Object.entries(saved)) {
      if (ids.includes(id) && Number.isInteger(quantity) && quantity > 0 && quantity <= 99) cart[id] = quantity;
    }
  } catch { /* Coșul funcționează și dacă stocarea locală este dezactivată. */ }
  function toast(text) {
    clearTimeout(toastTimer);
    const element = $("[data-toast]");
    element.textContent = text;
    element.hidden = false;
    toastTimer = setTimeout(() => { element.hidden = true; }, 3200);
  }
  function totalValues() {
    const subtotal = Math.round(products().reduce((sum, product) => sum + (product.price || 0) * (cart[product.id] || 0), 0) * 100) / 100;
    const shipping = subtotal === 0 || subtotal >= 250 ? 0 : 19;
    return { subtotal, shipping, total: Math.round((subtotal + shipping) * 100) / 100 };
  }
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function renderCart() {
    const container = $("[data-cart-items]");
    container.replaceChildren();
    let count = 0;
    for (const product of products()) {
      const quantity = cart[product.id] || 0;
      if (!quantity) continue;
      count += quantity;
      const item = element("article", "cart-item");
      const image = element("img");
      image.src = product.image; image.alt = product.name;
      const content = element("div");
      content.append(element("h3", "", product.name), element("p", "", money((product.price || 0) * quantity)));
      const controls = element("div", "quantity");
      for (const [label, change] of [["−", -1], ["+", 1]]) {
        const button = element("button", "", label);
        button.type = "button";
        button.setAttribute("aria-label", (change < 0 ? "Redu cantitatea: " : "Mărește cantitatea: ") + product.name);
        button.disabled = change > 0 && quantity >= 99;
        button.onclick = () => {
          cart[product.id] = Math.min(99, quantity + change);
          if (cart[product.id] <= 0) delete cart[product.id];
          renderCart();
          const replacement = $$(".cart-item").find((row) => $("h3", row).textContent === product.name);
          if (replacement) $("button", replacement).focus();
          else $("[data-cart-close]").focus();
        };
        controls.append(button);
        if (change < 0) controls.append(element("span", "", String(quantity)));
      }
      const remove = element("button", "remove", "Șterge");
      remove.type = "button";
      remove.setAttribute("aria-label", "Șterge " + product.name);
      remove.onclick = () => { delete cart[product.id]; renderCart(); $("[data-cart-close]").focus(); };
      controls.append(remove); content.append(controls); item.append(image, content); container.append(item);
    }
    if (!count) container.append(element("p", "drawer-empty", "Coșul este gol. Alege o aromă din colecție."));
    const totals = totalValues();
    $("[data-cart-count]").textContent = count;
    $("[data-cart-count]").hidden = !count;
    $("[data-subtotal]").textContent = money(totals.subtotal);
    $("[data-shipping]").textContent = totals.shipping ? money(totals.shipping) : "Gratuit";
    $("[data-total]").textContent = money(totals.total);
    $("[data-checkout]").disabled = !count || products().some((p) => cart[p.id] && !p.price);
    try { localStorage.setItem("salvie-cos", JSON.stringify(cart)); } catch { /* opțional */ }
  }
  function openCart() {
    focusBefore = document.activeElement;
    $("[data-cart]").hidden = false; $("[data-cart-backdrop]").hidden = false;
    document.body.classList.add("overlay-open");
    $("[data-cart-close]").focus();
  }
  function closeCart() {
    $("[data-cart]").hidden = true; $("[data-cart-backdrop]").hidden = true;
    document.body.classList.remove("overlay-open");
    focusBefore?.focus();
  }
  function add(id) {
    const product = products().find((p) => p.id === id);
    if (!product || !product.price) { toast("Introduce un preț valid, mai mare decât zero."); return; }
    cart[id] = Math.min(99, (cart[id] || 0) + 1);
    renderCart();
    toast(product.name + " a fost adăugată în coș.");
  }
  function showProduct(id) {
    const p = products().find((product) => product.id === id);
    if (!p) return;
    currentProduct = id;
    $("[data-modal-image]").src = p.image;
    $("[data-modal-image]").alt = p.name;
    $("[data-modal-title]").textContent = p.name;
    $("[data-modal-desc]").textContent = p.description;
    $("[data-modal-aroma]").textContent = p.aroma;
    $("[data-modal-price]").textContent = money(p.price || 0);
    $("[data-modal-gramaj]").textContent = p.gramaj;
    $("[data-modal-ardere]").textContent = p.ardere;
    $("[data-modal-desc]").contentEditable = editing ? "true" : "false";
    $("[data-product-modal]").showModal();
  }
  function orderSummary() {
    const lines = products().filter((p) => cart[p.id]).map((p) =>
      `${cart[p.id]} × ${p.name} — ${money((p.price || 0) * cart[p.id])}`);
    const t = totalValues();
    return "COMANDĂ DEMONSTRATIVĂ — NU A FOST TRIMISĂ\n\n" + lines.join("\n") +
      `\n\nSubtotal: ${money(t.subtotal)}\nTransport estimativ: ${money(t.shipping)}\nTotal: ${money(t.total)}`;
  }
  function download(content, filename, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = element("a"); anchor.href = url; anchor.download = filename;
    document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  function enableEditor(enabled) {
    editing = enabled;
    document.body.classList.toggle("editing", enabled);
    $("[data-editor-toolbar]").hidden = !enabled;
    const selectors = ".hero-copy h1,.hero-copy .hero-lead,.hero-copy .eyebrow,.wordmark-letters,.wordmark-sub,.section-head h2,.section-note,.product-body h3,.product-notes,.product-meta,.product-body .price,.atelier-copy h2,.atelier-copy > p,.steps h3,.steps p,.care-grid h3,.care-grid p,.contact h2,.contact-lead,.contact-list dd,.footer-mark,.footer-note";
    for (const node of $$(selectors)) {
      if (enabled) { node.setAttribute("contenteditable", "true"); node.spellcheck = false; }
      else node.removeAttribute("contenteditable");
    }
    if (enabled) toast("Poți edita textele și prețurile direct în pagină.");
  }
  async function exportHtml() {
    const save = $("[data-editor-save]");
    if (products().some((p) => !p.price)) { toast("Verifică prețurile: folosește numere mai mari decât zero."); return; }
    save.disabled = true; save.textContent = "Se pregătește fișierul…";
    try {
      const clone = document.documentElement.cloneNode(true);
      const css = [...document.styleSheets].flatMap((sheet) => {
        try { return [...sheet.cssRules].map((rule) => rule.cssText); } catch { return []; }
      }).join("\n");
      if (!css) throw new Error("Nu pot include stilurile. Deschide versiunea de previzualizare și încearcă din nou.");
      for (const link of $$('link[rel="stylesheet"]', clone)) {
        if (!/^https:/.test(link.getAttribute("href"))) link.remove();
      }
      for (const style of $$("style", clone)) style.remove();
      const style = element("style"); style.textContent = css; $("head", clone).append(style);
      const toDataUrl = async (src) => {
        if (src.startsWith("data:")) return src;
        const response = await fetch(src);
        if (!response.ok) throw new Error("O fotografie nu a putut fi inclusă.");
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob);
        });
      };
      for (const img of $$("img[data-image-slot]", clone)) {
        img.src = await toDataUrl(img.getAttribute("src"));
        img.removeAttribute("data-image-slot");
      }
      for (const card of $$("[data-product]", clone)) {
        card.hidden = false;
        card.dataset.nume = $("h3", card).textContent.trim();
        card.dataset.pret = String(parsePrice($(".price", card).textContent));
        card.dataset.imagine = $("img", card).getAttribute("src");
      }
      for (const chip of $$("[data-filter]", clone)) {
        const active = chip.dataset.filter === "toate";
        chip.classList.toggle("is-active", active); chip.setAttribute("aria-pressed", active);
      }
      $("[data-filter-count]", clone).textContent = products().length + " lumânări";
      $("[data-empty]", clone).hidden = true;
      for (const node of $$("[contenteditable]", clone)) { node.removeAttribute("contenteditable"); node.removeAttribute("spellcheck"); }
      $("body", clone).classList.remove("editing", "overlay-open");
      $("[data-editor-toolbar]", clone).hidden = true;
      for (const node of $$("[data-cart],[data-cart-backdrop],[data-modal-backdrop],[data-toast]", clone)) node.hidden = true;
      for (const dialog of $$("dialog", clone)) dialog.removeAttribute("open");
      for (const img of $$("[data-modal-image]", clone)) img.removeAttribute("src");
      $("[data-cart-items]", clone).replaceChildren();
      for (const script of $$('script:not([type="application/ld+json"])', clone)) script.remove();
      const script = element("script"); script.textContent = "(" + salvieApp.toString() + ")();";
      $("body", clone).append(script);
      $("[data-editor-save]", clone).disabled = false;
      $("[data-editor-save]", clone).textContent = "Salvează index.html";
      download("<!doctype html>\n" + clone.outerHTML, "index.html", "text/html;charset=utf-8");
      toast("Fișierul index.html a fost salvat cu textele, stilurile și fotografiile.");
    } catch (error) {
      toast(error.message || "Salvarea nu a reușit. Încearcă din previzualizarea online.");
    } finally { save.disabled = false; save.textContent = "Salvează index.html"; }
  }
  // Versiunea din arhivă folosește căi relative și poate fi deschisă local.
  if (location.protocol === "file:") {
    for (const img of $$("img[data-image-slot]")) {
      const src = img.getAttribute("src");
      if (src?.startsWith("/assets/")) img.setAttribute("src", src.slice(1));
    }
  }
  for (const button of $$("[data-filter]")) button.addEventListener("click", () => {
    for (const chip of $$("[data-filter]")) {
      const active = chip === button; chip.classList.toggle("is-active", active); chip.setAttribute("aria-pressed", active);
    }
    let visible = 0;
    for (const product of $$("[data-product]")) {
      const show = button.dataset.filter === "toate" || product.dataset.aroma === button.dataset.filter;
      product.hidden = !show; if (show) visible++;
    }
    $("[data-filter-count]").textContent = `${visible} ${visible === 1 ? "lumânare" : "lumânări"}`;
    $("[data-empty]").hidden = !!visible;
  });
  for (const product of $$("[data-product]")) {
    $("[data-add]", product).onclick = () => add(product.dataset.id);
    $("[data-open-product]", product).setAttribute("aria-label", "Vezi detalii: " + $("h3", product).textContent);
    $("[data-open-product]", product).onclick = () => showProduct(product.dataset.id);
  }
  $("[data-cart-open]").onclick = openCart;
  $("[data-cart-close]").onclick = closeCart;
  $("[data-cart-backdrop]").onclick = closeCart;
  $("[data-modal-close]").onclick = () => $("[data-product-modal]").close();
  $("[data-modal-add]").onclick = () => add(currentProduct);
  for (const dialog of $$("dialog")) dialog.addEventListener("click", (event) => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
  $("[data-checkout]").onclick = () => {
    if (!Object.keys(cart).length) return;
    $("[data-order-summary]").textContent = orderSummary(); $("[data-order-modal]").showModal();
  };
  $("[data-order-close]").onclick = () => $("[data-order-modal]").close();
  $("[data-order-download]").onclick = () => download(orderSummary(), "comanda-demo.txt", "text/plain;charset=utf-8");
  $("[data-editor-start]").onclick = () => enableEditor(true);
  $("[data-editor-stop]").onclick = () => enableEditor(false);
  $("[data-editor-save]").onclick = exportHtml;
  document.addEventListener("input", (event) => {
    if (editing && event.target.matches(".product-body .price,.product-body h3")) renderCart();
    if (editing && event.target.matches("[data-modal-desc]")) {
      const product = products().find((p) => p.id === currentProduct);
      if (product) product.node.dataset.descriere = event.target.textContent.trim();
    }
  });
  document.addEventListener("paste", (event) => {
    if (!editing || !event.target.closest('[contenteditable="true"]')) return;
    event.preventDefault();
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode(event.clipboardData.getData("text/plain"));
    range.insertNode(node); range.setStartAfter(node); range.collapse(true);
    selection.removeAllRanges(); selection.addRange(range);
    event.target.dispatchEvent(new Event("input", { bubbles: true }));
  });
  document.addEventListener("keydown", (event) => {
    if ($("[data-cart]").hidden || $("dialog[open]")) return;
    if (event.key === "Escape") { closeCart(); return; }
    if (event.key !== "Tab") return;
    const focusable = $$("button:not(:disabled),a[href]", $("[data-cart]"));
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  renderCart();
}
salvieApp();
