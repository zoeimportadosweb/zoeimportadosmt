
let cart = [];
let total = 0;

function addToCart(name, price){
 cart.push({name, price});
 total += price;
 render();
}

function render(){
 const list = document.getElementById("cart");
 list.innerHTML = "";
 cart.forEach(i=>{
   const li = document.createElement("li");
   li.innerText = i.name + " - R$ " + i.price.toFixed(2);
   list.appendChild(li);
 });
 document.getElementById("total").innerText = total.toFixed(2);
}

function checkout(){
 let msg = "Pedido ZOE IMPORTADOS:%0A";
 cart.forEach(i=>{ msg += i.name + " - R$ " + i.price.toFixed(2) + "%0A"; });
 msg += "Total: R$ " + total.toFixed(2);
 window.open("https://wa.me/5566992358200?text="+msg,"_blank");
}
