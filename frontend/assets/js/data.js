/* ==========================================================================
   data.js — catalog, categories, reviews, recipes, FAQs, coupons.
   Exposes window.SITE (read-only source of truth for every page).
   ========================================================================== */
(function () {
  'use strict';

  /* ---------------------------------------------------------- categories --- */
  const categories = [
    { slug: 'cold-pressed-oils', name: 'Cold Pressed Oils', ta: 'செக்கு எண்ணெய்கள்', blurb: 'Wood-pressed in traditional chekku, unrefined and aroma-rich.' },
    { slug: 'traditional-rice', name: 'Traditional Rice', ta: 'பாரம்பரிய அரிசி', blurb: 'Heritage paddy varieties, single-polished to keep the bran alive.' },
    { slug: 'millets', name: 'Millets', ta: 'சிறுதானியங்கள்', blurb: 'Rain-fed native millets, cleaned and hand-sorted.' },
    { slug: 'instant-foods', name: 'Instant Foods', ta: 'உடனடி உணவுகள்', blurb: 'Traditional recipes made quick — nothing artificial added.' },
    { slug: 'health-mix', name: 'Health Mix', ta: 'ஆரோக்கிய கலவை', blurb: 'Multigrain sathu maavu roasted in small batches.' },
    { slug: 'flour-varieties', name: 'Flour Varieties', ta: 'மாவு வகைகள்', blurb: 'Stone-ground flours milled fresh to order.' },
    { slug: 'bath-body-care', name: 'Bath & Body Care', ta: 'குளியல் பொருட்கள்', blurb: 'Handmade cold-process soaps with herbs and clays.' },
    { slug: 'pickles-powders', name: 'Pickles & Powders', ta: 'ஊறுகாய் & பொடிகள்', blurb: 'Sun-cured pickles and stone-ground podis, no preservatives.' },
    { slug: 'ghee-honey', name: 'Ghee & Honey', ta: 'நெய் & தேன்', blurb: 'Bilona ghee from native cows and raw forest honey.' },
    { slug: 'herbs-hair-care', name: 'Herbs & Hair Care', ta: 'மூலிகைகள் & ஹேர் கேர்', blurb: 'Sun-dried herbs for hair and skin, ground the old way.' }
  ];

  /* ------------------------------------------------------------ products --- */
  /* p(slug, name, ta, cat, price, mrp, unit, rating, reviews, extras) */
  const raw = [
    /* ---- cold pressed oils ---- */
    ['groundnut-oil', 'Groundnut Oil', 'செக்கெண்ணெய்', 'cold-pressed-oils', 280, 320, '1 L', 4.6, 129, {
      tags: ['featured', 'bestseller'], badge: 'Bestseller',
      desc: 'Wood-pressed groundnut oil made from sun-dried Tamil Nadu kernels. Crushed slowly in a wooden chekku so the oil never crosses 40°C, keeping the nutty aroma and natural antioxidants intact. Unrefined, unbleached and filter-settled — never chemically extracted.',
      highlights: ['Wood-pressed in a traditional marachekku', 'Kernels sourced from Erode & Namakkal farms', 'No refining, bleaching or deodorising', 'Rich in vitamin E and natural antioxidants'],
      use: 'Everyday cooking, deep frying, sesame-rice and kootu tempering.',
      sizes: [['500 ml', 155], ['1 L', 280], ['2 L', 540], ['5 L', 1310]],
      specs: { 'Extraction': 'Cold pressed (wooden chekku)', 'Ingredients': '100% groundnut kernels', 'Shelf life': '6 months from packing', 'Storage': 'Cool, dark place; keep bottle closed', 'Packaging': 'Food-grade PET bottle', 'Origin': 'Erode, Tamil Nadu' }
    }],
    ['sesame-oil', 'Gingelly (Sesame) Oil', 'நல்லெண்ணெய்', 'cold-pressed-oils', 340, 385, '1 L', 4.7, 143, {
      tags: ['bestseller'], badge: 'Bestseller',
      desc: 'Pure nallennai pressed from black and white sesame in a stone-and-wood chekku. Deep golden, heavy-bodied and unmistakably aromatic — the oil every Tamil kitchen keeps for pickles, podi rice and oil baths.',
      highlights: ['Pressed from hand-cleaned sesame seed', 'Traditional oil-bath grade', 'No added aroma or colour', 'Naturally settled, cloth filtered'],
      use: 'Pickles, podi rice, idli podi, oil bath and joint massage.',
      sizes: [['500 ml', 185], ['1 L', 340], ['2 L', 660]],
      specs: { 'Extraction': 'Cold pressed (wooden chekku)', 'Ingredients': '100% sesame seeds', 'Shelf life': '9 months from packing', 'Storage': 'Cool, dark place', 'Packaging': 'Food-grade PET bottle', 'Origin': 'Tamil Nadu' }
    }],
    ['coconut-oil', 'Coconut Oil', 'தேங்காய் எண்ணெய்', 'cold-pressed-oils', 320, 360, '1 L', 4.5, 98, {
      desc: 'Cold-pressed from sun-dried Pollachi copra. Solidifies below 24°C — the honest sign of an unrefined coconut oil. Clean coconut sweetness with no bleached flatness.',
      highlights: ['Sun-dried Pollachi copra', 'Edible and cosmetic grade', 'Solidifies in winter (unrefined proof)', 'Lauric-acid rich'],
      use: 'Cooking, hair oil, skin care and baby massage.',
      sizes: [['500 ml', 175], ['1 L', 320], ['2 L', 620]],
      specs: { 'Extraction': 'Cold pressed', 'Ingredients': '100% dried coconut (copra)', 'Shelf life': '9 months', 'Storage': 'Room temperature', 'Packaging': 'Food-grade PET bottle', 'Origin': 'Pollachi, Tamil Nadu' }
    }],
    ['sunflower-oil', 'Sunflower Oil', 'சூரியகாந்தி எண்ணெய்', 'cold-pressed-oils', 260, 295, '1 L', 4.3, 61, {
      desc: 'Light, mild cold-pressed sunflower oil for people who want a neutral everyday oil without solvent extraction. Pressed in small batches and filtered only through cloth.',
      highlights: ['Neutral taste, light body', 'Cold pressed, never solvent extracted', 'Good for daily South Indian cooking', 'No anti-foaming agents'],
      use: 'Everyday sautéing, poriyal and light frying.',
      sizes: [['500 ml', 145], ['1 L', 260], ['5 L', 1240]],
      specs: { 'Extraction': 'Cold pressed', 'Ingredients': '100% sunflower seeds', 'Shelf life': '6 months', 'Storage': 'Cool, dark place', 'Packaging': 'Food-grade PET bottle', 'Origin': 'Tamil Nadu' }
    }],
    ['mustard-oil', 'Mustard Oil', 'கடுகு எண்ணெய்', 'cold-pressed-oils', 300, 340, '1 L', 4.4, 47, {
      desc: 'Kachi ghani mustard oil with its full pungent bite intact. Cold-pressed so the natural allyl isothiocyanate is not cooked off during processing.',
      highlights: ['Kachi ghani (cold pressed)', 'Sharp, authentic pungency', 'Popular for pickling', 'Unrefined and unblended'],
      use: 'Pickling, North Indian cooking and external massage.',
      sizes: [['500 ml', 165], ['1 L', 300]],
      specs: { 'Extraction': 'Cold pressed', 'Ingredients': '100% mustard seeds', 'Shelf life': '6 months', 'Storage': 'Cool, dark place', 'Packaging': 'Food-grade PET bottle', 'Origin': 'India' }
    }],
    ['castor-oil', 'Castor Oil', 'விளக்கெண்ணெய்', 'cold-pressed-oils', 180, 210, '500 ml', 4.2, 38, {
      desc: 'Cold-pressed castor oil, thick and pale, pressed from hand-shelled castor beans. Traditionally used for hair, lashes and as a gentle monthly cleanse.',
      highlights: ['Hand-shelled beans', 'Cold pressed, hexane free', 'Thick, slow-pouring consistency', 'Ricinoleic-acid rich'],
      use: 'Hair and scalp care, lash care, traditional cleansing.',
      sizes: [['200 ml', 85], ['500 ml', 180]],
      specs: { 'Extraction': 'Cold pressed', 'Ingredients': '100% castor beans', 'Shelf life': '12 months', 'Storage': 'Cool, dark place', 'Packaging': 'Food-grade PET bottle', 'Origin': 'Tamil Nadu' }
    }],

    /* ---- traditional rice ---- */
    ['ponni-rice', 'Traditional Ponni Rice', 'பாரம்பரிய அரிசி', 'traditional-rice', 120, 140, '1 kg', 4.5, 96, {
      tags: ['featured'],
      desc: 'Single-polished Ponni raw rice from Cauvery-delta paddy. Just enough polishing to cook soft while the bran layer — and its minerals — stay on the grain.',
      highlights: ['Single polished, bran retained', 'Cauvery delta paddy', 'Cooks soft, holds shape', 'No plastic rice, no polishing agents'],
      use: 'Daily meals, curd rice, sambar sadam.',
      sizes: [['1 kg', 120], ['5 kg', 580], ['10 kg', 1120], ['25 kg', 2740]],
      specs: { 'Type': 'Raw rice, single polished', 'Variety': 'Ponni', 'Cook time': '18–20 minutes', 'Water ratio': '1 : 2.5', 'Packaging': 'Food-grade woven pouch', 'Origin': 'Thanjavur belt, Tamil Nadu' }
    }],
    ['mappillai-samba', 'Mappillai Samba Rice', 'மாப்பிள்ளை சம்பா', 'traditional-rice', 150, 175, '1 kg', 4.6, 84, {
      tags: ['bestseller'], badge: 'Heritage',
      desc: 'The bridegroom\'s rice — a deep red heirloom variety once fed to young men for strength. Nutty, chewy and high in fibre and iron. Unpolished, so it needs a longer soak.',
      highlights: ['Unpolished heirloom red rice', 'High fibre and iron', 'Traditional strength food', 'Soak 45 minutes before cooking'],
      use: 'Kanji, puttu, red rice idli and hearty meals.',
      sizes: [['1 kg', 150], ['5 kg', 730]],
      specs: { 'Type': 'Unpolished red rice', 'Variety': 'Mappillai Samba', 'Cook time': '35–40 minutes', 'Water ratio': '1 : 3', 'Packaging': 'Food-grade woven pouch', 'Origin': 'Tamil Nadu' }
    }],
    ['karuppu-kavuni', 'Karuppu Kavuni Rice', 'கருப்பு கவுனி', 'traditional-rice', 220, 260, '1 kg', 4.7, 72, {
      badge: 'Heritage',
      desc: 'Black Kavuni rice — the antioxidant-dense Chettinad heirloom that turns deep purple as it cooks. Slightly sweet, dense and best served as a festive dessert or a slow, filling meal.',
      highlights: ['Anthocyanin-rich black rice', 'Chettinad heirloom variety', 'Naturally sweet, dense grain', 'Soak overnight for best results'],
      use: 'Kavuni arisi sweet, payasam and puttu.',
      sizes: [['500 g', 120], ['1 kg', 220]],
      specs: { 'Type': 'Unpolished black rice', 'Variety': 'Karuppu Kavuni', 'Cook time': '45–50 minutes', 'Water ratio': '1 : 3.5', 'Packaging': 'Food-grade woven pouch', 'Origin': 'Sivaganga, Tamil Nadu' }
    }],
    ['seeraga-samba', 'Seeraga Samba Rice', 'சீரக சம்பா', 'traditional-rice', 180, 205, '1 kg', 4.6, 91, {
      stock: 0,
      desc: 'The tiny cumin-shaped grain behind every good Tamil biryani. Absorbs masala without turning mushy and carries a distinct fragrance no basmati substitute matches.',
      highlights: ['Fine, cumin-sized grain', 'Absorbs spice beautifully', 'Aromatic without added scent', 'Aged for better separation'],
      use: 'Biryani, ghee rice and pulao.',
      sizes: [['1 kg', 180], ['5 kg', 870]],
      specs: { 'Type': 'Raw rice, lightly polished', 'Variety': 'Seeraga Samba', 'Cook time': '15–18 minutes', 'Water ratio': '1 : 2', 'Packaging': 'Food-grade woven pouch', 'Origin': 'Tamil Nadu' }
    }],
    ['kichadi-samba', 'Kichadi Samba Rice', 'கிச்சடி சம்பா', 'traditional-rice', 140, 160, '1 kg', 4.3, 44, {
      desc: 'A soft, quick-cooking samba variety traditionally used for kichadi, pongal and easy-to-digest meals for children and elders.',
      highlights: ['Soft, quick cooking', 'Easy to digest', 'Traditional pongal grain', 'Single polished'],
      use: 'Ven pongal, kichadi and baby food.',
      sizes: [['1 kg', 140], ['5 kg', 680]],
      specs: { 'Type': 'Raw rice, single polished', 'Variety': 'Kichadi Samba', 'Cook time': '16–18 minutes', 'Water ratio': '1 : 3', 'Packaging': 'Food-grade woven pouch', 'Origin': 'Tamil Nadu' }
    }],

    /* ---- millets ---- */
    ['kambu-millet', 'Kambu (Pearl Millet)', 'கம்பு', 'millets', 90, 105, '1 kg', 4.4, 66, {
      desc: 'Rain-fed pearl millet, hand-cleaned and de-stoned. A summer grain in Tamil Nadu — cooling as kambu koozh, warming as a dosa. Naturally high in iron.',
      highlights: ['Rain-fed, unpolished', 'High in iron and magnesium', 'Hand cleaned and de-stoned', 'No moisture-added weight'],
      use: 'Kambu koozh, dosa, adai and porridge.',
      sizes: [['500 g', 50], ['1 kg', 90], ['5 kg', 430]],
      specs: { 'Type': 'Whole millet', 'Variety': 'Pearl millet (Bajra)', 'Soak time': '6–8 hours', 'Cook time': '25 minutes', 'Packaging': 'Food-grade woven pouch', 'Origin': 'Tamil Nadu' }
    }],
    ['thinai-millet', 'Thinai (Foxtail Millet)', 'திணை', 'millets', 110, 125, '1 kg', 4.5, 58, {
      desc: 'Foxtail millet — the temple grain. Low glycemic, quick to cook and light on the stomach. Our lot is single de-husked with the germ intact.',
      highlights: ['Low glycemic index', 'Cooks in 15 minutes', 'Germ retained', 'Rich in dietary fibre'],
      use: 'Pongal, upma, millet rice and payasam.',
      sizes: [['500 g', 60], ['1 kg', 110], ['5 kg', 530]],
      specs: { 'Type': 'De-husked millet', 'Variety': 'Foxtail (Thinai)', 'Soak time': '30 minutes', 'Cook time': '15 minutes', 'Packaging': 'Food-grade woven pouch', 'Origin': 'Tamil Nadu' }
    }],
    ['ragi-millet', 'Ragi (Finger Millet)', 'கேழ்வரகு', 'millets', 85, 98, '1 kg', 4.6, 77, {
      tags: ['bestseller'],
      desc: 'Whole finger millet with one of the highest natural calcium levels of any grain. Sprout it, grind it, or cook it whole as a mudde.',
      highlights: ['Highest calcium among cereals', 'Whole grain, not flour', 'Ideal for sprouting', 'Gluten free'],
      use: 'Ragi kali, malt, ragi mudde and dosa.',
      sizes: [['500 g', 48], ['1 kg', 85], ['5 kg', 410]],
      specs: { 'Type': 'Whole millet', 'Variety': 'Finger millet (Ragi)', 'Soak time': '8 hours (for sprouting)', 'Cook time': '20 minutes', 'Packaging': 'Food-grade woven pouch', 'Origin': 'Tamil Nadu' }
    }],
    ['varagu-millet', 'Varagu (Kodo Millet)', 'வரகு', 'millets', 100, 115, '1 kg', 4.3, 41, {
      desc: 'Kodo millet, a drought-hardy grain with a firm bite that stands in for rice without going sticky. Popular with diabetic households.',
      highlights: ['Firm texture, rice substitute', 'High fibre, low GI', 'Drought-resilient native crop', 'De-husked, unpolished'],
      use: 'Millet rice, biryani, lemon rice and idli.',
      sizes: [['500 g', 55], ['1 kg', 100], ['5 kg', 480]],
      specs: { 'Type': 'De-husked millet', 'Variety': 'Kodo (Varagu)', 'Soak time': '2 hours', 'Cook time': '20 minutes', 'Packaging': 'Food-grade woven pouch', 'Origin': 'Tamil Nadu' }
    }],
    ['samai-millet', 'Samai (Little Millet)', 'சாமை', 'millets', 105, 120, '1 kg', 4.4, 39, {
      desc: 'Little millet — the smallest and softest of the native millets. Cooks fast, digests easily and takes on the flavour of whatever you cook it with.',
      highlights: ['Softest native millet', 'Cooks in 12 minutes', 'Gentle on digestion', 'Good first millet for children'],
      use: 'Upma, kheer, curd millet and pongal.',
      sizes: [['500 g', 58], ['1 kg', 105]],
      specs: { 'Type': 'De-husked millet', 'Variety': 'Little millet (Samai)', 'Soak time': '30 minutes', 'Cook time': '12 minutes', 'Packaging': 'Food-grade woven pouch', 'Origin': 'Tamil Nadu' }
    }],
    ['millet-mix', 'Five Millet Mix', 'ஐந்து சிறுதானிய கலவை', 'millets', 130, 150, '1 kg', 4.5, 52, {
      tags: ['new'], badge: 'New',
      desc: 'Equal parts thinai, samai, varagu, kudiraivali and kambu, matched for cook time so nothing turns to mush. One pot, five millets.',
      highlights: ['Five millets, one cook time', 'Balanced fibre and protein', 'No rice, no filler grain', 'Ready to cook after a short soak'],
      use: 'Millet rice, khichdi, upma and pongal.',
      sizes: [['500 g', 72], ['1 kg', 130]],
      specs: { 'Type': 'Millet blend', 'Contains': 'Thinai, Samai, Varagu, Kudiraivali, Kambu', 'Soak time': '1 hour', 'Cook time': '18 minutes', 'Packaging': 'Food-grade woven pouch', 'Origin': 'Tamil Nadu' }
    }],

    /* ---- instant foods ---- */
    ['instant-ragi-malt', 'Instant Ragi Malt', 'உடனடி ராகி மால்ட்', 'instant-foods', 160, 185, '500 g', 4.4, 63, {
      desc: 'Sprouted, roasted and stone-ground ragi with a touch of cardamom and palm jaggery. Stir into hot water or milk — no cooking, no lumps.',
      highlights: ['Sprouted then roasted ragi', 'Sweetened with palm jaggery', 'Dissolves without lumps', 'No maltodextrin or flavouring'],
      use: 'Two heaped spoons in hot milk or water.',
      sizes: [['250 g', 88], ['500 g', 160]],
      specs: { 'Ingredients': 'Sprouted ragi, palm jaggery, cardamom', 'Shelf life': '4 months', 'Storage': 'Airtight, dry place', 'Serving': '20 g per cup', 'Packaging': 'Food-grade tin', 'Origin': 'Erode, Tamil Nadu' }
    }],
    ['millet-dosa-mix', 'Millet Dosa Mix', 'சிறுதானிய தோசை மாவு', 'instant-foods', 140, 165, '500 g', 4.3, 48, {
      desc: 'A ready dry mix of millets, urad dal and fenugreek. Add water, rest for three hours, and pour crisp millet dosas without an overnight grind.',
      highlights: ['Ready in 3 hours, no grinder', 'Millet-and-dal balanced batter', 'No baking soda or ENO', 'Makes about 22 dosas'],
      use: 'Mix 1 : 1.5 with water, rest 3 hours, pour.',
      sizes: [['500 g', 140], ['1 kg', 265]],
      specs: { 'Ingredients': 'Millets, urad dal, fenugreek, salt', 'Shelf life': '3 months', 'Storage': 'Airtight, dry place', 'Yield': '~22 dosas per 500 g', 'Packaging': 'Food-grade pouch', 'Origin': 'Erode, Tamil Nadu' }
    }],
    ['instant-kanji-mix', 'Instant Kanji Mix', 'உடனடி கஞ்சி மாவு', 'instant-foods', 120, 140, '500 g', 4.2, 35, {
      desc: 'Roasted millet-and-pulse kanji powder for a five-minute porridge. Savoury base — season with buttermilk and shallots, or sweeten with jaggery.',
      highlights: ['Ready in 5 minutes', 'Roasted, easily digestible', 'Works savoury or sweet', 'No salt added — season to taste'],
      use: 'Whisk 3 spoons into 200 ml water, simmer 5 minutes.',
      sizes: [['500 g', 120]],
      specs: { 'Ingredients': 'Millets, moong dal, rice, cumin', 'Shelf life': '3 months', 'Storage': 'Airtight, dry place', 'Serving': '30 g per bowl', 'Packaging': 'Food-grade pouch', 'Origin': 'Erode, Tamil Nadu' }
    }],

    /* ---- health mix ---- */
    ['health-mix-powder', 'Health Mix Powder', 'ஆரோக்கிய கலவை', 'health-mix', 180, 210, '500 g', 4.5, 68, {
      tags: ['featured', 'bestseller'], badge: 'Bestseller',
      desc: 'Eighteen ingredients — millets, pulses, nuts and seeds — sprouted, sun-dried, roasted separately and then stone-ground. The kind of mix that used to be made at home before packets existed.',
      highlights: ['18 sprouted & roasted ingredients', 'Stone ground in small batches', 'No sugar, no preservatives', 'Suitable from 2 years upward'],
      use: 'Two spoons in hot water or milk, sweeten to taste.',
      sizes: [['250 g', 98], ['500 g', 180], ['1 kg', 340]],
      specs: { 'Ingredients': '18 grains, pulses, nuts & seeds', 'Shelf life': '4 months', 'Storage': 'Airtight, dry place', 'Serving': '25 g per cup', 'Packaging': 'Food-grade pouch', 'Origin': 'Erode, Tamil Nadu' }
    }],
    ['sathu-maavu', 'Sathu Maavu', 'சத்து மாவு', 'health-mix', 180, 200, '500 g', 4.6, 81, {
      tags: ['featured'],
      desc: 'The classic Tamil weaning and growing-up mix: sprouted ragi, wheat, moong, groundnut, cashew and cardamom. Ground fine enough for a smooth, lump-free kanji.',
      highlights: ['Sprouted grains for easier digestion', 'Fine grind — no lumps', 'Kid-friendly, mildly sweet aroma', 'No added sugar or salt'],
      use: 'Cook 2 spoons in 150 ml water/milk for 5 minutes.',
      sizes: [['250 g', 98], ['500 g', 180], ['1 kg', 340]],
      specs: { 'Ingredients': 'Sprouted ragi, wheat, moong, groundnut, cashew, cardamom', 'Shelf life': '4 months', 'Storage': 'Airtight, dry place', 'Serving': '25 g per bowl', 'Packaging': 'Food-grade pouch', 'Origin': 'Erode, Tamil Nadu' }
    }],
    ['badam-health-mix', 'Badam Health Mix', 'பாதாம் ஆரோக்கிய கலவை', 'health-mix', 260, 300, '400 g', 4.4, 42, {
      tags: ['new'], badge: 'New',
      desc: 'Almond-forward version of our health mix, with pistachio, cashew and saffron folded in. Richer, milkier and a little indulgent.',
      highlights: ['Almond and pistachio rich', 'Real saffron, no colouring', 'Stone ground, small batch', 'No sugar added'],
      use: 'Two spoons in hot milk; add jaggery if you like it sweet.',
      sizes: [['200 g', 140], ['400 g', 260]],
      specs: { 'Ingredients': 'Almond, pistachio, cashew, millets, saffron, cardamom', 'Shelf life': '4 months', 'Storage': 'Airtight, dry place', 'Serving': '20 g per cup', 'Packaging': 'Food-grade tin', 'Origin': 'Erode, Tamil Nadu' }
    }],

    /* ---- flour varieties ---- */
    ['ragi-flour', 'Ragi Flour', 'கேழ்வரகு மாவு', 'flour-varieties', 95, 110, '1 kg', 4.4, 55, {
      desc: 'Stone-ground finger millet flour, milled to order so it never sits long enough to turn bitter. Whole grain — bran and germ included.',
      highlights: ['Stone ground, milled to order', 'Whole grain, nothing sieved out', 'High calcium', 'Gluten free'],
      use: 'Ragi kali, dosa, roti and malt.',
      sizes: [['500 g', 55], ['1 kg', 95]],
      specs: { 'Type': 'Whole millet flour', 'Grinding': 'Stone mill', 'Shelf life': '2 months', 'Storage': 'Airtight; refrigerate in summer', 'Packaging': 'Food-grade pouch', 'Origin': 'Tamil Nadu' }
    }],
    ['kambu-flour', 'Kambu Flour', 'கம்பு மாவு', 'flour-varieties', 90, 105, '1 kg', 4.2, 33, {
      desc: 'Pearl millet flour with its natural nutty edge. Best used within a few weeks — bajra flour is honest but not patient.',
      highlights: ['Stone ground fresh', 'Iron rich', 'Whole grain flour', 'Gluten free'],
      use: 'Kambu dosa, roti, koozh and adai.',
      sizes: [['500 g', 52], ['1 kg', 90]],
      specs: { 'Type': 'Whole millet flour', 'Grinding': 'Stone mill', 'Shelf life': '6 weeks', 'Storage': 'Airtight; refrigerate for longer', 'Packaging': 'Food-grade pouch', 'Origin': 'Tamil Nadu' }
    }],
    ['wheat-flour', 'Whole Wheat Atta', 'கோதுமை மாவு', 'flour-varieties', 80, 92, '1 kg', 4.3, 60, {
      desc: 'Chakki-ground whole wheat with the bran left in. Soft rotis without maida, dough conditioners or added gluten.',
      highlights: ['Chakki stone ground', 'Bran retained', 'No maida blending', 'Milled to order'],
      use: 'Chapati, poori, parotta and bread.',
      sizes: [['1 kg', 80], ['5 kg', 380]],
      specs: { 'Type': 'Whole wheat flour', 'Grinding': 'Stone chakki', 'Shelf life': '2 months', 'Storage': 'Airtight, dry place', 'Packaging': 'Food-grade pouch', 'Origin': 'India' }
    }],
    ['rice-flour', 'Rice Flour', 'அரிசி மாவு', 'flour-varieties', 70, 82, '1 kg', 4.2, 37, {
      desc: 'Raw rice flour, dry-roasted lightly and sieved twice — the right texture for kozhukattai, murukku and idiyappam.',
      highlights: ['Double sieved, fine texture', 'Lightly dry roasted', 'No anti-caking agents', 'Milled from single-polished rice'],
      use: 'Idiyappam, kozhukattai, murukku and adai.',
      sizes: [['500 g', 40], ['1 kg', 70]],
      specs: { 'Type': 'Rice flour', 'Grinding': 'Stone mill', 'Shelf life': '3 months', 'Storage': 'Airtight, dry place', 'Packaging': 'Food-grade pouch', 'Origin': 'Tamil Nadu' }
    }],

    /* ---- bath & body ---- */
    ['multani-mitti-soap', 'Multani Mitti Soap', 'முல்தானி மிட்டி சோப்', 'bath-body-care', 120, 140, '100 g', 4.3, 74, {
      tags: ['featured'],
      desc: 'Cold-process soap with Rajasthani fuller\'s earth, cold-pressed coconut oil and a little sandal. Cures for four weeks before it leaves the workshop, which is why the bar lasts.',
      highlights: ['Cold process, 4-week cured', 'Fuller\'s earth for oily skin', 'No SLS, parabens or palm oil', 'Handmade in batches of 40'],
      use: 'For oily and combination skin; daily face and body use.',
      sizes: [['100 g', 120], ['Pack of 3', 330]],
      specs: { 'Method': 'Cold process, hand cut', 'Ingredients': 'Coconut oil, multani mitti, sandal, lye (saponified)', 'Net weight': '100 g ± 5 g', 'Shelf life': '18 months', 'Skin type': 'Oily / combination', 'Origin': 'Erode, Tamil Nadu' }
    }],
    ['neem-soap', 'Neem Soap', 'வேப்பிலை சோப்', 'bath-body-care', 55, 68, '75 g', 4.2, 62, {
      tags: ['featured'],
      desc: 'A plain, honest neem bar — neem leaf paste and neem oil in a coconut-oil base. Made for acne-prone and prickly-heat-prone skin, especially through a Tamil Nadu summer.',
      highlights: ['Real neem leaf and neem oil', 'For acne-prone skin', 'No synthetic fragrance', 'Vegan, palm-oil free'],
      use: 'Daily bath; good for prickly heat and body acne.',
      sizes: [['75 g', 55], ['Pack of 3', 150], ['Pack of 6', 285]],
      specs: { 'Method': 'Cold process, hand cut', 'Ingredients': 'Coconut oil, neem leaf, neem oil, lye (saponified)', 'Net weight': '75 g ± 5 g', 'Shelf life': '18 months', 'Skin type': 'Acne-prone / all', 'Origin': 'Erode, Tamil Nadu' }
    }],
    ['turmeric-soap', 'Turmeric Soap', 'மஞ்சள் சோப்', 'bath-body-care', 60, 72, '75 g', 4.4, 58, {
      desc: 'Erode turmeric — the high-curcumin kind — blended into a mild coconut and castor oil bar. Brightening without the bleach.',
      highlights: ['Erode high-curcumin turmeric', 'Gentle daily brightening', 'No synthetic colour', 'Handmade, cured 4 weeks'],
      use: 'Daily face and body wash; helps dull, uneven skin.',
      sizes: [['75 g', 60], ['Pack of 3', 165]],
      specs: { 'Method': 'Cold process, hand cut', 'Ingredients': 'Coconut oil, castor oil, turmeric, lye (saponified)', 'Net weight': '75 g ± 5 g', 'Shelf life': '18 months', 'Skin type': 'All', 'Origin': 'Erode, Tamil Nadu' }
    }],
    ['sandal-soap', 'Sandal Soap', 'சந்தன சோப்', 'bath-body-care', 75, 90, '75 g', 4.5, 66, {
      desc: 'Sandalwood powder and a whisper of real sandal oil in a creamy coconut-and-shea base. Mild enough for dry skin, fragrant enough to notice.',
      highlights: ['Real sandalwood powder and oil', 'Shea butter enriched', 'Mild for dry skin', 'No synthetic perfume'],
      use: 'Daily bath; suits dry and sensitive skin.',
      sizes: [['75 g', 75], ['Pack of 3', 205]],
      specs: { 'Method': 'Cold process, hand cut', 'Ingredients': 'Coconut oil, shea butter, sandalwood, lye (saponified)', 'Net weight': '75 g ± 5 g', 'Shelf life': '18 months', 'Skin type': 'Dry / sensitive', 'Origin': 'Erode, Tamil Nadu' }
    }],
    ['herbal-hair-oil', 'Herbal Hair Oil', 'மூலிகை தலை எண்ணெய்', 'bath-body-care', 240, 280, '200 ml', 4.6, 89, {
      tags: ['bestseller'], badge: 'Bestseller',
      desc: 'Twenty-one herbs — karisalankanni, hibiscus, curry leaf, brahmi, neem and more — slow-simmered into cold-pressed coconut and sesame oil until the water fully leaves. That is what makes it keep without preservatives.',
      highlights: ['21 herbs, slow-cooked the traditional way', 'Cold-pressed coconut & sesame base', 'No mineral oil or added fragrance', 'Deep green from herbs, not colour'],
      use: 'Massage into scalp, leave 45 minutes or overnight, wash off.',
      sizes: [['100 ml', 130], ['200 ml', 240], ['500 ml', 560]],
      specs: { 'Method': 'Slow-simmered herbal infusion', 'Ingredients': '21 herbs in coconut & sesame oil', 'Shelf life': '12 months', 'Storage': 'Cool, dark place', 'Packaging': 'Amber PET bottle', 'Origin': 'Erode, Tamil Nadu' }
    }],

    /* ---- pickles & powders ---- */
    ['pickle-combo', 'Pickle Combo (3 Jars)', 'ஊறுகாய் காம்போ', 'pickles-powders', 160, 195, '3 × 150 g', 4.4, 59, {
      tags: ['featured'], badge: 'Combo',
      desc: 'Mango, lemon and garlic pickle in one box — all three sun-cured in gingelly oil with rock salt and no citric acid. The set most first-time customers start with.',
      highlights: ['Three pickles, one box', 'Sun-cured in gingelly oil', 'No preservatives or citric acid', 'Rock salt, never iodised'],
      use: 'With curd rice, kanji, dosa or chapati.',
      sizes: [['3 × 150 g', 160], ['3 × 300 g', 305]],
      specs: { 'Contains': 'Mango, lemon and garlic pickle', 'Ingredients': 'Fruit/veg, gingelly oil, rock salt, chilli, mustard, fenugreek', 'Shelf life': '6 months unopened', 'Storage': 'Refrigerate after opening; use a dry spoon', 'Packaging': 'Glass jars', 'Origin': 'Erode, Tamil Nadu' }
    }],
    ['mango-pickle', 'Mango Pickle', 'மாங்காய் ஊறுகாய்', 'pickles-powders', 150, 175, '300 g', 4.5, 71, {
      stock: 0,
      desc: 'Raw Kili Mooku mangoes cut with the skin on, salted, sun-dried and packed under gingelly oil. Sour first, then hot, then that slow fenugreek finish.',
      highlights: ['Kili Mooku raw mango', 'Sun-cured for 7 days', 'Gingelly oil, rock salt', 'No vinegar or preservative'],
      use: 'Curd rice, kanji, chapati and thayir sadam.',
      sizes: [['150 g', 85], ['300 g', 150], ['500 g', 235]],
      specs: { 'Ingredients': 'Raw mango, gingelly oil, rock salt, chilli, mustard, fenugreek', 'Shelf life': '6 months unopened', 'Storage': 'Refrigerate after opening', 'Spice level': 'Medium-hot', 'Packaging': 'Glass jar', 'Origin': 'Erode, Tamil Nadu' }
    }],
    ['lemon-pickle', 'Lemon Pickle', 'எலுமிச்சை ஊறுகாய்', 'pickles-powders', 140, 165, '300 g', 4.3, 54, {
      desc: 'Country lemons quartered and left in rock salt for ten days before the masala goes in. Sharp, salty and completely preservative free.',
      highlights: ['10-day salt cure', 'Country lemon, thin skin', 'No citric acid added', 'Ages well for months'],
      use: 'Curd rice, kanji and travel meals.',
      sizes: [['150 g', 80], ['300 g', 140]],
      specs: { 'Ingredients': 'Lemon, gingelly oil, rock salt, chilli, mustard, fenugreek', 'Shelf life': '8 months unopened', 'Storage': 'Refrigerate after opening', 'Spice level': 'Medium', 'Packaging': 'Glass jar', 'Origin': 'Erode, Tamil Nadu' }
    }],
    ['idli-podi', 'Idli Podi', 'இட்லி பொடி', 'pickles-powders', 110, 128, '250 g', 4.6, 93, {
      tags: ['bestseller'],
      desc: 'Urad dal, chana dal, red chilli, sesame and a pinch of asafoetida — dry-roasted separately, then stone-ground coarse so it still crackles. Mix with our gingelly oil.',
      highlights: ['Each ingredient roasted separately', 'Coarse stone grind', 'Real asafoetida, no filler flour', 'No garlic version available on request'],
      use: 'With idli, dosa, hot rice and ghee.',
      sizes: [['250 g', 110], ['500 g', 205]],
      specs: { 'Ingredients': 'Urad dal, chana dal, red chilli, sesame, asafoetida, salt', 'Shelf life': '5 months', 'Storage': 'Airtight, dry place', 'Spice level': 'Medium-hot', 'Packaging': 'Food-grade jar', 'Origin': 'Erode, Tamil Nadu' }
    }],
    ['curry-leaf-podi', 'Curry Leaf Podi', 'கறிவேப்பிலை பொடி', 'pickles-powders', 120, 140, '200 g', 4.5, 64, {
      desc: 'Shade-dried curry leaves — never oven-blasted, so they stay green — ground with dals and pepper. Iron-rich and the easiest way to get curry leaf into children.',
      highlights: ['Shade dried, still green', 'Iron and folate rich', 'No colour added', 'Mild, pepper-forward heat'],
      use: 'Hot rice with ghee, idli, dosa and upma.',
      sizes: [['200 g', 120], ['400 g', 225]],
      specs: { 'Ingredients': 'Curry leaf, urad dal, chana dal, pepper, chilli, salt', 'Shelf life': '4 months', 'Storage': 'Airtight, dry place', 'Spice level': 'Mild-medium', 'Packaging': 'Food-grade jar', 'Origin': 'Erode, Tamil Nadu' }
    }],
    ['sambar-powder', 'Sambar Powder', 'சாம்பார் பொடி', 'pickles-powders', 130, 150, '250 g', 4.4, 76, {
      desc: 'Our house sambar podi: coriander-heavy, chilli-measured, with roasted toor dal for body. Ground in a stone mill so it does not scorch and go bitter.',
      highlights: ['Coriander-forward house blend', 'Stone ground, cold grind', 'Roasted toor dal for body', 'No rice flour filler'],
      use: 'Sambar, kootu, vathal kuzhambu and poriyal.',
      sizes: [['250 g', 130], ['500 g', 245]],
      specs: { 'Ingredients': 'Coriander, red chilli, toor dal, chana dal, pepper, cumin, fenugreek, turmeric', 'Shelf life': '6 months', 'Storage': 'Airtight, dry place', 'Spice level': 'Medium', 'Packaging': 'Food-grade jar', 'Origin': 'Erode, Tamil Nadu' }
    }],

    /* ---- ghee & honey ---- */
    ['cow-ghee', 'Pure Cow Ghee', 'சுத்தமான பசு நெய்', 'ghee-honey', 650, 720, '500 ml', 4.8, 111, {
      tags: ['featured', 'bestseller'], badge: 'Bestseller',
      desc: 'Bilona ghee: curd is set from whole milk, hand-churned to butter, then simmered on a wood flame until the grain forms. Roughly 28 litres of milk go into one 500 ml jar — which is why it smells like it does.',
      highlights: ['Bilona method, hand churned', 'Wood-fire simmered, grainy texture', '~28 L milk per 500 ml jar', 'No cream-separator shortcuts'],
      use: 'Pongal, sweets, hot rice, tempering and lamps.',
      sizes: [['250 ml', 340], ['500 ml', 650], ['1 L', 1260]],
      specs: { 'Method': 'Bilona (curd-churned)', 'Source': 'Native cow whole milk', 'Shelf life': '9 months', 'Storage': 'Room temperature; use a dry spoon', 'Packaging': 'Glass jar', 'Origin': 'Erode, Tamil Nadu' }
    }],
    ['a2-ghee', 'A2 Desi Cow Ghee', 'A2 நாட்டு பசு நெய்', 'ghee-honey', 950, 1090, '500 ml', 4.8, 68, {
      badge: 'Premium',
      stock: 0,
      desc: 'Made the same bilona way, but only from Kangayam and Gir cows — indigenous breeds whose milk carries the A2 beta-casein. Smaller herds, smaller batches, a deeper aroma.',
      highlights: ['Kangayam & Gir cow milk only', 'A2 beta-casein', 'Bilona hand-churned', 'Grass-fed, free-grazing herds'],
      use: 'Daily spoonful, pongal, sweets and Ayurvedic use.',
      sizes: [['250 ml', 495], ['500 ml', 950]],
      specs: { 'Method': 'Bilona (curd-churned)', 'Source': 'Kangayam & Gir cow milk', 'Shelf life': '9 months', 'Storage': 'Room temperature; use a dry spoon', 'Packaging': 'Glass jar', 'Origin': 'Erode, Tamil Nadu' }
    }],
    ['forest-honey', 'Wild Forest Honey', 'காட்டு தேன்', 'ghee-honey', 380, 440, '500 g', 4.6, 87, {
      desc: 'Collected by Irula honey-hunters in the Sathyamangalam hills, strained through cloth and bottled raw. It crystallises in cold weather — that is honey behaving normally.',
      highlights: ['Wild-harvested, multi-floral', 'Raw and unheated', 'Cloth strained only', 'Crystallises naturally in winter'],
      use: 'Warm water, kashayam, breakfast and marinades.',
      sizes: [['250 g', 200], ['500 g', 380], ['1 kg', 730]],
      specs: { 'Type': 'Raw multi-floral forest honey', 'Processing': 'Cloth strained, unheated', 'Shelf life': '24 months', 'Storage': 'Room temperature; do not refrigerate', 'Packaging': 'Glass jar', 'Origin': 'Sathyamangalam hills, Tamil Nadu' }
    }],
    ['nattu-sakkarai', 'Nattu Sakkarai (Palm Jaggery)', 'நாட்டு சர்க்கரை', 'ghee-honey', 120, 140, '500 g', 4.4, 51, {
      desc: 'Palm jaggery boiled down from karupatti sap in open pans — no sulphur, no bleaching, no clarifying chemicals. Mineral-rich and only lightly sweet.',
      highlights: ['Open-pan boiled palm sap', 'No sulphur or bleaching agent', 'Iron and mineral rich', 'Lower glycemic than white sugar'],
      use: 'Coffee, sweets, kanji and payasam.',
      sizes: [['500 g', 120], ['1 kg', 225]],
      specs: { 'Type': 'Palm jaggery (karupatti)', 'Processing': 'Open-pan boiled', 'Shelf life': '12 months', 'Storage': 'Airtight, dry place', 'Packaging': 'Food-grade pouch', 'Origin': 'Tamil Nadu' }
    }],

    /* ---- herbs & hair care ---- */
    ['hibiscus-hair-powder', 'Hibiscus Hair Powder', 'செம்பருத்தி பொடி', 'herbs-hair-care', 130, 150, '200 g', 4.5, 57, {
      desc: 'Shade-dried hibiscus flower and leaf, stone-ground. Mucilage-rich, so the paste slips through hair like a natural conditioner.',
      highlights: ['Shade dried flower and leaf', 'Natural conditioning mucilage', 'Stone ground fine', 'Single ingredient, nothing added'],
      use: 'Mix with water or curd into a paste; apply 30 minutes before wash.',
      sizes: [['100 g', 72], ['200 g', 130]],
      specs: { 'Ingredients': '100% hibiscus flower and leaf', 'Processing': 'Shade dried, stone ground', 'Shelf life': '12 months', 'Storage': 'Airtight, dry place', 'Packaging': 'Food-grade pouch', 'Origin': 'Tamil Nadu' }
    }],
    ['shikakai-powder', 'Shikakai Powder', 'சீயக்காய் பொடி', 'herbs-hair-care', 110, 128, '200 g', 4.4, 49, {
      desc: 'Whole shikakai pods ground with the seed in — the way it is done at home. Cleans without stripping and needs no shampoo behind it.',
      highlights: ['Whole pod, seed included', 'Natural saponins — mild cleanser', 'No SLS or added foam', 'Sifted twice for a smooth paste'],
      use: 'Make a thin paste, massage through wet hair, rinse well.',
      sizes: [['100 g', 62], ['200 g', 110]],
      specs: { 'Ingredients': '100% shikakai pods', 'Processing': 'Sun dried, stone ground', 'Shelf life': '18 months', 'Storage': 'Airtight, dry place', 'Packaging': 'Food-grade pouch', 'Origin': 'Tamil Nadu' }
    }],
    ['amla-powder', 'Amla Powder', 'நெல்லிக்காய் பொடி', 'herbs-hair-care', 120, 138, '200 g', 4.5, 53, {
      desc: 'Shade-dried Indian gooseberry, ground fine. Used as a hair pack for strength and greying, or a spoonful in water for vitamin C.',
      highlights: ['Shade dried to protect vitamin C', 'Dual use — hair and internal', 'No additives or anti-caking agents', 'Stone ground fine'],
      use: 'Hair pack with shikakai, or ½ tsp in warm water.',
      sizes: [['100 g', 68], ['200 g', 120]],
      specs: { 'Ingredients': '100% amla fruit', 'Processing': 'Shade dried, stone ground', 'Shelf life': '12 months', 'Storage': 'Airtight, dry place', 'Packaging': 'Food-grade pouch', 'Origin': 'Tamil Nadu' }
    }],
    ['neem-powder', 'Neem Powder', 'வேப்பிலை பொடி', 'herbs-hair-care', 100, 118, '200 g', 4.3, 44, {
      desc: 'Shade-dried neem leaf, ground fine for face packs, scalp treatment and garden use. Bitter, green and unmistakably neem.',
      highlights: ['Shade dried, deep green', 'Face pack and scalp use', 'Single ingredient', 'Also used as a garden bio-input'],
      use: 'Face pack with curd, or scalp paste with water.',
      sizes: [['100 g', 58], ['200 g', 100]],
      specs: { 'Ingredients': '100% neem leaf', 'Processing': 'Shade dried, stone ground', 'Shelf life': '12 months', 'Storage': 'Airtight, dry place', 'Packaging': 'Food-grade pouch', 'Origin': 'Tamil Nadu' }
    }]
  ];

  const SKU_PREFIX = { 'cold-pressed-oils': 'OIL', 'traditional-rice': 'RIC', 'millets': 'MIL', 'instant-foods': 'INS', 'health-mix': 'HLM', 'flour-varieties': 'FLR', 'bath-body-care': 'BBC', 'pickles-powders': 'PPD', 'ghee-honey': 'GHH', 'herbs-hair-care': 'HHC' };

  const products = raw.map(function (r, i) {
    const slug = r[0], x = r[9] || {};
    const cat = categories.find(function (c) { return c.slug === r[3]; });
    const tags = x.tags || [];
    return {
      id: i + 1,
      slug: slug,
      name: r[1],
      ta: r[2],
      cat: r[3],
      catName: cat ? cat.name : r[3],
      catTa: cat ? cat.ta : '',
      price: r[4],
      mrp: r[5],
      unit: r[6],
      rating: r[7],
      reviews: r[8],
      img: 'assets/img/products/' + slug + '.svg',
      sku: 'SO-' + (SKU_PREFIX[r[3]] || 'GEN') + '-' + String(i + 1).padStart(3, '0'),
      badge: x.badge || '',
      tags: tags,
      featured: tags.indexOf('featured') > -1,
      bestseller: tags.indexOf('bestseller') > -1,
      isNew: tags.indexOf('new') > -1,
      stock: x.stock === undefined ? 1 : x.stock,
      desc: x.desc || '',
      highlights: x.highlights || [],
      use: x.use || '',
      sizes: x.sizes || [[r[6], r[4]]],
      specs: x.specs || {},
      off: Math.round((1 - r[4] / r[5]) * 100)
    };
  });

  /* --------------------------------------------------------- home order --- */
  const featuredOrder = ['groundnut-oil', 'ponni-rice', 'multani-mitti-soap', 'health-mix-powder', 'neem-soap', 'sathu-maavu', 'pickle-combo', 'cow-ghee',
    'sesame-oil', 'mappillai-samba', 'herbal-hair-oil', 'forest-honey', 'idli-podi', 'ragi-millet', 'millet-mix', 'a2-ghee'];

  /* ------------------------------------------------------------ reviews --- */
  const reviewPool = [
    { name: 'Meena R.', city: 'Coimbatore', av: 'a1', stars: 5, title: 'Excellent quality products!', text: 'The taste of traditional rice is just amazing. Very happy with the service and the packing was neat — nothing leaked even though I ordered oil and pickle together.' },
    { name: 'Karthik S.', city: 'Erode', av: 'a2', stars: 4, title: 'Pure and authentic', text: 'Pure, natural and authentic products. We trust Shanmuga Organics for our family\'s needs. Delivery to Erode was same next day.' },
    { name: 'Lakshmi P.', city: 'Chennai', av: 'a3', stars: 5, title: 'The oil is superb', text: 'Cold pressed oil quality is superb. You can feel the difference in taste and aroma compared to the refined oil we used before.' },
    { name: 'Ramesh V.', city: 'Salem', av: 'a4', stars: 5, title: 'Ghee smells like my grandmother\'s', text: 'The cow ghee is grainy and smells exactly like what my grandmother used to make at home. Worth every rupee. Ordering the 1 litre next time.' },
    { name: 'Divya M.', city: 'Madurai', av: 'a5', stars: 4, title: 'Health mix my kids actually drink', text: 'My children finish the sathu maavu without complaining, which never happened with store brands. No sugar and still they like it.' },
    { name: 'Anand K.', city: 'Tiruppur', av: 'a2', stars: 5, title: 'Millets are clean', text: 'Ordered five millet varieties. Zero stones, zero husk to pick out. Clearly hand-sorted. Bulk pricing was also fair.' },
    { name: 'Priya S.', city: 'Bengaluru', av: 'a1', stars: 5, title: 'Soaps last long', text: 'The multani mitti and neem soaps last much longer than regular bars. My skin stopped breaking out after switching.' },
    { name: 'Suresh B.', city: 'Trichy', av: 'a4', stars: 4, title: 'Good hair oil', text: 'Herbal hair oil is genuinely herbal — dark green and strong smelling. Used it for two months, hair fall has reduced.' },
    { name: 'Kavitha N.', city: 'Erode', av: 'a3', stars: 5, title: 'Pickles like home', text: 'The mango pickle tastes like my mother\'s. No vinegar smell at all. I have already reordered twice.' }
  ];

  /* ------------------------------------------------------------ recipes --- */
  const recipes = [
    { slug: 'kambu-koozh', img: 'kanji', title: 'Kambu Koozh', ta: 'கம்பு கூழ்', time: '20 min + overnight', serves: '4', level: 'Easy',
      blurb: 'The original Tamil summer cooler — fermented pearl millet porridge with buttermilk, shallots and green chilli.',
      uses: ['kambu-millet'], author_slug: 'shanmuga-kitchen' },
    { slug: 'millet-dosa', img: 'dosa', title: 'Crisp Millet Dosa', ta: 'சிறுதானிய தோசை', time: '25 min + 3 hr rest', serves: '4', level: 'Easy',
      blurb: 'Golden, lacy dosas from our millet dosa mix — no overnight grinding, no baking soda.',
      uses: ['millet-dosa-mix', 'sesame-oil'], author_slug: 'shanmuga-kitchen' },
    { slug: 'podi-sadam', img: 'podi-rice', title: 'Idli Podi Sadam', ta: 'பொடி சாதம்', time: '10 min', serves: '2', level: 'Very easy',
      blurb: 'Hot rice, a spoon of idli podi and a generous pour of gingelly oil. Lunchbox food that never fails.',
      uses: ['idli-podi', 'sesame-oil', 'ponni-rice'], author_slug: 'shanmuga-kitchen' },
    { slug: 'millet-upma', img: 'millet-upma', title: 'Thinai Vegetable Upma', ta: 'திணை உப்புமா', time: '25 min', serves: '3', level: 'Easy',
      blurb: 'Foxtail millet upma with carrot, beans and curry leaf — lighter than rava and holds you longer.',
      uses: ['thinai-millet', 'groundnut-oil', 'curry-leaf-podi'], author_slug: 'shanmuga-kitchen' },
    { slug: 'kavuni-sweet', img: 'ghee-sweet', title: 'Kavuni Arisi Sweet', ta: 'கவுனி அரிசி இனிப்பு', time: '55 min', serves: '6', level: 'Medium',
      blurb: 'The Chettinad black rice dessert — palm jaggery, coconut and a spoon of bilona ghee to finish.',
      uses: ['karuppu-kavuni', 'nattu-sakkarai', 'cow-ghee'], author_slug: 'meena-r' },
    { slug: 'herbal-hair-pack', img: 'herbal-hair', title: 'Weekend Herbal Hair Pack', ta: 'மூலிகை தலை பேக்', time: '45 min', serves: '1 use', level: 'Easy',
      blurb: 'Hibiscus, amla and shikakai whisked into a paste — oil on Saturday night, wash on Sunday morning.',
      uses: ['hibiscus-hair-powder', 'amla-powder', 'shikakai-powder', 'herbal-hair-oil'], author_slug: null }
  ];

  /* --------------------------------------------------------------- faqs --- */
  const faqs = [
    { q: 'Are your products certified organic?', a: 'Our farm-partner produce is grown without synthetic pesticides or chemical fertilisers, and our processing units are FSSAI licensed (Lic. No. 12421008000341). Several of our rice and millet lots carry NPOP organic certification from the grower; where a lot is not certified we call it "natural farming" instead of "organic" on the label, because we would rather be accurate than flattering.' },
    { q: 'What does "cold pressed" actually mean here?', a: 'It means the seed is crushed in a rotating wooden chekku at low speed, so the oil never crosses about 40°C. Nothing is heated, refined, bleached or deodorised, and no solvent such as hexane touches the seed. That is why our oils carry sediment, smell strongly of the seed, and have a shorter shelf life than refined oil — all three are features, not faults.' },
    { q: 'How long does delivery take?', a: 'Erode city: same or next day. Rest of Tamil Nadu: 2–3 working days. Other South Indian states: 3–4 working days. Rest of India: 4–7 working days. You get a tracking link by SMS and email once the parcel is picked up.' },
    { q: 'Is shipping free?', a: 'Yes, on every prepaid order above ₹999. Below that a flat ₹60 applies within Tamil Nadu and ₹90 elsewhere in India. Cash on delivery adds ₹40 regardless of order value.' },
    { q: 'Why did my honey/ghee change texture?', a: 'Raw honey crystallises below about 20°C and ghee sets solid in winter — both are signs that nothing was added to stop it. Stand the honey jar in warm water to loosen it; ghee will melt on its own as the room warms. Neither affects quality or shelf life.' },
    { q: 'Can I order in bulk or for my shop?', a: 'Yes. We supply retailers, caterers, corporate gifting and export buyers. Slab pricing starts at 25 kg per SKU, with private-label packing available from 250 kg. Fill in the wholesale enquiry form and our team replies within one working day with a rate card.' },
    { q: 'What is your return policy?', a: 'If a product arrives damaged, leaking, or past its best-before date, tell us within 48 hours with a photo and we replace it or refund you in full — no return shipment needed. Because these are food items, we cannot accept returns of opened packs for reasons of taste preference.' },
    { q: 'Do you ship outside India?', a: 'We ship to Singapore, Malaysia, the UAE and Sri Lanka for orders above ₹6,000, with freight quoted at checkout. Ghee, honey and pickles have destination-specific customs rules, so our team confirms the packing list by email before dispatch.' },
    { q: 'How should I store the flours?', a: 'Stone-ground whole flours have no preservatives and the germ oil in them will turn if left warm. Keep them airtight and, in Tamil Nadu summers, in the refrigerator. Ragi and kambu flour are best used within six weeks of milling; the milling date is stamped on every pouch.' },
    { q: 'Which payment methods do you accept?', a: 'UPI, all major credit and debit cards, net banking, RuPay, and cash on delivery up to ₹5,000. Payments are handled by a PCI-DSS compliant gateway — we never see or store your card details.' }
  ];

  /* ------------------------------------------------------------ coupons --- */
  const coupons = {
    SHANMUGA10: { type: 'pct', value: 10, min: 500, label: '10% off orders above ₹500' },
    FIRST50: { type: 'flat', value: 50, min: 400, label: '₹50 off your first order' },
    OIL15: { type: 'pct', value: 15, min: 800, cat: 'cold-pressed-oils', label: '15% off cold pressed oils above ₹800' },
    FREESHIP: { type: 'ship', value: 0, min: 300, label: 'Free shipping above ₹300' }
  };

  /* ---------------------------------------------------------- shop info --- */
  const shop = {
    name: 'Shanmuga Organics',
    ta: 'சண்முகி இயற்கை அங்காடி',
    addr1: 'Dharapuram Road, Erode',
    addr2: 'Tamil Nadu - 638 004',
    phone: '+91 638 004 0001',
    phoneHref: '+916380040001',
    whatsapp: '+91 638 004 0002',
    email: 'info@shanmugaorganics.com',
    wholesaleEmail: 'wholesale@shanmugaorganics.com',
    hours: 'Mon - Sat: 9:00 AM - 7:00 PM',
    hoursTa: 'திங்கள் - சனி: காலை 9 - இரவு 7',
    fssai: '12421008000341',
    gst: '33ABCDE1234F1Z5',
    freeShipOver: 999,
    shipFlatTN: 60,
    shipFlatIN: 90,
    codFee: 40
  };

  window.SITE = {
    categories: categories,
    products: products,
    featuredOrder: featuredOrder,
    reviewPool: reviewPool,
    recipes: recipes,
    faqs: faqs,
    coupons: coupons,
    shop: shop,
    /* In-memory map of author_slug -> author row. Populated lazily by
       pages.js#recipesPage() from the public_author_profiles view. */
    authors: {},
    byAuthor: function (slug) { return (slug && window.SITE.authors[slug]) || null; },
    byslug: function (s) { return window.SITE.products.filter(function (p) { return p.slug === s; })[0] || null; },
    incat: function (c) { return window.SITE.products.filter(function (p) { return p.cat === c; }); },
    cat: function (s) { return categories.filter(function (c) { return c.slug === s; })[0] || null; },
    featured: function () {
      return featuredOrder.map(function (s) { return window.SITE.byslug(s); }).filter(Boolean);
    }
  };

  /* Version marker — lets us verify in the console (F12) which copy of
     data.js the browser is actually running. */
  console.log('[SO] data.js v5 loaded — ' + categories.length + ' categories, ' + products.length + ' products');

  /* ---- merge admin-added custom categories from localStorage into SITE ---- */
  try {
    var raw_cats = localStorage.getItem('so_admin_categories_v1');
    if (raw_cats) {
      var customCats = JSON.parse(raw_cats);
      if (Array.isArray(customCats) && customCats.length > 0) {
        var existingSlugs = {};
        categories.forEach(function (c) { existingSlugs[c.slug] = true; });
        customCats.forEach(function (cc) {
          if (!existingSlugs[cc.slug]) {
            categories.push(cc);
            existingSlugs[cc.slug] = true;
          } else {
            for (var i = 0; i < categories.length; i++) {
              if (categories[i].slug === cc.slug) {
                categories[i].name = cc.name;
                categories[i].ta = cc.ta;
                categories[i].blurb = cc.blurb;
                if (cc.img) categories[i].img = cc.img;
                break;
              }
            }
          }
        });
      }
    }

    /* Deleted-category block-list removed: the storefront must always show
       every category in the catalog. (Previously, slugs saved by the admin
       panel under 'so_admin_deleted_categories_v1' were spliced out here,
       which silently hid categories from every page.) */
  } catch (e) { /* ignore parse errors */ }

  /* ---- merge admin-added custom products from localStorage into SITE ---- */
  try {
    var raw_custom = localStorage.getItem('so_admin_products_v1');
    if (raw_custom) {
      var customProds = JSON.parse(raw_custom);
      if (Array.isArray(customProds) && customProds.length > 0) {
        // Build a set of existing slugs to avoid duplicates
        var existingSlugs = {};
        window.SITE.products.forEach(function (p) { existingSlugs[p.slug] = true; });

        customProds.forEach(function (cp) {
          if (existingSlugs[cp.slug]) {
            /* Admin edit of an existing product — patch the catalog entry so
               edited name/price/images show on the storefront too. */
            var catObjOv = window.SITE.cat(cp.cat);
            for (var pi = 0; pi < window.SITE.products.length; pi++) {
              var tgt = window.SITE.products[pi];
              if (tgt.slug !== cp.slug) continue;
              ['name', 'ta', 'cat', 'price', 'mrp', 'unit', 'desc', 'badge',
                'img', 'images', 'sizes', 'highlights', 'rating', 'stock'
              ].forEach(function (k) {
                if (cp[k] !== undefined && cp[k] !== null) tgt[k] = cp[k];
              });
              tgt.catName = catObjOv ? catObjOv.name : cp.cat;
              tgt.catTa = catObjOv ? catObjOv.ta : '';
              tgt.off = cp.mrp > cp.price ? Math.round((1 - cp.price / cp.mrp) * 100) : 0;
              break;
            }
            return;
          }
          // Build a proper product object matching the catalog shape
          var catObj = window.SITE.cat(cp.cat);
          var catName = catObj ? catObj.name : cp.cat;
          var off = cp.mrp > cp.price ? Math.round((1 - cp.price / cp.mrp) * 100) : 0;
          var prod = {
            id: window.SITE.products.length + 1,
            slug: cp.slug,
            name: cp.name,
            ta: cp.ta || '',
            cat: cp.cat,
            catName: catName,
            catTa: catObj ? catObj.ta : '',
            price: cp.price,
            mrp: cp.mrp || cp.price,
            off: off,
            unit: cp.unit || '',
            rating: cp.rating || 4.5,
            reviews: cp.reviews || 0,
            badge: cp.badge || '',
            img: cp.img || '',
            images: (cp.images && cp.images.length) ? cp.images.filter(Boolean) : (cp.img ? [cp.img] : []),
            sku: 'SO-CUS-' + Date.now(),
            desc: cp.desc || '',
            highlights: (cp.highlights && cp.highlights.length) ? cp.highlights : [],
            use: '',
            sizes: cp.sizes || [[cp.unit || '', cp.price]],
            specs: {},
            tags: cp.badge ? [cp.badge.toLowerCase()] : [],
            stock: cp.stock !== false,
            featured: false,
            bestseller: false,
            isNew: true,
            custom: true
          };
          window.SITE.products.push(prod);
          existingSlugs[cp.slug] = true;
        });
      }
    }
  } catch (e) { /* ignore parse errors */ }

  /* ---- Maintenance mode guard (Admin → Settings → General Settings) ---- */
  /* When the admin toggles Maintenance Mode ON, every storefront page that
     loads data.js (except admin/utility pages) is covered by an opaque
     full-screen maintenance overlay. Stored in so_admin_settings_v1. */
  try {
    var _mmRaw = localStorage.getItem('so_admin_settings_v1');
    var _mmCfg = _mmRaw ? JSON.parse(_mmRaw) : null;
    var _mmPath = (location.pathname || '').toLowerCase();
    var _mmSkip = /admin\.html|migrate\.html|supabase-checker\.html|setup\.html$/.test(_mmPath);
    if (_mmCfg && _mmCfg.maintenanceMode && !_mmSkip && document.body) {
      document.title = 'Maintenance — Shanmuga Organics';
      var _mmVeil = document.createElement('div');
      _mmVeil.setAttribute('data-maintenance-veil', '1');
      _mmVeil.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:linear-gradient(135deg,#f6f2e4 0%,#eef4e8 100%);display:flex;align-items:center;justify-content:center;text-align:center;padding:20px;font-family:Inter,Noto Sans Tamil,sans-serif';
      _mmVeil.innerHTML =
        '<div style="background:#fff;border:1px solid #e2e8e0;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.08);padding:40px 32px;max-width:420px">' +
        '<img src="assets/img/logo.png" alt="Shanmuga Organics" style="height:60px;max-width:170px;object-fit:contain;margin-bottom:14px">' +
        '<h1 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#22301f">🛠️ We will be back soon!</h1>' +
        '<p style="margin:0 0 4px;font-size:14px;color:#4a554a;line-height:1.6">Our store is under maintenance right now.<br>நம்ம கடை தற்காலிகமா மூடப்பட்டிருக்கு — கொஞ்ச நேரத்துல திரும்பி வருகிறோம்!</p>' +
        '<p style="margin:14px 0 0;font-size:12px;color:#98a29a">For urgent orders, call <b style="color:#2f8f43">+91 638 004 0001</b></p>' +
        '</div>';
      document.body.appendChild(_mmVeil);
      document.body.style.overflow = 'hidden';
    }

    /* Live cross-tab update: when the admin toggles Maintenance Mode in
       another tab, refresh this page so the veil appears/disappears
       instantly (the storage event fires in every OTHER open tab). */
    window.addEventListener('storage', function (ev) {
      if (!ev || ev.key !== 'so_admin_settings_v1') return;
      var on = false;
      try { on = !!(JSON.parse(ev.newValue || '{}') || {}).maintenanceMode; } catch (e) { on = false; }
      var veil = document.querySelector('[data-maintenance-veil]');
      if ((on && !veil && !_mmSkip) || (!on && veil)) location.reload();
    });
  } catch (e) { /* ignore */ }
})();

