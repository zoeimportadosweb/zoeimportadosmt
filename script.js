// ZOE IMPORTADOS MT - Loja com carrinho e finalização no WhatsApp
const WHATS_NUMBER = "5566992358200"; // +55 66 99235-8200
const PIX_DISCOUNT = 0.15;

const fmtBRL = (value) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const state = {
  products: [],
  filter: "todos",
  cart: {} // {id: qty}
};

const el = (id) => document.getElementById(id);

function openNavIfMobile(open){
  const nav = el("nav");
  if (!nav) return;
  if (open) nav.classList.add("is-open");
  else nav.classList.remove("is-open");
}

function openDrawer(open){
  el("drawer").classList.toggle("show", open);
  el("backdrop").classList.toggle("show", open);
}

function saveCart(){
  try{ localStorage.setItem("zoe_cart", JSON.stringify(state.cart)); }catch(e){}
}
function loadCart(){
  try{
    const raw = localStorage.getItem("zoe_cart");
    if (raw) state.cart = JSON.parse(raw) || {};
  }catch(e){}
}

function cartCount(){
  return Object.values(state.cart).reduce((a,b)=>a+b,0);
}

function cartItems(){
  const items = [];
  for (const [id, qty] of Object.entries(state.cart)){
    const p = state.products.find(x=>x.id===id);
    if (p) items.push({p, qty});
  }
  return items;
}

function cartTotals(){
  const total = cartItems().reduce((sum, it)=> sum + it.p.price * it.qty, 0);
  const pix = Math.max(0, total * (1 - PIX_DISCOUNT));
  return { total, pix };
}

function setFilter(filter){
  state.filter = filter;
  document.querySelectorAll(".chip").forEach(btn=>{
    btn.classList.toggle("active", btn.dataset.filter === filter);
  });
  renderCatalog();
  location.hash = "#produtos";
}

function addToCart(id){
  state.cart[id] = (state.cart[id] || 0) + 1;
  saveCart();
  renderCart();
}

function updateQty(id, delta){
  const q = (state.cart[id] || 0) + delta;
  if (q <= 0) delete state.cart[id];
  else state.cart[id] = q;
  saveCart();
  renderCart();
}

function clearCart(){
  state.cart = {};
  saveCart();
  renderCart();
}

function buildWhatsLink(message){
  const url = new URL("https://wa.me/" + WHATS_NUMBER);
  url.searchParams.set("text", message);
  return url.toString();
}

function checkout(){
  const items = cartItems();
  if (!items.length) return;

  const { total, pix } = cartTotals();

  const lines = [];
  lines.push("Olá! Vim pelo site da ZOE IMPORTADOS MT 🛍️");
  lines.push("");
  lines.push("🛒 Meu carrinho:");
  items.forEach(({p, qty})=>{
    lines.push(`• ${p.name} (x${qty}) — ${fmtBRL(p.price * qty)}`);
  });
  lines.push("");
  lines.push(`💰 Total: ${fmtBRL(total)}`);
  lines.push(`💸 Total no Pix (15% OFF): ${fmtBRL(pix)}`);
  lines.push("");
  lines.push("📍 Rua das Primaveras, 5138 — Jardim Primaveras — Sinop-MT");
  lines.push("✅ Pode confirmar disponibilidade?");

  const link = buildWhatsLink(lines.join("\n"));
  window.open(link, "_blank", "noopener");
}

function productCard(p){
  const old = p.oldPrice ? `<span class="old">${fmtBRL(p.oldPrice)}</span>` : "";
  const hasCarousel = Array.isArray(p.images) && p.images.length > 1;
  const carousel = hasCarousel ? `
      <div class="carousel" data-carousel="${p.id}" data-index="0">
        <img class="carousel__img" src="${p.images[0]}" alt="${p.name}">
        <button class="carousel__btn prev" type="button" aria-label="Foto anterior" data-prev="${p.id}">‹</button>
        <button class="carousel__btn next" type="button" aria-label="Próxima foto" data-next="${p.id}">›</button>
        <div class="carousel__dots">
          ${p.images.map((_,i)=>`<span class="carousel__dot ${i===0?'active':''}" data-dot="${p.id}" data-i="${i}"></span>`).join("")}
        </div>
      </div>
  ` : `<img class="product__img" src="${p.image}" alt="${p.name}">`;

  const note = p.note ? `<p class="product__desc"><strong>${p.note}</strong></p>` : "";

  return `
    <article class="product">
      ${carousel}
      <div class="product__body">
        <div class="product__row">
          <div><h3 class="product__name">${p.name}</h3></div>
          <span class="tag">${p.tag || "Pronta entrega"}</span>
        </div>
        <p class="product__desc">${p.desc || ""}</p>
        ${note}
        <div class="product__row">
          <div class="priceWrap">
            <span class="price">${fmtBRL(p.price)}</span>${old}
          </div>
          <div class="actions">
            <button class="btn primary" data-add="${p.id}">Adicionar</button>
          </div>
        </div>
      </div>
    </article>
  `;
}

