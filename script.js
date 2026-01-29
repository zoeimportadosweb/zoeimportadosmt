const WHATSAPP_NUMBER = "5566992358200"; // altere se precisar

const HERO_IMAGES = ["assets/arte-smartwatch.jpg"];

let products = [];
let cart = {}; // { productId: qty }
let heroIndex = 0;

const money = (v) => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ===== Pix (BR Code / copia e cola) =====
function emv(id, value){
  const v = String(value);
  return String(id).padStart(2,"0") + String(v.length).padStart(2,"0") + v;
}
function crc16ccitt(str){
  let crc = 0xFFFF;
  for (let i=0;i<str.length;i++){
    crc ^= (str.charCodeAt(i) << 8);
    for (let j=0;j<8;j++){
      if (crc & 0x8000) crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      else crc = (crc << 1) & 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4,"0");
}
function buildPixPayload({key, name, city, amount, txid="***"}){
  const gui = emv("00","br.gov.bcb.pix");
  const k = emv("01", key);
  const desc = emv("02", "ZOE IMPORTADOS MT");
  const mai = emv("26", gui + k + desc);

  const payload =
    emv("00","01") +
    emv("01","12") +
    mai +
    emv("52","0000") +
    emv("53","986") +
    emv("54", amount.toFixed(2)) +
    emv("58","BR") +
    emv("59", name.substring(0,25)) +
    emv("60", city.substring(0,15)) +
    emv("62", emv("05", txid.substring(0,25)));

  const toCrc = payload + "6304";
  const crc = crc16ccitt(toCrc);
  return toCrc + crc;
}

function el(id){ return document.getElementById(id); }

function getDiscountFlags(){
  return {
    driver: el("discountDriver")?.checked || false,
    student: el("discountStudent")?.checked || false
  };
}

function getFrete(){
  const km = parseFloat(el("km")?.value || "0") || 0;
  return Math.max(0, km) * 1.5;
}

function productMatchesFilters(p){
  const q = (el("search")?.value || "").trim().toLowerCase();
  const cat = el("categoryFilter")?.value || "all";
  const inCat = (cat === "all") ? true : p.category === cat;
  const inQ = !q ? true : (p.name + " " + (p.desc || "")).toLowerCase().includes(q);
  return inCat && inQ;
}

function buildCategoryFilter(){
  const sel = el("categoryFilter");
  const cats = Array.from(new Set(products.map(p => p.category))).sort();
  sel.innerHTML = '<option value="all">Todas as categorias</option>' +
    cats.map(c => `<option value="${c}">${prettyCategory(c)}</option>`).join("");
}

function prettyCategory(c){
  const map = {
    "relogios":"Relógios",
    "mochilas":"Mochilas",
    "som":"Som & Fones",
    "casa":"Casa & Decoração",
    "seguranca":"Segurança",
    "iluminacao":"Iluminação",
    "moda":"Moda",
    "diversos":"Diversos"
  };
  return map[c] || (c.charAt(0).toUpperCase() + c.slice(1));
}

function renderProducts(){
  const wrap = el("products");
  wrap.innerHTML = "";
  const filtered = products.filter(productMatchesFilters);

  if (!filtered.length){
    wrap.innerHTML = '<div class="notice__card" style="grid-column:1/-1"><p>Nenhum produto encontrado.</p></div>';
    return;
  }

  filtered.forEach(p => {
    const qty = cart[p.id] || 0;
    const hasOld = typeof p.oldPrice === "number" && p.oldPrice > p.price;
    const img0 = (p.images && p.images[0]) ? p.images[0] : "";

    const card = document.createElement("div");
    card.className = "product";
    card.innerHTML = `
      <div class="product__media">
        <img src="${img0}" alt="${escapeHtml(p.name)}" data-pid="${p.id}" data-imgidx="0" />
        ${p.tag ? `<div class="product__tag">${escapeHtml(p.tag)}</div>` : ""}
        ${p.images && p.images.length > 1 ? `
          <div class="product__carousel">
            <button type="button" data-action="prevImg" data-pid="${p.id}">‹</button>
            <button type="button" data-action="nextImg" data-pid="${p.id}">›</button>
          </div>` : ""}
      </div>
      <div class="product__body">
        <h3 class="product__title">${escapeHtml(p.name)}</h3>
        ${p.desc ? `<p class="product__desc">${escapeHtml(p.desc)}</p>` : ""}
        <div class="price">
          <div class="price__now">${money(p.price)}</div>
          ${hasOld ? `<div class="price__old">${money(p.oldPrice)}</div>` : ""}
        </div>
        <div class="product__actions">
          <button class="btn btn--primary" data-action="add" data-pid="${p.id}">Adicionar</button>
          <div class="qty">
            <button class="btn" data-action="dec" data-pid="${p.id}">-</button>
            <strong>${qty}</strong>
            <button class="btn" data-action="inc" data-pid="${p.id}">+</button>
          </div>
        </div>
      </div>
    `;
    wrap.appendChild(card);
  });
}

function renderCart(){
  const wrap = el("cartItems");
  const entries = Object.entries(cart).filter(([,q]) => q > 0);

  if (!entries.length){
    wrap.innerHTML = "<p class='muted'>Seu carrinho está vazio.</p>";
    updateTotals();
    return;
  }

  wrap.innerHTML = "";
  for (const [pid, qty] of entries){
    const p = products.find(x => x.id === pid);
    if (!p) continue;

    const line = document.createElement("div");
    line.className = "cartitem";
    line.innerHTML = `
      <div class="cartitem__left">
        <div class="cartitem__name">${escapeHtml(p.name)}</div>
        <div class="cartitem__meta">${qty} × ${money(p.price)}</div>
      </div>
      <div class="cartitem__right">
        <div><strong>${money(p.price * qty)}</strong></div>
        <div class="cartitem__controls">
          <button class="btn" data-action="cartDec" data-pid="${pid}">-</button>
          <button class="btn" data-action="cartInc" data-pid="${pid}">+</button>
          <button class="btn" data-action="remove" data-pid="${pid}">🗑️</button>
        </div>
      </div>
    `;
    wrap.appendChild(line);
  }

  updateTotals();
}

function calcTotals(){
  const flags = getDiscountFlags();
  const frete = getFrete();

  let subtotal = 0;
  let discountValue = 0;

  for (const [pid, qty] of Object.entries(cart)){
    if (qty <= 0) continue;
    const p = products.find(x => x.id === pid);
    if (!p) continue;

    const line = p.price * qty;
    subtotal += line;

    // descontos:
    // motorista: 20% total
    // estudante: 40% apenas em mochilas e fones
    const eligibleStudent = (p.category === "mochilas" || (p.name || "").toLowerCase().includes("fone"));
    const discDriver = flags.driver ? 0.20 : 0;
    const discStudent = (flags.student && eligibleStudent) ? 0.40 : 0;

    const bestDisc = Math.max(discDriver, discStudent);
    discountValue += line * bestDisc;
  }

  const total = Math.max(0, subtotal - discountValue) + frete;
  const pixTotal = total * 0.85;

  return { subtotal, discountValue, frete, total, pixTotal };
}

function updateTotals(){
  const t = calcTotals();
  el("freteValue").textContent = money(t.frete);
  el("freteTotal").textContent = money(t.frete);
  el("subtotal").textContent = money(t.subtotal);
  el("discounts").textContent = "- " + money(t.discountValue);
  el("total").textContent = money(t.total);
  el("pixTotal").textContent = money(t.pixTotal);

  updatePixUI();
}

function addToCart(pid, delta=1){
  cart[pid] = (cart[pid] || 0) + delta;
  if (cart[pid] < 0) cart[pid] = 0;
  renderProducts();
  renderCart();
  saveCart();
}

function removeFromCart(pid){
  delete cart[pid];
  renderProducts();
  renderCart();
  saveCart();
}

function saveCart(){
  try{ localStorage.setItem("zoe_cart", JSON.stringify(cart)); }catch(e){}
}
function loadCart(){
  try{
    const raw = localStorage.getItem("zoe_cart");
    if (raw) cart = JSON.parse(raw) || {};
  }catch(e){ cart = {}; }
}

function escapeHtml(str){
  return String(str || "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function rotateHero(next=true){
  heroIndex = (heroIndex + (next ? 1 : -1) + HERO_IMAGES.length) % HERO_IMAGES.length;
  const img = el("heroImg");
  img.src = HERO_IMAGES[heroIndex].src;
  img.alt = HERO_IMAGES[heroIndex].alt;
  updateHeroDots();
}

function updateHeroDots(){
  const dots = el("heroDots");
  dots.innerHTML = "";
  HERO_IMAGES.forEach((_, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("aria-current", i === heroIndex ? "true" : "false");
    b.addEventListener("click", () => { heroIndex = i; rotateHero(true); });
    dots.appendChild(b);
  });
}

function cycleProductImage(pid, dir){
  const img = document.querySelector(`img[data-pid="${pid}"]`);
  if (!img) return;
  const p = products.find(x => x.id === pid);
  if (!p || !p.images || p.images.length < 2) return;

  let idx = parseInt(img.dataset.imgidx || "0", 10) || 0;
  idx = (idx + dir + p.images.length) % p.images.length;
  img.dataset.imgidx = String(idx);
  img.src = p.images[idx];
}

function buildWhatsAppMessage(){
  const entries = Object.entries(cart).filter(([,q]) => q > 0);
  if (!entries.length) return null;

  const flags = getDiscountFlags();
  const address = (el("address")?.value || "").trim();
  const km = parseFloat(el("km")?.value || "0") || 0;

  const t = calcTotals();

  const lines = [];
  lines.push("🛒 *Pedido - ZOE IMPORTADOS MT*");
  lines.push("");
  lines.push("*Itens:*");

  for (const [pid, qty] of entries){
    const p = products.find(x => x.id === pid);
    if (!p) continue;
    lines.push(`• ${qty}x ${p.name} - ${money(p.price * qty)}`);
  }

  lines.push("");
  lines.push(`Subtotal: ${money(t.subtotal)}`);
  lines.push(`Descontos: -${money(t.discountValue)}`);

  if (address) lines.push(`Endereço: ${address}`);
  if (km > 0) lines.push(`Distância: ${km} km`);
  lines.push(`Frete: ${money(t.frete)}`);
  lines.push(`*Total: ${money(t.total)}*`);
  lines.push(`*Total no Pix (15% OFF): ${money(t.pixTotal)}*`);

  lines.push("");
  lines.push("*Descontos marcados:*");
  lines.push(`• Motorista de app: ${flags.driver ? "SIM" : "NÃO"}`);
  lines.push(`• Estudante: ${flags.student ? "SIM" : "NÃO"}`);

  lines.push("");
  lines.push("*Pagamento:*");
  lines.push("• Pix (15% OFF): CNPJ 38.052.604/0001-54 (QR Code no site – definir valor no app)");
  lines.push("• Cartão de crédito: consulte no atendimento");
  lines.push("");
  lines.push("✅ Para finalizar, confirme este pedido e informe a forma de pagamento. Após pagar, envie o comprovante com a mensagem: *COMPRA FINALIZADA*.");

  return lines.join("\n");
}

function bindEvents(){
  document.body.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const act = btn.dataset.action;
    const pid = btn.dataset.pid;

    if (act === "add" || act === "inc") addToCart(pid, 1);
    if (act === "dec") addToCart(pid, -1);

    if (act === "cartInc") addToCart(pid, 1);
    if (act === "cartDec") addToCart(pid, -1);
    if (act === "remove") removeFromCart(pid);

    if (act === "prevImg") cycleProductImage(pid, -1);
    if (act === "nextImg") cycleProductImage(pid, +1);
  });

  ["search","categoryFilter","discountDriver","discountStudent","km","address"].forEach(id => {
    const x = el(id);
    if (!x) return;
    x.addEventListener("input", () => {
      renderProducts();
      renderCart();
      updateTotals();
    });
    x.addEventListener("change", () => {
      renderProducts();
      renderCart();
      updateTotals();
    });
  });

  el("whatsBtn").addEventListener("click", () => {
    const msg = buildWhatsAppMessage();
    if (!msg){
      alert("Seu carrinho está vazio.");
      return;
    }
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  });

  el("copyPix").addEventListener("click", async () => {
    const key = el("pixKey").textContent.trim();
    try{
      await navigator.clipboard.writeText(key);
      el("copyPix").textContent = "Copiado ✅";
      setTimeout(() => el("copyPix").textContent = "Copiar chave Pix", 1500);
    }catch(e){
      alert("Não consegui copiar automaticamente. Copie manualmente: " + key);
    }
  });

  // hero
  el("heroPrev").addEventListener("click", () => rotateHero(false));
  el("heroNext").addEventListener("click", () => rotateHero(true));
}

