
/* Zoe Importados MT - Script (estável, sem async/await) */
(function(){
  const WHATS_NUMBER = "5566992358200";
  const PIX_KEY = "38.052.604/0001-54";
  const MERCHANT_NAME = "ZOE IMPORTADOS MT";
  const MERCHANT_CITY = "SINOP";

  const state = {
    products: [],
    cart: loadCart(),
    isDriver: false,
    isStudent: false,
    address: "",
    km: 0
  };

  function $(sel){ return document.querySelector(sel); }
  function $all(sel){ return Array.from(document.querySelectorAll(sel)); }
  function money(v){ return (v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}); }

  function loadCart(){
    try{ return JSON.parse(localStorage.getItem("zoe_cart_v1")||"{}"); }
    catch(e){ return {}; }
  }
  function saveCart(){
    localStorage.setItem("zoe_cart_v1", JSON.stringify(state.cart));
  }

  function escapeHtml(s){
    return String(s||"")
      .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
      .replaceAll('"',"&quot;").replaceAll("'","&#039;");
  }

  function getCartItems(){
    const out = [];
    Object.keys(state.cart).forEach(id=>{
      const qty = state.cart[id];
      const p = state.products.find(x=>x.id===id);
      if(p && qty>0) out.push({product:p, qty});
    });
    return out;
  }

  function calcTotals(){
    const items = getCartItems();
    let subtotal = 0;
    items.forEach(({product, qty})=> subtotal += (product.price||0) * qty);

    const freight = Math.max(0, (Number(state.km)||0) * 1.5);

    // descontos
    let discount = 0;

    // Pix 15% OFF no total de produtos (automático)
    discount += subtotal * 0.15;

    // Motorista 20% OFF no total (se estudante também marcado, motorista só entra para itens fora mochila/fone)
    if(state.isDriver){
      if(state.isStudent){
        let driverBase = 0;
        items.forEach(({product, qty})=>{
          const cat = (product.category||"").toLowerCase();
          const isMochila = cat.includes("mochila");
          const isFone = cat.includes("fone") || cat.includes("headphone") || cat.includes("audio");
          if(!isMochila && !isFone) driverBase += (product.price||0) * qty;
        });
        discount += driverBase * 0.20;
      }else{
        discount += subtotal * 0.20;
      }
    }

    // Estudante 40% OFF em mochilas e fones
    if(state.isStudent){
      let studentBase = 0;
      items.forEach(({product, qty})=>{
        const cat = (product.category||"").toLowerCase();
        const isMochila = cat.includes("mochila");
        const isFone = cat.includes("fone") || cat.includes("headphone") || cat.includes("audio");
        if(isMochila || isFone) studentBase += (product.price||0) * qty;
      });
      discount += studentBase * 0.40;
    }

    discount = Math.min(discount, subtotal);
    const total = Math.max(0, subtotal - discount + freight);

    return { items, subtotal, discount, freight, total };
  }

  // CRC16/CCITT-FALSE
  function crc16(str){
    let crc = 0xFFFF;
    for(let c=0;c<str.length;c++){
      crc ^= (str.charCodeAt(c) << 8);
      for(let i=0;i<8;i++){
        crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
        crc &= 0xFFFF;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4,"0");
  }
  function emv(id, value){
    const v = String(value);
    return String(id).padStart(2,"0") + String(v.length).padStart(2,"0") + v;
  }
  function buildPixPayload(amount){
    const amt = Number(amount||0).toFixed(2);
    const gui = emv("00", "br.gov.bcb.pix");
    const key = emv("01", PIX_KEY);
    const mai = emv("26", gui + key);

    const base =
      emv("00","01") +
      emv("01","12") +
      mai +
      emv("52","0000") +
      emv("53","986") +
      emv("54", amt) +
      emv("58","BR") +
      emv("59", MERCHANT_NAME.slice(0,25)) +
      emv("60", MERCHANT_CITY.slice(0,15)) +
      emv("62", emv("05", "ZOE" + Date.now().toString().slice(-6)));

    const without = base + "6304";
    return without + crc16(without);
  }

  function renderProducts(){
    const grid = $("#products");
    if(!grid) return;
    grid.classList.add("catalog_grid");
    grid.innerHTML = "";

    state.products.forEach(p=>{
      const card = document.createElement("div");
      card.className = "product_card";

      const imgSrc = (p.images && p.images.length) ? p.images[0] : "assets/placeholder.jpg";
      const hasCarousel = p.images && p.images.length > 1;

      card.innerHTML = `
        <img src="${imgSrc}" alt="${escapeHtml(p.name)}" loading="lazy" />
        <div style="padding:12px;">
          <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:10px;">
            <h3 style="margin:0; font-size:16px; line-height:1.2;">${escapeHtml(p.name)}</h3>
            <div style="font-weight:900; white-space:nowrap;">${money(p.price)}</div>
          </div>
          <div class="small" style="margin-top:6px;">${escapeHtml(p.description||"")}</div>
          ${hasCarousel ? `<div class="small" style="margin-top:6px;">Toque na foto para ver mais ➜</div>` : ``}
          <div style="display:flex; gap:8px; margin-top:10px; align-items:center;">
            <button class="btn btn_primary" data-add="${p.id}">Adicionar</button>
            <button class="btn" data-minus="${p.id}">-</button>
            <div class="small" style="min-width:40px; text-align:center;" id="qty_${p.id}">${state.cart[p.id]||0}</div>
            <button class="btn" data-plus="${p.id}">+</button>
          </div>
        </div>
      `;

      // carrossel simples no clique da imagem
      const img = card.querySelector("img");
      if(p.images && p.images.length > 1){
        let idx = 0;
        img.style.cursor = "pointer";
        img.addEventListener("click", ()=>{
          idx = (idx + 1) % p.images.length;
          img.src = p.images[idx];
        });
      }

      grid.appendChild(card);
    });

    // delegado (1 vez)
    grid.addEventListener("click", (e)=>{
      const add = e.target.closest("[data-add]");
      const plus = e.target.closest("[data-plus]");
      const minus = e.target.closest("[data-minus]");
      if(add) changeQty(add.getAttribute("data-add"), 1);
      if(plus) changeQty(plus.getAttribute("data-plus"), 1);
      if(minus) changeQty(minus.getAttribute("data-minus"), -1);
    }, { once:true });

    updateAll();
  }

  function changeQty(id, delta){
    state.cart[id] = Math.max(0, (state.cart[id]||0) + delta);
    if(state.cart[id] === 0) delete state.cart[id];
    saveCart();
    updateAll();
  }

  function renderCart(){
    const totals = calcTotals();

    const list = $("#cartItems");
    if(list){
      list.innerHTML = "";
      if(totals.items.length === 0){
        list.innerHTML = `<div class="small" style="padding:10px 0;">Seu carrinho está vazio 🙂</div>`;
      }else{
        totals.items.forEach(({product, qty})=>{
          const row = document.createElement("div");
          row.style.display="flex";
          row.style.justifyContent="space-between";
          row.style.gap="10px";
          row.style.padding="10px 0";
          row.style.borderBottom="1px solid rgba(255,255,255,.10)";
          row.innerHTML = `
            <div>
              <div style="font-weight:800;">${escapeHtml(product.name)}</div>
              <div class="small">${money(product.price)} x ${qty}</div>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <button class="btn" data-minus="${product.id}">-</button>
              <div style="min-width:26px; text-align:center; font-weight:800;">${qty}</div>
              <button class="btn" data-plus="${product.id}">+</button>
            </div>
          `;
          list.appendChild(row);
        });
      }
    }

    // totais (ids existentes)
    if($("#subtotal")) $("#subtotal").textContent = money(totals.subtotal);
    if($("#discounts")) $("#discounts").textContent = "- " + money(totals.discount);
    if($("#freteTotal")) $("#freteTotal").textContent = money(totals.freight);
    if($("#total")) $("#total").textContent = money(totals.total);
    if($("#pixTotal")) $("#pixTotal").textContent = money(totals.total);
    if($("#freteValue")) $("#freteValue").textContent = money(totals.freight);

    // QR Pix com valor total
    const payload = buildPixPayload(totals.total);

    const img = $("#pixQrImg");
    if(img){
      img.src = "https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=" + encodeURIComponent(payload);
      img.alt = "QR Code Pix - Total " + money(totals.total);
    }
    const copia = $("#pixCopiaCola");
    if(copia) copia.value = payload;

    // badge no botão flutuante
    const count = totals.items.reduce((a,b)=>a+b.qty,0);
    const badge = $("#cartBadge");
    if(badge) badge.textContent = String(count);

    return totals;
  }

  function updateAll(){
    Object.keys(state.cart).forEach(id=>{
      const el = $("#qty_"+id);
      if(el) el.textContent = String(state.cart[id]||0);
    });
    $all('[id^="qty_"]').forEach(el=>{
      const id = el.id.replace("qty_","");
      if(!state.cart[id]) el.textContent = "0";
    });
    renderCart();
  }

  function buildWhatsMessage(totals){
    const lines = [];
    lines.push("🛍️ *Pedido - Zoe Importados MT*");
    lines.push("");
    totals.items.forEach(({product, qty})=>{
      lines.push(`• ${qty}x ${product.name} — ${money(product.price * qty)}`);
    });
    lines.push("");
    lines.push(`Subtotal: ${money(totals.subtotal)}`);
    lines.push(`Descontos (Pix 15% OFF + regras): -${money(totals.discount)}`);
    lines.push(`Frete: ${money(totals.freight)} (R$ 1,50/km)`);
    lines.push(`*Total: ${money(totals.total)}*`);
    lines.push("");
    lines.push("📍 *Entrega*");
    if(state.address) lines.push("Endereço: " + state.address);
    if(state.km) lines.push("Distância: " + state.km + " km");
    lines.push("");
    lines.push("✅ Quero finalizar a compra!");
    return lines.join("\n");
  }

  function bindUI(){
    // descontos
    const driver = $("#discountDriver");
    const student = $("#discountStudent");
    if(driver) driver.addEventListener("change", ()=>{ state.isDriver = driver.checked; updateAll(); });
    if(student) student.addEventListener("change", ()=>{ state.isStudent = student.checked; updateAll(); });

    // frete
    const addr = $("#address");
    const km = $("#km");
    if(addr) addr.addEventListener("input", ()=>{ state.address = addr.value; updateAll(); });
    if(km) km.addEventListener("input", ()=>{
      state.km = Number(String(km.value).replace(",","."));
      updateAll();
    });

    // carrinho (controles)
    const list = $("#cartItems");
    if(list){
      list.addEventListener("click",(e)=>{
        const plus = e.target.closest("[data-plus]");
        const minus = e.target.closest("[data-minus]");
        if(plus) changeQty(plus.getAttribute("data-plus"), 1);
        if(minus) changeQty(minus.getAttribute("data-minus"), -1);
      });
    }

    // finalizar
    const btn = $("#whatsBtn");
    if(btn) btn.addEventListener("click", ()=>{
      const totals = calcTotals();
      if(totals.items.length === 0){
        alert("Seu carrinho está vazio 🙂");
        return;
      }
      const msg = buildWhatsMessage(totals);
      window.open("https://wa.me/"+WHATS_NUMBER+"?text="+encodeURIComponent(msg), "_blank");
    });

    // botão flutuante: rolar até carrinho
    const floatBtn = $("#openCartFloat");
    if(floatBtn){
      floatBtn.addEventListener("click", ()=>{
        const cart = document.querySelector("#cartItems") || document.querySelector("#checkout") || document.querySelector(".catalog");
        if(cart) cart.scrollIntoView({behavior:"smooth", block:"start"});
      });
    }

    // copiar pix
    const copyBtn = $("#copyPix");
    if(copyBtn){
      copyBtn.addEventListener("click", ()=>{
        const copia = $("#pixCopiaCola");
        if(!copia) return;
        copia.select();
        copia.setSelectionRange(0, 99999);
        document.execCommand("copy");
        copyBtn.textContent = "Copiado!";
        setTimeout(()=>copyBtn.textContent="Copiar Pix", 1200);
      });
    }
  }

  function boot(){
    bindUI();

    fetch("products.json?v="+Date.now())
      .then(r=>r.json())
      .then(data=>{
        state.products = Array.isArray(data) ? data : [];
        renderProducts();
        updateAll();
      })
      .catch(err=>{
        console.error("Erro ao carregar produtos:", err);
        const grid = $("#products");
        if(grid) grid.innerHTML = "<div class='product_card' style='padding:14px;'>Não foi possível carregar os produtos.</div>";
      });
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
