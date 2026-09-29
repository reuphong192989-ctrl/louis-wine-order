import type { Lang } from "./i18n";

/**
 * English / Russian names for the live menu, keyed by the Vietnamese name
 * stored in the database (whitespace-normalised, case-insensitive). Items or
 * categories added later without an entry here simply show in Vietnamese.
 * `n` = name, `d` = note/description (optional; falls back to the Vietnamese note).
 */
type T = { en: string; ru: string };
type ItemT = { n: T; d?: T };

const CATEGORIES: Record<string, T> = {
  "Khai Vị": { en: "Starters", ru: "Закуски" },
  "Món Âu": { en: "European Mains", ru: "Европейская кухня" },
  "Đồ Nguội & Phô Mai": { en: "Charcuterie & Cheese", ru: "Мясные деликатесы и сыры" },
  "Salad & Gỏi": { en: "Salads", ru: "Салаты" },
  "Soup": { en: "Soups", ru: "Супы" },
  "Món Gà Quê": { en: "Free-range Poultry", ru: "Деревенская птица" },
  "Món Nhậu": { en: "Grill & Bar Bites", ru: "Гриль и закуски к напиткам" },
  "Cá Theo Con": { en: "Whole Fish", ru: "Рыба целиком" },
  "Trân Phẩm Đại Dương": { en: "Seafood Treasures", ru: "Деликатесы из моря" },
  "Lẩu": { en: "Hotpots", ru: "Хот-пот" },
  "Rau": { en: "Vegetables", ru: "Овощи" },
  "Cơm - Mỳ - Miến - Cháo": { en: "Rice, Noodles & Congee", ru: "Рис, лапша и каша" },
  "Canh": { en: "Vietnamese Soups", ru: "Вьетнамские супы" },
  "Món Chay": { en: "Vegetarian", ru: "Вегетарианское" },
  "Tráng Miệng": { en: "Desserts", ru: "Десерты" },
  "Rượu Mạnh": { en: "Spirits", ru: "Крепкие напитки" },
  "Rượu Ngâm / Dưỡng Sinh": { en: "Herbal & Ginseng Liquors", ru: "Настойки и женьшеневые напитки" },
  "Rượu Vang": { en: "Wine", ru: "Вино" },
  "Rượu Vang Đỏ": { en: "Red Wine", ru: "Красное вино" },
  "Rượu Vang Trắng": { en: "White Wine", ru: "Белое вино" },
  "Bia": { en: "Beer", ru: "Пиво" },
  "Nước Ngọt": { en: "Soft Drinks", ru: "Безалкогольные напитки" },
  "Cigar": { en: "Cigars", ru: "Сигары" },
  "Món Đặc Trưng": { en: "Signature Dishes", ru: "Фирменные блюда" },
};

const i = (en: string, ru: string, dEn?: string, dRu?: string): ItemT =>
  dEn && dRu ? { n: { en, ru }, d: { en: dEn, ru: dRu } } : { n: { en, ru } };

const ORDER_AHEAD_EN = " — order ≥1 hour ahead";
const ORDER_AHEAD_RU = " — заказ минимум за 1 час";
const SOUP_POT_EN = "served per pot, for 4–6 guests";
const SOUP_POT_RU = "подаётся в кастрюле, на 4–6 гостей";
const CRAB_EN = "Singapore chilli / black pepper / yellow curry / steamed with ginger & scallion / glass-noodle stir-fry / steamed in Sichuan-pepper wine / tamarind / roasted with rock salt";
const CRAB_RU = "соус чили по-сингапурски / чёрный перец / жёлтое карри / на пару с имбирём и луком / с жареной стеклянной лапшой / на пару в вине с сычуаньским перцем / с тамариндом / запечённый в каменной соли";
const PRAWN_EN = "fried with salted egg / garlic butter / roasted with salt & chilli / steamed with garlic glass noodles / steamed in coconut water / claypot glass-noodle stir-fry";
const PRAWN_RU = "жареные с солёным яичным желтком / чесночное масло / жареные с солью и чили / на пару с чесночной стеклянной лапшой / на пару в кокосовой воде / со стеклянной лапшой в горшочке";