function initCarousels(root){
  const host = root || document;
  const carousels = host.querySelectorAll("[data-carousel]");
  carousels.forEach(c=>{
    const id = c.dataset.carousel;
    const p = state.products.find(x=>x.id===id);
    if (!p || !Array.isArray(p.images) || p.images.length < 2) return;

    const img = c.querySelector("img");
    const dots = Array.from(c.querySelectorAll("[data-dot]"));

    const setIdx = (idx)=>{
      const len = p.images.length;
      const next = (idx + len) % len;
      c.dataset.index = String(next);
      img.src = p.images[next];
      dots.forEach(d=> d.classList.toggle("active", parseInt(d.dataset.i,10)===next));
    };

    c.querySelector("[data-prev]")?.addEventListener("click", ()=> setIdx(parseInt(c.dataset.index,10)-1));
    c.querySelector("[data-next]")?.addEventListener("click", ()=> setIdx(parseInt(c.dataset.index,10)+1));
    dots.forEach(d=>{
      d.addEventListener("click", ()=> setIdx(parseInt(d.dataset.i,10)));
    });
  });
}



function renderHighlights(){
  const host = el("highlights");
  if (!host) return;
  const highlights = state.products.filter(p=>p.highlight).slice(0,4);
  host.innerHTML = highlights.map(productCard).join("");
  initCarousels(host);
  initCarousels(host);
  host.querySelectorAll("[data-add]").forEach(btn=>{
    btn.addEventListener("click", ()=> addToCart(btn.dataset.add));
  });
}

function renderCatalog(){
  const host = el("catalog");
  if (!host) return;
  const filtered = state.filter==="todos" ? state.products : state.products.filter(p=>p.category===state.filter);
  host.innerHTML = filtered.map(productCard).join("");
  host.querySelectorAll("[data-add]").forEach(btn=>{
    btn.addEventListener("click", ()=> addToCart(btn.dataset.add));
  });
}

function renderCart(){
  el("cartCount").textContent = cartCount().toString();

  const list = el("cartList");
  const empty = el("cartEmpty");
  const items = cartItems();

  if (!items.length){
    empty.style.display = "block";
    list.innerHTML = "";
  } else {
    empty.style.display = "none";
    list.innerHTML = items.map(({p, qty})=>`
      <div class="cartItem">
        <img src="${p.image}" alt="${p.name}">
        <div class="cartItem__info">
          <div class="cartItem__name">${p.name}</div>
          <div class="cartItem__meta">${fmtBRL(p.price)} • ${p.tag || ""}</div>
        </div>
        <div class="qty">
          <button data-q="${p.id}" data-d="-1">−</button>
          <span>${qty}</span>
          <button data-q="${p.id}" data-d="1">+</button>
        </div>
      </div>
    `).join("");

    list.querySelectorAll("[data-q]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.dataset.q;
        const d = parseInt(btn.dataset.d, 10);
        updateQty(id, d);
      });
    });
  }

  const { total, pix } = cartTotals();
  el("total").textContent = fmtBRL(total);
  el("totalPix").textContent = fmtBRL(pix);
}

async function init(){
  const y = el("year");
  if (y) y.textContent = new Date().getFullYear().toString();

  el("menuBtn")?.addEventListener("click", ()=> openNavIfMobile(!el("nav").classList.contains("is-open")));
  el("cartBtn")?.addEventListener("click", ()=> openDrawer(true));
  el("closeCart")?.addEventListener("click", ()=> openDrawer(false));
  el("backdrop")?.addEventListener("click", ()=> openDrawer(false));

  document.querySelectorAll(".chip").forEach(btn=>{
    btn.addEventListener("click", ()=> setFilter(btn.dataset.filter));
  });
  document.querySelectorAll(".linkBtn").forEach(btn=>{
    btn.addEventListener("click", ()=> setFilter(btn.dataset.filter));
  });

  const msg = "Olá! Quero comprar na ZOE IMPORTADOS MT 🛍️";
  const link = buildWhatsLink(msg);
  el("whatsHero").href = link;
  el("whatsAbout").href = link;
  el("floatWhats").href = link;

  const res = await fetch("products.json", { cache: "no-store" });
  state.products = await res.json();

  loadCart();

  renderHighlights();
  renderCatalog();
  renderCart();

  el("checkout")?.addEventListener("click", checkout);
  el("clear")?.addEventListener("click", clearCart);
}

init().catch(err=>{
  console.error(err);
  alert("Erro ao carregar produtos. Verifique se products.json está no repositório.");
});
