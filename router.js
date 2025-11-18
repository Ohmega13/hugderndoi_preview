// router.js — simple hash router

const routes = {
  '#/overview':        { view: 'view-overview',        title: 'ภาพรวม' },
  '#/orders/all':      { view: 'view-orders-all',      title: 'ออเดอร์ทั้งหมด' },
  '#/orders/pending':  { view: 'view-orders-pending',  title: 'ออเดอร์รอชำระ' },
  '#/orders/pack':     { view: 'view-orders-pack',     title: 'พร้อมแพ็ก' },
  '#/orders/shipped':  { view: 'view-orders-shipped',  title: 'ส่งแล้ว' },
  '#/orders/canceled': { view: 'view-orders-canceled', title: 'ออเดอร์ยกเลิก' },
  '#/products/all':    { view: 'view-products-all',    title: 'สินค้าทั้งหมด' },
  '#/products/in':     { view: 'view-products-in',     title: 'รับเข้าสต็อก' },
  '#/products/adjust': { view: 'view-products-adjust', title: 'ปรับสต็อก' },
  '#/products/low':    { view: 'view-products-low',    title: 'แจ้งเตือนสต็อกต่ำ' },
  '#/customers/list':  { view: 'view-customers-list',  title: 'รายชื่อลูกค้า' },
  '#/customers/vip':   { view: 'view-customers-vip',   title: 'ลูกค้า VIP' },
  '#/customers/nvrs':  { view: 'view-customers-nvrs',  title: 'ลูกค้าใหม่ vs เก่า' },
  '#/expenses/add':    { view: 'view-expenses-add',    title: 'บันทึกรายจ่าย' },
  '#/expenses/share':  { view: 'view-expenses-share',  title: 'สัดส่วนค่าใช้จ่าย' },
  '#/summary':         { view: 'view-summary',         title: 'สรุปยอด' },
  '#/settings':        { view: 'view-settings',        title: 'ตั้งค่า' },
};

const views = document.querySelectorAll('.view');
const titleEl = document.getElementById('page-title');

function setActiveLink(){
  const hash = location.hash || '#/overview';
  document.querySelectorAll('.nav a').forEach(a=>{
    a.classList.toggle('active', a.getAttribute('href')===hash);
  });
}

window.render = function(){
  const hash = location.hash || '#/overview';
  const route = routes[hash] || routes['#/overview'];
  views.forEach(v=>v.classList.add('hidden'));
  const view = document.getElementById(route.view);
  if(view) view.classList.remove('hidden');
  if(titleEl) titleEl.textContent = route.title;
  setActiveLink();
};

window.addEventListener('hashchange', window.render);
window.addEventListener('load', ()=>{
  if(!location.hash) location.hash = '#/overview';
  window.render();
});
