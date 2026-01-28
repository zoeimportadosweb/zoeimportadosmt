const WHATSAPP_NUMBER = "5566992358200";
const PIX_DISCOUNT = 0.15;

const money = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

let PRODUCTS = [];
let cart = JSON.parse(localStorage.getItem("zoe_cart") || "{}"); // id -> qty

const $ = (id) => document.getElementById(id);

function saveCart(){ localStorage.setItem("zoe_cart", JSON.stringify(cart)); }
function cartCount(){ return Object.values(cart).reduce((a,b)=>a+b,0); }

function cartTotals(){
  let total = 0;
  for (const [id, qty] of Object.entries(cart)){
    const p = PRODUCTS.find(x => x.id === id);
    if (!p) continue;
    total += p.price * qty;
  }
  const pix = total * (1 - PIX_DISCOUNT);
  return { total, pix };
}

function openCart(){
  $("overlay").classList.remove("hidden");
  $("drawer").classList.remove("hidden");
  renderCart();
}

function closeCart(){
  $("overlay").classList.add("hidden");
  $("drawer").classList.add("hidden");
}

function setFilter(cat){
  document.querySelectorAll(".chip").forEach(b=>b.classList.toggle("active", b.dataset.cat===cat));
  renderCatalog(cat);
  document.getElementById("produtos").scrollIntoView({behavior:"smooth"});
}

function addToCart(id, qty=1){
  cart[id] = (cart[id] || 0) + qty;
  if (cart[id] <= 0) delete cart[id];
  saveCart();
  $("cartCount").innerText = cartCount();
  renderCart();
}

function renderHighlights(){
  const el = $("highlights");
  el.innerHTML = "";
  const picks = PRODUCTS.slice(0, 4);
  picks.forEach(p=>{
    el.appendChild(productCard(p, true));
  });
}

function productCard(p, compact=false){
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `
    <img src="${p.image}" alt="${p.name}">
    <div class="cardBody">
      <div class="cardTop">
        <h4>${p.name}</h4>
        <span class="tag">${p.tag || "Pronta entrega"}</span>
      </div>
      <p class="desc">${p.desc || ""}</p>
      <div class="priceRow">
        <div>
          <span class="price">${money(p.price)}</span>
          ${p.old ? `<span class="old">${money(p.old)}</span>` : ""}
        </div>
        <span class="tag">Pix: ${Math.round(PIX_DISCOUNT*100)}% OFF</span>
      </div>
      <button class="addBtn">Adicionar ao carrinho</button>
    </div>
  `;
  card.querySelector(".addBtn").addEventListener("click", ()=>{
    addToCart(p.id, 1);
    openCart();
  });
  return card;
}

function renderCatalog(cat="todos"){
  const el = $("catalog");
  el.innerHTML = "";
  const items = (cat==="todos") ? PRODUCTS : PRODUCTS.filter(p=>p.category===cat);
  items.forEach(p=> el.appendChild(productCard(p)));
}

function renderCart(){
  $("cartCount").innerText = cartCount();
  const list = $("cartList");
  list.innerHTML = "";
  const entries = Object.entries(cart);

  if (entries.length === 0){
    $("cartEmpty").style.display = "block";
    list.style.display = "none";
  } else {
    $("cartEmpty").style.display = "none";
    list.style.display = "flex";

    entries.forEach(([id, qty])=>{
      const p = PRODUCTS.find(x=>x.id===id);
      if (!p) return;
      const row = document.createElement("div");
      row.className = "cartItem";
      row.innerHTML = `
        <img src="${p.image}" alt="${p.name}">
        <div class="cartInfo">
          <strong>${p.name}</strong>
          <span>${money(p.price)} • Pix: ${money(p.price*(1-PIX_DISCOUNT))}</span>
          <div class="qty">
            <button class="minus">−</button>
            <b>${qty}</b>
            <button class="plus">+</button>
            <button class="remove" title="Remover">🗑️</button>
          </div>
        </div>
      `;
      row.querySelector(".minus").addEventListener("click", ()=> addToCart(id, -1));
      row.querySelector(".plus").addEventListener("click", ()=> addToCart(id, 1));
      row.querySelector(".remove").addEventListener("click", ()=> { delete cart[id]; saveCart(); renderCart(); });
      list.appendChild(row);
    });
  }

  const { total, pix } = cartTotals();
  $("total").innerText = money(total);
  $("totalPix").innerText = money(pix);
}

function whatsappLink(){
  const { total, pix } = cartTotals();
  let msg = "Olá! Vim pelo site da ZOE IMPORTADOS MT.%0A%0A🛒 Meu carrinho:%0A";
  for (const [id, qty] of Object.entries(cart)){
    const p = PRODUCTS.find(x=>x.id===id);
    if (!p) continue;
    msg += `• ${p.name} (x${qty}) — ${money(p.price)}%0A`;
  }
  msg += `%0A💰 Total: ${money(total)}%0A💸 Total no Pix (15% OFF): ${money(pix)}%0A%0A📍 Retirada/entrega: Sinop‑MT`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(decodeURIComponent(msg))}`;
}

async function init(){
  $("year").innerText = new Date().getFullYear();

  // Whats buttons
  const baseMsg = "Olá! Quero comprar na ZOE IMPORTADOS MT. Vi pelo site.";
  const link = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(baseMsg)}`;
  $("whatsTop").href = link;

  // Load products
  const res = await fetch("products.json");
  PRODUCTS = await res.json();

  renderHighlights();
  renderCatalog("todos");
  renderCart();

  // Filters
  document.querySelectorAll(".chip").forEach(btn=>{
    btn.addEventListener("click", ()=> setFilter(btn.dataset.cat));
  });

  // Drawer events
  $("openCart").addEventListener("click", openCart);
  $("closeCart").addEventListener("click", closeCart);
  $("overlay").addEventListener("click", closeCart);

  $("clear").addEventListener("click", ()=>{
    cart = {};
    saveCart();
    renderCart();
  });

  $("checkout").addEventListener("click", ()=>{
    if (cartCount() === 0){ openCart(); return; }
    window.open(whatsappLink(), "_blank");
  });
}

init();