async 

function updatePixUI(){
  const qrImg = document.getElementById("pixQrImg");
  const copia = document.getElementById("pixCopiaCola");
  const pixKeyEl = document.getElementById("pixKey");
  if (!qrImg || !copia || !pixKeyEl) return;

  // Recalcula a partir do estado atual do carrinho
  const subtotal = calcSubtotal(cart);
  const freight = calcFreight();
  const discount = calcDiscount(subtotal);
  const total = Math.max(0, subtotal - discount) + freight;
  const pixTotal = total * (1 - PIX_DISCOUNT);

  const payload = buildPixPayload({
    key: pixKeyEl.value.trim() || "38.052.604/0001-54",
    name: "ZOE IMPORTADOS MT",
    city: "SINOP",
    amount: pixTotal,
    txid: "ZOEIMPORTADOS"
  });

  copia.value = payload;
  const data = encodeURIComponent(payload);
  qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${data}`;
}

async function init(){
  el("year").textContent = String(new Date().getFullYear());

  // hero dots
  updateHeroDots();

  // products
  const res = await fetch("products.json", { cache: "no-store" });
  products = await res.json();

  loadCart();
  buildCategoryFilter();
  renderProducts();
  renderCart();
  updateTotals();
  bindEvents();
}

init().catch((err) => {
  console.error(err);
  alert("Erro ao carregar a loja. Verifique se products.json está na raiz do repositório.");
});


// Copiar Pix (copia e cola)
const copyPixCodeBtn = document.getElementById("copyPixCodeBtn");
if (copyPixCodeBtn){
  copyPixCodeBtn.addEventListener("click", async () => {
    const t = document.getElementById("pixCopiaCola")?.value || "";
    if (!t) return;
    try{
      await navigator.clipboard.writeText(t);
      alert("Pix (copia e cola) copiado!");
    }catch(e){
      const ta = document.getElementById("pixCopiaCola");
      if (ta){ ta.select(); document.execCommand("copy"); alert("Pix (copia e cola) copiado!"); }
    }
  });
}