const ITEMS: Record<string, ItemT> = {
  // Khai Vị
  "Chả mực thượng hạng": i("Premium squid cakes", "Котлетки из кальмара премиум"),
  "Chả giò hải sản": i("Seafood spring rolls", "Жареные спринг-роллы с морепродуктами"),
  "Chả bò chiên": i("Fried beef cakes", "Жареные говяжьи котлетки"),
  "Pate Louis": i("Louis pâté", "Паштет Louis"),
  "Ngô nếp mini Điện Biên": i("Điện Biên mini sticky corn", "Мини-кукуруза из Дьенбьена", "Điện Biên specialty", "Специалитет Дьенбьена"),
  "Bơ Louis": i("Louis avocado", "Авокадо Louis"),
  "Đậu hũ non chả bông": i("Silken tofu with pork floss", "Шёлковый тофу со свиной стружкой"),
  "Khoai tây chiên": i("French fries", "Картофель фри"),
  "Bánh mỳ bơ tỏi": i("Garlic butter bread", "Хлеб с чесночным маслом"),
  "Bánh mỳ (giỏ)": i("Bread basket", "Хлебная корзинка"),
  "Cá chuồn mít": i("Crispy flying fish", "Жареная летучая рыба"),
  "Đậu phộng húng lìu": i("Five-spice roasted peanuts", "Арахис с пятью специями"),
  "Bánh phồng cá biển": i("Sea-fish crackers", "Рыбные чипсы"),
  "Đậu khuôn chiên": i("Fried tofu", "Жареный тофу", "crispy / with lemongrass", "хрустящий / с лемонграссом"),
  "Khoai tây nghiền": i("Mashed potatoes", "Картофельное пюре"),
  // Món Âu
  "Gan Ngỗng Pháp Nướng": i("Grilled French foie gras", "Французская фуа-гра на гриле", "pan-seared, apple sauce", "обжаренная, яблочный соус"),
  "Bò Fuji Nhật nướng": i("Grilled Japanese Fuji beef", "Японская говядина Фудзи на гриле", "green pepper sauce / mushroom sauce", "соус из зелёного перца / грибной соус"),
  "Cá tuyết Pháp nướng": i("Grilled French cod", "Французская треска на гриле", "orange-lime sauce", "апельсиново-лаймовый соус"),
  "Sườn cừu nướng": i("Grilled lamb chops", "Каре ягнёнка на гриле", "with rosemary", "с розмарином"),
  "Bò Tomahawk nướng - Dát vàng (Signature)": i(
    "Gold-leaf grilled Tomahawk (Signature)",
    "Томагавк на гриле в сусальном золоте (фирменное)",
    "1.2 kg steak, 24k gold leaf, carved at your table",
    "стейк 1,2 кг, сусальное золото 24 карата, нарезка у стола",
  ),
  "Cá hồi áp chảo": i("Pan-seared salmon", "Обжаренный лосось", "passion fruit sauce / orange sauce", "соус из маракуйи / апельсиновый соус"),
  // Đồ Nguội & Phô Mai
  "Đồ Nguội Phô mai tổng hợp đặc biệt": i("Special charcuterie & cheese platter", "Особое ассорти мясных деликатесов и сыров"),
  "Đồ nguội tổng hợp": i("Charcuterie platter", "Ассорти мясных деликатесов"),
  "Phô mai tổng hợp": i("Cheese platter", "Сырное ассорти"),
  "Heo Iberico 36 tháng": i("Iberico ham, 36 months", "Хамон иберико, 36 месяцев"),
  "Xúc xích Ba Lan": i("Polish sausage", "Польская колбаса"),
  "Ô Liu": i("Olives", "Оливки"),
  "Phô mai Nga xông khói": i("Russian smoked cheese", "Русский копчёный сыр"),
  "Cánh ngỗng Nga xông khói": i("Russian smoked goose wings", "Копчёные гусиные крылья по-русски"),
  // Salad & Gỏi
  "Salad cá hồi": i("Salmon salad", "Салат с лососем", "passion fruit dressing", "заправка из маракуйи"),
  "Salad Rau Càng Cua Bò Tái": i("Peperomia salad with rare beef", "Салат из пеперомии с говядиной с кровью"),
  "Salad hoa quả theo mùa": i("Seasonal fruit salad", "Салат из сезонных фруктов"),
  "Salad dầu giấm": i("Vinaigrette salad", "Салат с винегретной заправкой"),
  "Gỏi bò Louis": i("Louis beef salad", "Салат с говядиной Louis"),
  "Gỏi sứa xoài xanh": i("Jellyfish & green mango salad", "Салат из медузы и зелёного манго", "Korean style", "по-корейски"),
  "Gỏi Lươn chuối rừng": i("Eel & wild banana salad", "Салат из угря и дикого банана"),
  "Cổ hũ dừa tôm áp chảo": i("Coconut palm heart with seared shrimp", "Сердцевина кокосовой пальмы с обжаренными креветками"),
  "Gỏi bưởi hải sản": i("Pomelo seafood salad", "Салат из помело с морепродуктами"),
  // Soup
  "Soup bào ngư thịt cua": i("Abalone & crab meat soup", "Суп с морским ушком и крабом", "per portion", "за порцию"),
  "Soup Bào ngư hầm trái bí": i("Abalone soup braised in pumpkin", "Суп с морским ушком в тыкве"),
  "Soup hải sản trứng cá chuồn Nhật": i("Seafood soup with Japanese flying-fish roe", "Суп с морепродуктами и японской икрой летучей рыбы"),
  "Soup bí đỏ kem tươi": i("Cream of pumpkin soup", "Тыквенный крем-суп"),
  "Soup rau dền trứng bắc thảo": i("Amaranth soup with century egg", "Суп из амаранта со столетним яйцом"),
  "Soup hải sản tóc tiên": i("Seafood soup with black moss", "Суп с морепродуктами и морской водорослью"),
  // Món Gà Quê
  "Gà H'Mông": i(
    "H'Mông black chicken",
    "Чёрная курица хмонг",
    "steamed / fried with fish sauce / salt-roasted / grilled" + ORDER_AHEAD_EN,
    "на пару / жареная в рыбном соусе / в соли / на гриле" + ORDER_AHEAD_RU,
  ),
  "Gà tre": i(
    "Bantam chicken",
    "Бентамская курица",
    "steamed / fried with fish sauce / salt-roasted / grilled" + ORDER_AHEAD_EN,
    "на пару / жареная в рыбном соусе / в соли / на гриле" + ORDER_AHEAD_RU,
  ),
  "Gà ta": i(
    "Free-range chicken",
    "Деревенская курица",
    "steamed / fried with fish sauce / salt-roasted / grilled" + ORDER_AHEAD_EN,
    "на пару / жареная в рыбном соусе / в соли / на гриле" + ORDER_AHEAD_RU,
  ),
  "Gà Đông Tảo": i(
    "Đông Tảo chicken",
    "Курица донгтао",
    "per kg — steamed with sticky rice / with taro / spicy roast",
    "за кг — на пару с клейким рисом / с таро / острая жареная",
  ),
  "Vịt Trời": i(
    "Wild duck",
    "Дикая утка",
    "steamed with sticky rice / galangal-style stew / with taro — blood pudding",
    "на пару с клейким рисом / тушёная с галангалом / с таро — кровяной пудинг",
  ),
  "Chim câu": i(
    "Pigeon",
    "Голубь",
    "per bird — cordyceps herbal broth / rustic grill / five-spice roast",
    "за птицу — бульон с кордицепсом / на углях / жареный с пятью специями",
  ),
  "Gà đen tiềm trái dừa": i("Black chicken braised in coconut", "Чёрная курица, томлённая в кокосе", "per portion", "за порцию"),
  // Món Nhậu
  "Sườn non nướng BBQ": i("BBQ baby back ribs", "Свиные рёбрышки барбекю"),
  "Chân giò chiên Filipin": i("Filipino crispy pork knuckle", "Хрустящая свиная рулька по-филиппински"),
  "Bò cháy tỏi tiêu xanh": i("Seared beef with garlic & green pepper", "Говядина с чесноком и зелёным перцем"),
  "Đuôi lợn luộc": i("Boiled pork tail", "Отварной свиной хвост"),
  "Ếch Chui Rơm": i("Crispy \"straw\" frog", "Хрустящая лягушка «в соломке»"),
  "Bò Lúc Lắc": i("Shaking beef", "Говядина «лук лак»"),
  "Mực một nắng nướng": i("Grilled sun-dried squid", "Вяленый на солнце кальмар на гриле"),
  "Mực khô nướng": i("Grilled dried squid", "Сушёный кальмар на гриле"),
  "Tôm một nắng nướng": i("Grilled sun-dried shrimp", "Вяленые на солнце креветки на гриле"),
  "Bò một nắng Lào": i("Lao sun-dried beef", "Вяленая говядина по-лаосски"),
  "Sashimi tổng hợp": i("Mixed sashimi", "Ассорти сашими"),
  "Sashimi cá": i("Fish sashimi", "Сашими из рыбы"),
  // Cá Theo Con
  "Cá Bơn Hàn Quốc": i(
    "Korean flounder",
    "Корейская камбала",
    "sashimi / congee / Thai-style steamed / Hong Kong-style steamed / Malaysian grilled / Sichuan fried",
    "сашими / каша / на пару по-тайски / на пару по-гонконгски / на гриле по-малайзийски / жареная по-сычуаньски",
  ),
  "Cá Mú (song / mú)": i(
    "Grouper",
    "Групер",
    "sashimi / sour broth / steamed with herbs / steamed with black bean sauce / Thai steamed / HK steamed / fried with garlic & chilli / Malaysian grilled",
    "сашими / кислый бульон / на пару с травами / на пару с соусом из чёрных бобов / по-тайски / по-гонконгски / жареный с чесноком и чили / на гриле по-малайзийски",
  ),
  "Cá Chim Trắng": i(
    "White pomfret",
    "Белый помфрет",
    "steamed with bean sauce / Thai steamed / HK steamed / fried with garlic & chilli / sweet & sour / Malaysian grilled",
    "на пару с бобовым соусом / по-тайски / по-гонконгски / жареный с чесноком и чили / в кисло-сладком соусе / на гриле по-малайзийски",
  ),
  "Cá Tầm": i(
    "Sturgeon",
    "Осётр",
    "salt-roasted / grilled with salt & chilli / hotpot / with bamboo shoots",
    "запечённый в соли / на гриле с солью и чили / хот-пот / с побегами бамбука",
  ),
  "Cá Chìa Vôi": i("Wolf herring", "Сельдь-волк", "rustic grill / grilled with salt & chilli", "на углях / на гриле с солью и чили"),
  "Cá Nâu": i(
    "Spotted scat",
    "Аргус пятнистый",
    "grilled / starfruit & green chilli broth / braised with pepper",
    "на гриле / в бульоне с карамболой и зелёным чили / тушёный с перцем",
  ),
  "Cá Lăng/kg": i(
    "Hemibagrus catfish (per kg)",
    "Сом гемибагрус (за кг)",
    "hotpot / grilled with salt & chilli / sour bamboo broth / Hanoi turmeric-dill fish",
    "хот-пот / на гриле с солью и чили / кислый суп с бамбуком / рыба с куркумой и укропом по-ханойски",
  ),
  "Cá Hồi Na Uy /Kg": i(
    "Norwegian salmon (per kg)",
    "Норвежский лосось (за кг)",
    "sashimi / grilled with cheese / grilled with orange-lime sauce",
    "сашими / запечённый с сыром / на гриле с апельсиново-лаймовым соусом",
  ),
  "Cá Chình Suối": i(
    "River eel",
    "Речной угорь",
    "Malaysian grilled / steamed with XO sauce / grilled with red turmeric / HK salt-roasted / stewed with green banana & tofu / sour broth",
    "на гриле по-малайзийски / на пару с соусом XO / на гриле с красной куркумой / в соли по-гонконгски / тушёный с зелёным бананом и тофу / в кислом бульоне",
  ),
  // Trân Phẩm Đại Dương
  "Sò Huyết Thường": i("Blood cockles", "Кровяные моллюски"),
  "Ghẹ Đỏ": i("Red crab", "Красный краб", "steamed / tamarind", "на пару / с тамариндом"),
  "Tôm Tít": i(
    "Mantis shrimp",
    "Рак-богомол",
    "roasted with salt & chilli / steamed / garlic butter / tamarind / garlic sauce",
    "жареный с солью и чили / на пару / чесночное масло / тамаринд / чесночный соус",
  ),
  "Ốc Hương": i(
    "Babylon sea snails",
    "Морские улитки «ок хыонг»",
    "steamed with lemongrass / garlic butter / tamarind / salted-egg sauce / charcoal-grilled with green pepper",
    "на пару с лемонграссом / чесночное масло / тамаринд / соус из солёного яйца / на углях с зелёным перцем",
  ),
  "Sò Dương / Kg": i(
    "Sea scallops (per kg)",
    "Морские гребешки (за кг)",
    "8–10 per kg — grilled with scallion oil / XO sauce / steamed with double garlic",
    "8–10 шт/кг — на гриле с луковым маслом / соус XO / на пару с двойным чесноком",
  ),
  "Hàu Sữa (6-8 con/1kg)": i("Milky oysters (6–8 per kg)", "Молочные устрицы (6–8 шт/кг)"),
  "Cua KingCrab(Kg)": i(
    "King crab (per kg)",
    "Королевский краб (за кг)",
    "cheese sauce / fried with garlic butter / steamed",
    "сырный соус / жареный в чесночном масле / на пару",
  ),
  "Tôm Hùm Baby": i(
    "Baby lobster",
    "Молодой лобстер",
    "grilled / baked with cheese / rustic grill / hotpot",
    "на гриле / запечённый с сыром / на углях / хот-пот",
  ),
  "Cua Gạch": i("Roe crab", "Краб с икрой", CRAB_EN, CRAB_RU),
  "Cua Thịt": i("Meat crab", "Мясной краб", CRAB_EN, CRAB_RU),
  "Tôm Sú": i("Tiger prawns", "Тигровые креветки", PRAWN_EN, PRAWN_RU),
  "Tôm Càng Xanh": i("Giant river prawns", "Гигантские пресноводные креветки", PRAWN_EN, PRAWN_RU),
  "Ghẹ Xanh": i("Blue swimmer crab", "Синий краб", "steamed / tamarind", "на пару / с тамариндом"),
  "Bọ Biển": i("Slipper lobster", "Лопатоносый рак"),
  "Bào Ngư hấp miến tỏi": i("Abalone steamed with garlic glass noodles", "Морское ушко на пару с чесночной лапшой"),
  "Bào Ngư Úc Nhập Khẩu": i("Imported Australian abalone", "Австралийское морское ушко"),
  "Ốc Vòi Voi": i(
    "Geoduck clam",
    "Гуидак",
    "sashimi / ginkgo congee / Malaysian-sauce stir-fry / XO-sauce stir-fry",
    "сашими / каша с гинкго / обжаренный в малайзийском соусе / в соусе XO",
  ),
  "Tôm Hùm Bông": i(
    "Ornate spiny lobster",
    "Пятнистый лангуст",
    "fried with salted egg / roasted with salt & chilli / steamed in coconut water / steamed with garlic glass noodles / baked with cheese",
    "жареный с солёным желтком / с солью и чили / на пару в кокосовой воде / на пару с чесночной лапшой / запечённый с сыром",
  ),
  "Bào Ngư Hàn Quốc": i(
    "Korean abalone",
    "Корейское морское ушко",
    "sashimi / steamed with double garlic / ginkgo congee",
    "сашими / на пару с двойным чесноком / каша с гинкго",
  ),
  // Lẩu
  "Lẩu hải sản chua cay": i("Hot & sour seafood hotpot", "Кисло-острый хот-пот с морепродуктами", "per pot", "за кастрюлю"),
  "Lẩu baba rượu vang": i("Soft-shell turtle hotpot with red wine", "Хот-пот с трионихсом на красном вине", "per kg", "за кг"),
  "Lẩu gà nhúng lá giang": i("Chicken hotpot with sour giang leaves", "Хот-пот с курицей и кислыми листьями джанг", "per pot", "за кастрюлю"),
  "Lẩu riêu cua bắp bò sườn sụn": i(
    "Crab paste hotpot with beef shank & pork cartilage",
    "Хот-пот с крабовой пастой, говяжьей голенью и хрящами",
    "per pot",
    "за кастрюлю",
  ),
  "Lẩu Cháo Chim Câu": i("Pigeon congee hotpot", "Хот-пот с рисовой кашей и голубем", "per pot", "за кастрюлю"),
  "Lẩu Cá Chua Cay": i("Hot & sour fish hotpot", "Кисло-острый рыбный хот-пот"),
  "Lẩu Ếch Măng Cay": i("Spicy frog & bamboo shoot hotpot", "Острый хот-пот с лягушкой и бамбуком"),
  // Rau
  "Cải thìa xào nấm đông cô": i("Bok choy with shiitake", "Бок-чой с шиитаке"),
  "Củ quả luộc chấm kho quẹt": i("Boiled vegetables with caramelised pork dip", "Отварные овощи с соусом «кхо куэт»"),
  "Bông bí xào tỏi": i("Pumpkin flowers with garlic", "Цветки тыквы с чесноком"),
  "Mùng tơi xào tỏi": i("Malabar spinach with garlic", "Малабарский шпинат с чесноком"),
  "Rau muống xào tỏi": i("Morning glory with garlic", "Водяной шпинат с чесноком"),
  "Rau rừng xào tỏi": i("Wild greens with garlic", "Лесная зелень с чесноком"),
  "Rau rừng luộc kho quẹt": i("Boiled wild greens with caramelised pork dip", "Отварная лесная зелень с соусом «кхо куэт»"),
  "Bông Cải Xanh Xào Hải Sản": i("Broccoli with seafood", "Брокколи с морепродуктами"),
  "Cà Tím Om Thịt": i("Eggplant braised with pork", "Баклажаны, тушёные со свининой"),
  "Măng Trúc Yên Tử Xào Tỏi": i("Yên Tử bamboo shoots with garlic", "Побеги бамбука Йен Ты с чесноком"),
  "Nấm Xào Thập Cẩm Hải Sản": i("Mixed mushrooms with seafood", "Грибное ассорти с морепродуктами"),
  "Khổ Qua": i("Bitter melon", "Горькая дыня", "with dried shrimp floss / stir-fried with egg", "с креветочной стружкой / жареная с яйцом"),
  // Cơm - Mỳ - Miến - Cháo
  "Cơm chiên hải sản": i("Seafood fried rice", "Жареный рис с морепродуктами"),
  "Cơm chiên cá mặn - Ruốc Bông": i("Fried rice with salted fish & pork floss", "Жареный рис с солёной рыбой и свиной стружкой"),
  "Cơm Chiên Trái Dứa": i("Pineapple fried rice", "Жареный рис в ананасе"),
  "Cơm Chiên Trứng": i("Egg fried rice", "Жареный рис с яйцом"),
  "Cơm Chiên Dưa Bò": i("Fried rice with pickled mustard greens & beef", "Жареный рис с маринованной горчицей и говядиной"),
  "Cơm Chiên Cá Dứa": i("Fried rice with catfish", "Жареный рис с сомом"),
  "Cháo hải sản": i("Seafood congee", "Рисовая каша с морепродуктами"),
  "Cháo thịt bò bằm": i("Minced beef congee", "Рисовая каша с говяжьим фаршем"),
  "Cháo hàu": i("Oyster congee", "Рисовая каша с устрицами"),
  "Mỳ xào hải sản": i("Stir-fried noodles with seafood", "Жареная лапша с морепродуктами"),
  "Mỳ xào bò": i("Stir-fried noodles with beef", "Жареная лапша с говядиной"),
  "Miến xào hải sản": i("Stir-fried glass noodles with seafood", "Жареная стеклянная лапша с морепродуктами"),
  // Canh
  "Canh nghêu nấu chua": i("Sour clam soup", "Кислый суп с моллюсками", SOUP_POT_EN, SOUP_POT_RU),
  "Canh Cá Nấu Dưa Cay Trung Hoa": i("Chinese spicy pickled-mustard fish soup", "Острый рыбный суп с квашеной горчицей по-китайски"),
  "Canh rau dền tôm tươi": i("Amaranth soup with fresh shrimp", "Суп из амаранта с креветками", SOUP_POT_EN, SOUP_POT_RU),
  "Canh nghêu mùng tơi": i("Clam & Malabar spinach soup", "Суп с моллюсками и малабарским шпинатом", SOUP_POT_EN, SOUP_POT_RU),
  "Canh cải thịt băm": i("Mustard greens soup with minced pork", "Суп из горчичной зелени со свиным фаршем", SOUP_POT_EN, SOUP_POT_RU),
  "Canh cua mùng tơi": i("Crab & Malabar spinach soup", "Суп с крабом и малабарским шпинатом", SOUP_POT_EN, SOUP_POT_RU),
  "Canh Khổ Qua Cá Viên": i("Bitter melon soup with fish balls", "Суп из горькой дыни с рыбными шариками"),
  // Món Chay
  "Khổ qua xào đậu hũ cà rốt": i("Bitter melon with tofu & carrot", "Горькая дыня с тофу и морковью"),
  "Cà tím xào": i("Stir-fried eggplant", "Жареные баклажаны"),
  "Chả nấm kho xì dầu": i("Mushroom patties braised in soy sauce", "Грибные котлетки в соевом соусе"),
  "Canh bí đỏ nấu nấm": i("Pumpkin & mushroom soup", "Суп из тыквы с грибами"),
  "Canh rong biển đậu hũ non": i("Seaweed & silken tofu soup", "Суп из водорослей с шёлковым тофу"),
  "Nấm đùi gà chiên giòn": i("Crispy king oyster mushrooms", "Хрустящие королевские вёшенки"),
  "Cải thìa xào nấm": i("Bok choy with mushrooms", "Бок-чой с грибами"),
  "Đậu phụ hấp nấm đông cô": i("Steamed tofu with shiitake", "Тофу на пару с шиитаке"),
  // Tráng Miệng
  "Hoa Quả theo mùa": i("Seasonal fruit platter", "Ассорти сезонных фруктов"),
  "Sữa chua hạt": i("Yogurt with nuts & seeds", "Йогурт с орехами и семенами"),
  // Rượu Ngâm / Dưỡng Sinh
  "Ngọc Linh Trường Sinh VIP 23°": i(
    "Ngọc Linh Trường Sinh VIP 23°",
    "Ngọc Linh Trường Sinh VIP 23°",
    "Vietnam · 23% · 750 ml · Premium Ngọc Linh ginseng liquor in a gift box. “Nourishing and invigorating” (per the label).",
    "Вьетнам · 23% · 750 мл · Премиальная настойка на женьшене Нгок Линь в подарочной коробке. «Укрепляет и придаёт сил» (по этикетке).",
  ),
  "Ngọc Linh Trường Sinh 23°": i(
    "Ngọc Linh Trường Sinh 23°",
    "Ngọc Linh Trường Sinh 23°",
    "Vietnam · 23% · Ngọc Linh ginseng liquor, single bottle.",
    "Вьетнам · 23% · Настойка на женьшене Нгок Линь, бутылка.",
  ),
  "Ngọc Linh Trường Sinh 19,5°": i(
    "Ngọc Linh Trường Sinh 19.5°",
    "Ngọc Linh Trường Sinh 19,5°",
    "Vietnam · 19.5% · Ngọc Linh ginseng liquor, lighter than the VIP/23° editions.",
    "Вьетнам · 19,5% · Настойка на женьшене Нгок Линь, мягче версий VIP/23°.",
  ),
  "Rượu Sâm Ngọc Linh Trimico": i(
    "Trimico Ngọc Linh ginseng liquor",
    "Женьшеневая настойка Нгок Линь Trimico",
    "17% · 500 ml · TRIMICO — naturally grown Ngọc Linh mountain ginseng (1,500 m+) with traditional yellow sticky-rice liquor; no added alcohol or preservatives.",
    "17% · 500 мл · TRIMICO — женьшень, выращенный на горе Нгок Линь (выше 1500 м), на традиционной настойке из жёлтого клейкого риса; без добавления спирта и консервантов.",
  ),
  // Rượu Vang
  "La Carminaia Vino Rosso D'Italia 2022": i(
    "La Carminaia Vino Rosso D'Italia 2022",
    "La Carminaia Vino Rosso D'Italia 2022",
    "Italy · 14.5% · 750 ml · Ruby red with violet hints. Aromas of violet and rose petals; full-bodied with firm tannins, redcurrant and ripe raspberry, a gently sweet finish.",
    "Италия · 14,5% · 750 мл · Рубиновый с фиолетовыми бликами. Аромат фиалки и розы; насыщенное, с плотными танинами, красной смородиной и спелой малиной, мягкое сладковатое послевкусие.",
  ),
  "Vang F Gold": i("F Gold wine", "Вино F Gold"),
  "Larus Vino Rosso": i(
    "Larus Vino Rosso",
    "Larus Vino Rosso",
    "An elegant Italian red balancing craftsmanship, quality and character — a delightful journey for wine lovers.",
    "Элегантное итальянское красное вино — гармония мастерства, качества и характера для ценителей вина.",
  ),
  "Calera De Tango Gran Reserva": i(
    "Calera De Tango Gran Reserva",
    "Calera De Tango Gran Reserva",
    "Chile · 13.5% · 750 ml · Deep ruby with violet hints. Sweet and gently tart notes of grape, cherry and ripe plum with vanilla; smooth, lightly sweet finish.",
    "Чили · 13,5% · 750 мл · Глубокий рубиновый с фиолетовыми бликами. Сладость и лёгкая кислинка винограда, вишни и спелой сливы с ванилью; мягкое сладковатое послевкусие.",
  ),
  "Crozes Hermitage Grand Classique Trắng (RV276)": i("Crozes Hermitage Grand Classique White (RV276)", "Crozes Hermitage Grand Classique, белое (RV276)"),
  "Crozes Hermitage Les Hauts D'Eole Trắng (RV277)": i("Crozes Hermitage Les Hauts D'Eole White (RV277)", "Crozes Hermitage Les Hauts D'Eole, белое (RV277)"),
  "Le Mortelle Vivia Trắng (RV278)": i("Le Mortelle Vivia White (RV278)", "Le Mortelle Vivia, белое (RV278)"),
  "Legende Bordeaux Trắng (RV281)": i("Legende Bordeaux White (RV281)", "Legende Bordeaux, белое (RV281)"),
  "Pavo No.1 Chardonnay Trắng (RV297)": i("Pavo No.1 Chardonnay White (RV297)", "Pavo No.1 Chardonnay, белое (RV297)"),
  "Errazuriz Sauvignon Blanc Trắng (RV336)": i("Errazuriz Sauvignon Blanc White (RV336)", "Errazuriz Sauvignon Blanc, белое (RV336)"),
  "Tavernello Vino Bianco D'Italia Trắng (RV340)": i("Tavernello Vino Bianco D'Italia White (RV340)", "Tavernello Vino Bianco D'Italia, белое (RV340)"),
  "Errazuriz Chardonnay D.O. Región De Aconcagua": i(
    "Errazuriz Chardonnay D.O. Región De Aconcagua",
    "Errazuriz Chardonnay D.O. Región De Aconcagua",
    "White wine",
    "Белое вино",
  ),
  // Bia
  "Bia Larue": i("Larue beer", "Пиво Larue", "Larue Smooth · 330 ml can", "Larue Smooth · банка 330 мл"),
  "Bia Huda": i("Huda beer", "Пиво Huda", "Huda · 330 ml can", "Huda · банка 330 мл"),
  "Bia Tiger Bạc Lùn": i("Tiger Crystal (short)", "Tiger Crystal (малая)", "Tiger Silver · 250 ml can", "Tiger Silver · банка 250 мл"),
  "Bia Tiger Bạc Cao": i("Tiger Crystal (tall)", "Tiger Crystal (большая)", "Tiger Silver · 330 ml can", "Tiger Silver · банка 330 мл"),
  "Bia Heineken Bạc Lùn": i("Heineken Silver (short)", "Heineken Silver (малая)", "Heineken Silver · 250 ml can", "Heineken Silver · банка 250 мл"),
  "Bia Heineken Bạc Cao": i("Heineken Silver (tall)", "Heineken Silver (большая)", "Heineken Silver · 330 ml can", "Heineken Silver · банка 330 мл"),
  "Bia Heineken 0.0%": i("Heineken 0.0%", "Heineken 0.0%", "Alcohol-free · 330 ml can", "Безалкогольное · банка 330 мл"),
  "Bia Corona Extra": i("Corona Extra", "Corona Extra", "355 ml bottle", "бутылка 355 мл"),
  "Bia Heineken Pháp": i("Heineken (France)", "Heineken (Франция)", "250 ml", "250 мл"),
  // Nước Ngọt
  "Pepsi": i("Pepsi", "Pepsi", "320 ml can", "банка 320 мл"),
  "Soda": i("Soda water", "Содовая", "Schweppes Soda · 320 ml can", "Schweppes Soda · банка 320 мл"),
  "Nước Suối": i("Still water", "Питьевая вода", "500 ml bottle", "бутылка 500 мл"),
  "7 Up": i("7 Up", "7 Up", "320 ml can", "банка 320 мл"),
  // Cigar
  "Barber Pole": i(
    "Barber Pole",
    "Barber Pole",
    "Nicaragua · Gordo 6\"×60 · Medium · Ecuadorian Habano & Maduro wrapper, Nicaraguan binder & filler. Cedar and coffee-bean notes.",
    "Никарагуа · Gordo 6\"×60 · Средняя крепость · Покровный лист эквадорский Habano и Maduro, связующий и наполнитель — никарагуанские. Ноты кедра и кофейных зёрен.",
  ),
  "Black Market": i(
    "Black Market",
    "Black Market",
    "Honduras · Robusto 5.25\"×52 · Medium · Nicaraguan wrapper, Ecuador Sumatra binder, Honduras & Panama filler. Spicy start, then cocoa, damp earth and black pepper.",
    "Гондурас · Robusto 5.25\"×52 · Средняя крепость · Покровный — Никарагуа, связующий — эквадорская Суматра, наполнитель — Гондурас и Панама. Пряное начало, затем какао, влажная земля и чёрный перец.",
  ),
  "Cao Thunder Smoke": i(
    "CAO Thunder Smoke",
    "CAO Thunder Smoke",
    "Dominican Republic · Toro Extra 6.5\"×52 · Medium–full · Honduran wrapper, Mexican San Andrés binder, Cameroon/Zimbabwe/South African filler. Thick smoke, pepper, leather and charred wood.",
    "Доминикана · Toro Extra 6.5\"×52 · Средняя–высокая крепость · Покровный — Гондурас, связующий — мексиканский Сан-Андрес, наполнитель — Камерун, Зимбабве, ЮАР. Густой дым, перец, кожа и обугленное дерево.",
  ),
  "Angelenos": i(
    "Angelenos",
    "Angelenos",
    "Dominican Republic · Robusto 5.25\"×50 · Mild–medium · Ecuador Connecticut Shade wrapper, Dominican binder & filler. Light and elegant: hay, soft wood, gentle sweetness.",
    "Доминикана · Robusto 5.25\"×50 · Лёгкая–средняя крепость · Покровный — эквадорский Connecticut Shade, связующий и наполнитель — доминиканские. Лёгкая и элегантная: сено, мягкое дерево, нежная сладость.",
  ),
  "Montecristo": i(
    "Montecristo",
    "Montecristo",
    "Nicaragua · No. 2 — 6.125\"×52 · Full · Nicaraguan Habano wrapper, Nicaraguan binder & filler. Cocoa, coffee and oak.",
    "Никарагуа · No. 2 — 6.125\"×52 · Высокая крепость · Покровный — никарагуанский Habano, связующий и наполнитель — никарагуанские. Какао, кофе и дуб.",
  ),
};

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

