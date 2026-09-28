import type { Lang } from "@/lib/site/i18n";

/**
 * Customer-facing text of the in-restaurant QR / tablet menu (/order). Vietnamese
 * is the default here (most dine-in guests); EN / RU share the website's `lang`
 * cookie, so a Lumia guest who picked Russian on the website sees Russian here too.
 * Staff-only parts (the table-switch dialog) stay Vietnamese.
 */
export const ORDER_LANGS: Lang[] = ["vi", "en", "ru"];

const vi = {
  loading: "Đang tải menu...",
  loadError: "Không tải được menu. Vui lòng kiểm tra kết nối và thử lại.",
  table: "Bàn {n}",
  switchTable: "Đổi bàn",
  callStaff: "Gọi nhân viên",
  search: "Nhập tên món...",
  cart: "Giỏ hàng",
  highlight: "Món Nổi Bật",
  featured: "Món Đặc Trưng",
  resultsFor: 'Kết quả cho "{q}"',
  noItems: "Không có món nào.",
  add: "Thêm {name}",
  footerNote: "Giá chưa bao gồm VAT. Hải sản tươi sống theo thời giá.",
  viewCart: "Xem giỏ hàng ({n})",
  confirmed: "Nhân viên đã xác nhận đơn của bạn. Cảm ơn quý khách!",
  cancelled: "Đơn hàng đã bị huỷ bởi nhân viên. Vui lòng kiểm tra lại giỏ hàng và gửi lại.",
  sendFailed: "Không gửi được yêu cầu.",
  staffCalled: "Đã gửi yêu cầu, nhân viên sẽ tới ngay.",
  staffCallFailed: "Không gửi được yêu cầu gọi nhân viên. Vui lòng thử lại.",
  switched: "Đã chuyển sang bàn {n}.",
  language: "Ngôn ngữ",
  drawer: {
    title: "Giỏ hàng",
    close: "Đóng",
    empty: "Chưa có món nào trong giỏ.",
    notePh: "Ghi chú (vd: không hành, sốt riêng...)",
    addNote: "+ Thêm ghi chú",
    total: "Tổng",
    sending: "Đang gửi...",
    sent: "Đã gửi yêu cầu — nhân viên sẽ tới ngay",
    send: "Gửi yêu cầu tới nhân viên",
    dec: "Giảm số lượng",
    inc: "Tăng số lượng",
  },
  item: {
    noPhoto: "Chưa có ảnh",
    close: "Đóng",
    methods: "Có thể chế biến:",
    addToCart: "Thêm vào giỏ · {price}",
    askStaff: "Vui lòng gọi nhân viên để đặt món này",
  },
  sent: {
    title: "Đã gửi yêu cầu",
    text: "Yêu cầu của quý khách đã được gửi đi, vui lòng chờ trong giây lát, nhân viên phục vụ sẽ xác nhận.",
    wait: 'Nếu chờ lâu quá, hãy nhấn nút "Gọi nhân viên" bên dưới.',
    call: "Gọi nhân viên",
    ok: "Đã hiểu",
  },
};

export type OrderDict = typeof vi;

const en: OrderDict = {
  loading: "Loading the menu...",
  loadError: "Couldn't load the menu. Please check the connection and try again.",
  table: "Table {n}",
  switchTable: "Change table",
  callStaff: "Call staff",
  search: "Search dishes...",
  cart: "Cart",
  highlight: "Popular",
  featured: "Signature",
  resultsFor: 'Results for "{q}"',
  noItems: "No dishes here.",
  add: "Add {name}",
  footerNote: "Prices exclude VAT. Live seafood at market price.",
  viewCart: "View cart ({n})",
  confirmed: "Our staff have confirmed your order. Thank you!",
  cancelled: "Your order was cancelled by our staff. Please check your cart and send it again.",
  sendFailed: "Couldn't send your order.",
  staffCalled: "Request sent — a staff member is on the way.",
  staffCallFailed: "Couldn't call staff. Please try again.",
  switched: "Switched to table {n}.",
  language: "Language",
  drawer: {
    title: "Cart",
    close: "Close",
    empty: "Your cart is empty.",
    notePh: "Note (e.g. no onion, sauce on the side...)",
    addNote: "+ Add a note",
    total: "Total",
    sending: "Sending...",
    sent: "Order sent — a staff member is on the way",
    send: "Send order to staff",
    dec: "Decrease quantity",
    inc: "Increase quantity",
  },
  item: {
    noPhoto: "No photo yet",
    close: "Close",
    methods: "Can be prepared:",
    addToCart: "Add to cart · {price}",
    askStaff: "Please ask our staff to order this dish",
  },
  sent: {
    title: "Order sent",
    text: "Your order has been sent. Please wait a moment — our staff will confirm it.",
    wait: 'If it takes too long, tap "Call staff" below.',
    call: "Call staff",
    ok: "Got it",
  },
};

const ru: OrderDict = {
  loading: "Загружаем меню...",
  loadError: "Не удалось загрузить меню. Проверьте подключение и попробуйте снова.",
  table: "Стол {n}",
  switchTable: "Сменить стол",
  callStaff: "Позвать официанта",
  search: "Поиск блюд...",
  cart: "Корзина",
  highlight: "Популярное",
  featured: "Фирменное",
  resultsFor: "Результаты: «{q}»",
  noItems: "Здесь пока нет блюд.",
  add: "Добавить {name}",
  footerNote: "Цены без НДС. Живые морепродукты — по рыночной цене.",
  viewCart: "Корзина ({n})",
  confirmed: "Официант подтвердил ваш заказ. Спасибо!",
  cancelled: "Заказ отменён официантом. Проверьте корзину и отправьте снова.",
  sendFailed: "Не удалось отправить заказ.",
  staffCalled: "Запрос отправлен — официант скоро подойдёт.",
  staffCallFailed: "Не удалось позвать официанта. Попробуйте ещё раз.",
  switched: "Стол изменён на {n}.",
  language: "Язык",
  drawer: {
    title: "Корзина",
    close: "Закрыть",
    empty: "Корзина пуста.",
    notePh: "Комментарий (напр.: без лука, соус отдельно...)",
    addNote: "+ Добавить комментарий",
    total: "Итого",
    sending: "Отправка...",
    sent: "Заказ отправлен — официант скоро подойдёт",
    send: "Отправить заказ официанту",
    dec: "Уменьшить количество",
    inc: "Увеличить количество",
  },
  item: {
    noPhoto: "Фото пока нет",
    close: "Закрыть",
    methods: "Способ приготовления:",
    addToCart: "В корзину · {price}",
    askStaff: "Чтобы заказать это блюдо, позовите официанта",
  },
  sent: {
    title: "Заказ отправлен",
    text: "Ваш заказ отправлен. Подождите немного — официант его подтвердит.",
    wait: "Если ждать слишком долго, нажмите «Позвать официанта» ниже.",
    call: "Позвать официанта",
    ok: "Понятно",
  },
};

const DICTS: Record<Lang, OrderDict> = { vi, en, ru };

export function orderDict(lang: Lang): OrderDict {
  return DICTS[lang] ?? vi;
}
