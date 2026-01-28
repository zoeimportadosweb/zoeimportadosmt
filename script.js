const STORE = {
  name: "ZOE IMPORTADOS MT",
  phoneDigits: "5566992358200",
  instagram: "zoeimportadosmtt",
};

function whatsappLink(message) {
  const text = encodeURIComponent(message);
  return `https://wa.me/${STORE.phoneDigits}?text=${text}`;
}

function setWhatsLinks() {
  const msgBase =
    `Olá! Vim pelo site da ${STORE.name}. Gostaria de consultar preço e disponibilidade.`;

  const hero = document.getElementById("btnWhatsHero");
  const about = document.getElementById("btnWhatsAbout");
  const contact = document.getElementById("btnWhatsContact");
  const float = document.getElementById("floatWhats");

  [hero, about, contact, float].forEach((el) => {
    if (!el) return;
    el.href = whatsappLink(msgBase);
  });

  document.querySelectorAll(".buyBtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const product = btn.getAttribute("data-product") || "um produto";
      const msg = `Olá! Vim pelo site da ${STORE.name}. Quero comprar/consultar: ${product}.`;
      window.open(whatsappLink(msg), "_blank", "noopener,noreferrer");
    });
  });

  document.querySelectorAll(".linkBtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const product = btn.getAttribute("data-product") || "uma categoria";
      const msg = `Olá! Vim pelo site da ${STORE.name}. Quero consultar: ${product}.`;
      window.open(whatsappLink(msg), "_blank", "noopener,noreferrer");
    });
  });
}

function mobileMenu() {
  const btn = document.getElementById("menuBtn");
  const nav = document.getElementById("nav");
  if (!btn || !nav) return;

  btn.addEventListener("click", () => {
    nav.classList.toggle("is-open");
  });

  nav.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => nav.classList.remove("is-open"));
  });
}

function filters() {
  const chips = document.querySelectorAll(".chip");
  const items = document.querySelectorAll(".item");

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chips.forEach((c) => c.classList.remove("is-active"));
      chip.classList.add("is-active");

      const filter = chip.dataset.filter;
      items.forEach((it) => {
        const cat = it.dataset.cat;
        const show = filter === "todos" || filter === cat;
        it.style.display = show ? "flex" : "none";
      });
    });
  });
}

function year() {
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
}

setWhatsLinks();
mobileMenu();
filters();
year();