const ITEM_INDEX = new Map(Object.entries(ITEMS).map(([k, v]) => [norm(k), v]));
const CATEGORY_INDEX = new Map(Object.entries(CATEGORIES).map(([k, v]) => [norm(k), v]));

/** Category label; a translation saved in admin wins over the built-in dictionary. */
export function categoryName(name: string, lang: Lang, stored?: { nameEn?: string | null; nameRu?: string | null }): string {
  if (lang === "vi") return name;
  const saved = lang === "en" ? stored?.nameEn : stored?.nameRu;
  return saved || CATEGORY_INDEX.get(norm(name))?.[lang] || name;
}

/** Built-in translation for a category — pre-fills the admin form. */
export function builtInCategoryName(name: string): { nameEn: string | null; nameRu: string | null } {
  const t = CATEGORY_INDEX.get(norm(name));
  return { nameEn: t?.en ?? null, nameRu: t?.ru ?? null };
}

/** Translations typed in Quản trị → Món ăn (stored on the menu item). */
export type StoredTranslations = {
  nameEn?: string | null;
  noteEn?: string | null;
  nameRu?: string | null;
  noteRu?: string | null;
};

/**
 * Translated dish name + note. Priority: translation saved on the item in admin,
 * then the built-in dictionary below, then the Vietnamese text.
 */
export function dishText(
  name: string,
  note: string | null,
  lang: Lang,
  stored?: StoredTranslations,
): { name: string; note: string | null } {
  if (lang === "vi") return { name, note };
  const t = ITEM_INDEX.get(norm(name));
  const storedName = lang === "en" ? stored?.nameEn : stored?.nameRu;
  const storedNote = lang === "en" ? stored?.noteEn : stored?.noteRu;
  return {
    name: storedName || t?.n[lang] || name,
    note: note ? storedNote || t?.d?.[lang] || note : storedNote || null,
  };
}

/** Built-in translation for a Vietnamese dish name/note — used to pre-fill the admin form. */
export function builtInDishText(name: string, note: string | null): StoredTranslations {
  const t = ITEM_INDEX.get(norm(name));
  if (!t) return {};
  return {
    nameEn: t.n.en,
    nameRu: t.n.ru,
    noteEn: note ? (t.d?.en ?? null) : null,
    noteRu: note ? (t.d?.ru ?? null) : null,
  };
}

/** Accent-free lowercase text used for menu search in any language. */
export function searchKey(...parts: (string | null | undefined)[]): string {
  return parts
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d");
}
