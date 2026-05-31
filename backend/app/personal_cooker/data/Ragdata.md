# BD_Cooking_RAG_KnowledgeBase
# Bangladeshi Personalized Cooking Guidelines — RAG-Optimized Knowledge Base
# Source: National Dietary Guidelines for Bangladesh 2022 (BIRDEM | WHO | ADA | FAO)
# Format: Each chunk is self-contained. Metadata headers precede content.
# Instructions for ingestion: Parse each block between --- separators as one document chunk.

---

## CHUNK: SYSTEM_INTRO_001
**CONDITION:** ALL
**CATEGORY:** system_context
**KEYWORDS:** bangladeshi cooking, medical conditions, health guidelines, BIRDEM, dietary guidelines bangladesh 2022
**QUERY_TRIGGERS:** what is this, general info, all conditions

This knowledge base provides medically grounded, culturally appropriate cooking guidance for Bangladeshi people managing chronic health conditions. All content is based on the National Dietary Guidelines for Bangladesh 2022, sourced from BIRDEM, WHO, ADA, FAO, and National Nutrition Services Bangladesh. Conditions covered: Diabetes Mellitus, Hypertension, Coronary Heart Disease, Chronic Kidney Disease (CKD), Renal Stones, Liver Disease, Obesity, Hypothyroidism, Tuberculosis (TB), Diarrhoea, and Cancer. DISCLAIMER: Always follow your physician's and registered dietitian's specific advice.

---

## CHUNK: DM_PARAMS_001
**CONDITION:** diabetes, diabetes mellitus, diabetic, blood sugar, blood glucose
**CATEGORY:** nutritional_parameters
**KEYWORDS:** diabetes parameters, carbohydrate intake diabetes, protein fat fibre diabetes, meal frequency diabetic, sodium diabetes, glycemic control
**QUERY_TRIGGERS:** daily intake, nutrition targets, how much carb, how much protein, meal schedule diabetic

Key daily nutritional targets for diabetes patients in Bangladesh:
- Carbohydrates: 50–60% of total daily calories — complex carbohydrates only (no refined or sugary carbs).
- Protein: 10–20% of energy; prefer vegetable protein over animal protein.
- Fat: 20–30% of total calories; maintain equal balance of saturated, monounsaturated, and polyunsaturated fats.
- Fibre: 25–30 g/day — soluble fibre specifically helps control blood glucose.
- Sodium: less than 2000 mg/day.
- Dietary cholesterol: less than 200 mg/day.
- Meal frequency: 5–6 times per day, every 3 to 3.5 hours; 3 main meals plus 2–3 snacks. Never skip meals — hypoglycaemia is as dangerous as hyperglycaemia.

---

## CHUNK: DM_ALLOW_001
**CONDITION:** diabetes, diabetic, blood sugar, sugar patient
**CATEGORY:** allowed_foods
**KEYWORDS:** diabetes allowed foods, low GI foods bangladesh, grains for diabetics, rice for diabetes, whole wheat, brown rice, parboiled rice, siddha chal, ata, whole grain, dal for diabetic, mosur dal, mung dal, chola, maskalai dal, pulses diabetes
**QUERY_TRIGGERS:** what can I eat, what grain, what rice, what dal, safe foods diabetes, recommended foods

Safe grains and pulses for diabetes patients (low GI, complex carbohydrates):
- Brown rice, red rice, parboiled rice (সিদ্ধ চাল / siddha chal): low glycaemic index; reduces post-meal glucose spike compared to polished white rice.
- Whole wheat flour (আটা / ata), whole grain cereals: complex carbohydrates plus fibre; slow glucose release into blood.
- Mosur dal (red lentil), mung dal (green lentil), maskalai dal (black gram), chola (chickpeas): high protein plus soluble fibre; low GI pulses that help control blood sugar.

---

## CHUNK: DM_ALLOW_002
**CONDITION:** diabetes, diabetic
**CATEGORY:** allowed_foods
**KEYWORDS:** vegetables for diabetes, diabetic vegetables, non-starchy vegetables, spinach palong shak, korola bitter gourd, dheros okra, tomato, cabbage, cauliflower, broccoli, cucumber, beet, turnip
**QUERY_TRIGGERS:** which vegetables, vegetable for diabetes, safe vegetables diabetic

Safe vegetables for diabetes (non-starchy, very low GI):
- Spinach (পালং শাক / palong shak), lettuce, cabbage, broccoli, cauliflower, tomato, cucumber, beet (beetroot), turnip, okra (ঢেঁড়স / dheros).
- Bitter gourd (করলা / korola): especially recommended — contains natural insulin-like compounds; use regularly in curry.
- All these vegetables have very low glycaemic index and can be eaten freely in normal portions.

---

## CHUNK: DM_ALLOW_003
**CONDITION:** diabetes, diabetic
**CATEGORY:** allowed_foods
**KEYWORDS:** dairy for diabetes, milk diabetes, yogurt doi diabetes, skimmed milk, oil for diabetes, mustard oil, olive oil, fruits for diabetes, guava, amloki, green papaya, nuts seeds diabetes, chromium magnesium zinc insulin
**QUERY_TRIGGERS:** dairy diabetic, milk diabetes, oil diabetic, fruit diabetic, nuts diabetic

Additional safe foods for diabetes patients:
- Dairy: skimmed milk, low-fat yogurt (দই / doi) — provide calcium and Vitamin D without excess fat.
- Cooking oils: mustard oil (minimum quantity), olive oil — monounsaturated fat; heart-safe for diabetics.
- Fruits: Vitamin C-rich options like guava, amloki (Indian gooseberry), and green papaya — moderate GI with antioxidant support.
- Nuts and seeds (small portions): provide magnesium and zinc which support insulin sensitivity.
- Whole grains and broccoli: rich in chromium which reduces insulin requirement in Type 2 Diabetes.
- Preferred cooking methods: boiling, steaming, broiling, baking, grilling — all low-fat methods.

---

## CHUNK: DM_AVOID_001
**CONDITION:** diabetes, diabetic, sugar patient
**CATEGORY:** avoided_foods
**KEYWORDS:** avoid diabetes, sugar diabetes, gur jaggery honey avoid, refined carbs avoid, white bread maida, potato sweet potato sago, jams condensed milk chocolates, sugary drinks cola juice, high GI foods, avoid high GI
**QUERY_TRIGGERS:** what not to eat diabetes, avoid foods diabetic, foods that raise sugar, bad for diabetes

Foods to avoid or strictly limit with diabetes:
- All forms of concentrated sugar: table sugar, jaggery (গুড় / gur), honey, molasses, glucose — directly spike blood glucose.
- Sugary drinks: cola, fruit juices, energy drinks, sweetened tea — cause rapid glucose absorption.
- Refined grain products: white bread, maida (refined flour) products, noodles, pasta, refined biscuits — high GI; cause hyperglycaemia.
- Starchy vegetables in excess: potato (large amounts), sweet potato, sago, arrowroot — high starchy carbohydrate load; raise blood sugar.
- High-sugar foods: jams, jellies, condensed milk, chocolates, candies, ice cream — high in free sugars.
- High-fat dairy: whole milk, full-fat cheese, butter — saturated fat increases cardiovascular risk in diabetics.
- Visible fat on meat, chicken skin — remove before cooking.
- Deep-fried foods: fast food, pakora (পাকোড়া), singara (সিঙ্গারা) — harmful combination of high fat and refined carbohydrate.

---

## CHUNK: DM_TIPS_001
**CONDITION:** diabetes, diabetic
**CATEGORY:** cooking_tips
**KEYWORDS:** cooking tips diabetes, how to cook rice diabetic, dal cooking diabetes, meal tips diabetic, cook for diabetic patient
**QUERY_TRIGGERS:** how to cook for diabetes, cooking tips diabetic, how to prepare food diabetes

Practical cooking tips for diabetes patients:
1. Cook rice with less water and serve slightly firm (not mushy) — this lowers the glycaemic index of the rice.
2. Add a tablespoon of dal or vegetables to rice while cooking to dilute carbohydrate density per serving.
3. Soak and sprout pulses (dal, chola) before cooking — increases nutrient availability and lowers GI.
4. Use bitter gourd (করলা / korola) regularly in cooking — contains natural insulin-like compounds.
5. Never skip meals — both high and low blood sugar are dangerous for diabetics.

---

## CHUNK: DM_QA_001
**CONDITION:** diabetes, diabetic, blood sugar, sugar patient
**CATEGORY:** qa_pair
**KEYWORDS:** tea diabetes, sugar free tea, how to make tea diabetes, low sugar tea, cinnamon tea darchini, cha diabetic, chai diabetes
**QUERY_TRIGGERS:** make tea, tea recipe, how to make tea, how do I drink tea, tea for diabetic, sugar-free tea, cinnamon tea

Q: How can a diabetes patient make tea safely?
A: Here is a diabetes-safe tea recipe using common Bangladeshi ingredients:
- Use 1 cup water and 1 cup skimmed milk (স্কিমড দুধ).
- Add half a teaspoon of loose black tea leaves.
- Add 1 small cinnamon stick (দারচিনি / darchini) and boil for 2 minutes.
- Optional: add 2–3 cardamom pods (এলাচ / elach) for flavour.
- DO NOT add sugar, gur (jaggery), or honey — all directly raise blood glucose.
WHY THIS WORKS: Cinnamon contains natural compounds that support insulin sensitivity and provide gentle sweetness without raising blood sugar. Skimmed milk adds calcium and protein without saturated fat. If you miss sweetness, a very small amount of stevia (natural plant sweetener) is acceptable — ask your doctor first.

---

## CHUNK: DM_QA_002
**CONDITION:** diabetes, diabetic
**CATEGORY:** qa_pair
**KEYWORDS:** breakfast diabetes, morning meal diabetic, what to eat morning, khichuri diabetic, ruti breakfast diabetes, oats diabetic
**QUERY_TRIGGERS:** breakfast diabetic, morning meal diabetes, what to eat in the morning diabetes

Q: What is a good breakfast for a diabetes patient in Bangladesh?
A: Recommended diabetes-friendly breakfasts:
Option 1 — Whole wheat ruti (2 pieces) with one boiled egg and a small bowl of mung dal. Add a side of sautéed bitter gourd (korola).
Option 2 — Oats porridge made with skimmed milk and topped with a small handful of nuts. No added sugar — use a pinch of cinnamon for flavour.
Option 3 — Brown rice khichuri (small portion) with a boiled egg and steamed vegetables.
AVOID: White bread, paratha fried in oil, sweet biscuits, sugary tea, fruit juice, processed cereals.
Eat breakfast within 1 hour of waking. Breakfast gap greater than 3.5 hours from last meal is dangerous for diabetics.

---

## CHUNK: HTN_PARAMS_001
**CONDITION:** hypertension, high blood pressure, BP, rakter chap
**CATEGORY:** nutritional_parameters
**KEYWORDS:** hypertension parameters, sodium limit hypertension, DASH diet, blood pressure diet, salt intake hypertension, potassium hypertension, calcium BP, fibre hypertension
**QUERY_TRIGGERS:** daily nutrition targets hypertension, how much salt, intake targets BP, diet parameters high blood pressure

Key daily nutritional targets for hypertension patients in Bangladesh (DASH Diet):
- Carbohydrates: 50–55% of calories; Protein: 20–25%; Fat: less than 25% of total calories.
- Sodium: less than 1.5 g/day total (less than 3/4 teaspoon of total salt per day from all sources combined).
- Potassium: increase intake through fruits and vegetables — but use caution if also managing Chronic Kidney Disease (CKD).
- Calcium: 1000–2000 mg/day through low-fat dairy or leafy green vegetables.
- Magnesium: from nuts, legumes, and green vegetables.
- Fibre: 30 g/day.
- Cholesterol: less than 150 mg/day.

---

## CHUNK: HTN_ALLOW_001
**CONDITION:** hypertension, high blood pressure
**CATEGORY:** allowed_foods
**KEYWORDS:** allowed foods hypertension, fruits blood pressure, banana orange papaya watermelon BP, vegetables hypertension, spinach lau tomato pumpkin, dairy hypertension, skimmed milk yogurt, fish hypertension, hilsha omega-3, garlic ginger lemon BP, DASH foods bangladesh
**QUERY_TRIGGERS:** what to eat high blood pressure, food allowed hypertension, safe food BP, fruits for BP, vegetables hypertension

Safe and recommended foods for hypertension patients:
- Fresh fruits high in potassium: banana (কলা), orange (কমলা), papaya (পেঁপে), guava (পেয়ারা), watermelon (তরমুজ) — potassium naturally reduces blood pressure.
- Fresh vegetables: spinach (পালং শাক / palong shak), bottle gourd (লাউ / lau), tomato, pumpkin (মিষ্টিকুমড়া / mistikumra) — potassium and magnesium; fully DASH diet compliant.
- Dairy: low-fat milk, skimmed milk, low-fat yogurt (দই / doi) — calcium lowers vascular resistance.
- Pulses daily: mosur dal, mung dal, chola, motor (field peas) — high fibre, potassium, and low fat.
- Nuts and legumes in small amounts: provide magnesium and healthy fats.
- Oily fish: hilsha (ইলিশ), rui (রুই), katla — 2 to 3 times per week; omega-3 reduces inflammation and blood pressure.
- Cooking oils: mustard oil or olive oil, less than 15 ml per day — mono and polyunsaturated fats; heart-safe.
- Flavouring without salt: garlic (রসুন), ginger (আদা), coriander, cumin — garlic specifically lowers blood pressure.
- Lemon juice: excellent natural salt substitute; also provides Vitamin C.

---

## CHUNK: HTN_AVOID_001
**CONDITION:** hypertension, high blood pressure
**CATEGORY:** avoided_foods
**KEYWORDS:** avoid hypertension, salt avoid, shutki dried fish high sodium, pickles achar, processed foods chanachur, soy sauce, butter dalda, fatty red meat, soft drinks sodium, sodium avoid BP
**QUERY_TRIGGERS:** what not to eat high blood pressure, avoid foods hypertension, bad food BP, high sodium foods

Foods to strictly avoid or limit with hypertension:
- Table salt: both in cooking and at the table — directly raises blood pressure; total limit is 3/4 teaspoon per day from all food sources combined.
- Dried and smoked fish (শুটকি / shutki), pickles (আচার / achar) — extremely high sodium content; should be avoided entirely.
- Processed and packaged foods: chips, chanachur (চানাচুর), salami, sausages — contain hidden high sodium.
- Sauces and condiments: soy sauce, fish sauce, ready-made spice mixes — very high sodium per serving.
- High-saturated-fat foods: butter, dalda / vanaspati (ডালডা), full-fat cream — indirectly raise blood pressure through LDL elevation.
- Fatty red meat: beef in excess (গরুর মাংস / gorur mangsho) — promotes atherosclerosis.
- Carbonated soft drinks and canned juices — contain both sodium and high sugar.
- Alcohol and tobacco in all forms — directly elevate blood pressure.

---

## CHUNK: HTN_TIPS_001
**CONDITION:** hypertension, high blood pressure
**CATEGORY:** cooking_tips
**KEYWORDS:** cooking tips hypertension, no salt cooking, season without salt, how to cook low sodium, herbs garlic ginger instead of salt, reheating hypertension
**QUERY_TRIGGERS:** how to cook without salt, low salt cooking, flavour without salt, cooking tips high blood pressure

Practical cooking tips for hypertension patients:
1. Cook without adding salt during cooking — only add the minimum amount at the very end for taste.
2. Replace salt with natural flavourings: fresh herbs, lemon juice, garlic, ginger, and vinegar.
3. Rinse canned or jarred foods thoroughly under water to reduce sodium content before cooking.
4. Preferred cooking methods: steaming, boiling, baking — all naturally low-sodium.
5. Make fresh dal and vegetable dishes daily — avoid reheating salty preparations as sodium concentrates.
6. When eating out: specifically request no added salt and avoid all pickles and sauces.

---

## CHUNK: HTN_QA_001
**CONDITION:** hypertension, high blood pressure
**CATEGORY:** qa_pair
**KEYWORDS:** salt-free cooking, how to make curry without salt, low salt curry recipe, dal without salt, no salt recipe bangladeshi
**QUERY_TRIGGERS:** how to cook curry without salt, salt free recipe, low sodium bangladeshi recipe, dal without salt

Q: How can I cook a tasty dal without adding too much salt for high blood pressure?
A: Here is a low-sodium, flavour-rich dal for hypertension patients:
- Use 1/2 cup mosur dal (red lentil) or mung dal — boil in 2 cups water with turmeric.
- Temper (baghaar) with 1 teaspoon mustard oil, 1/2 teaspoon cumin seeds, 3–4 crushed garlic cloves, and 1 small sliced onion.
- Add tomato and cook until soft.
- Add a squeeze of fresh lemon juice at the end.
- Add only a tiny pinch of salt (if any) at the very end.
- Garlic provides natural blood-pressure-lowering effect. Lemon replaces the taste of salt.
AVOID: packaged spice mixes (contain hidden sodium), dried fish (shutki), any bottled sauces.

---

## CHUNK: CHD_PARAMS_001
**CONDITION:** coronary heart disease, heart disease, CHD, heart attack, cardiac, cholesterol
**CATEGORY:** nutritional_parameters
**KEYWORDS:** heart disease diet parameters, cholesterol diet, omega-3 heart, fibre heart disease, saturated fat limit, trans fat limit, LDL diet
**QUERY_TRIGGERS:** diet for heart disease, what to eat for heart, nutrition targets heart patient, cholesterol diet parameters

Key daily nutritional targets for Coronary Heart Disease (CHD) patients:
- Carbohydrates: 50–55% of total calories from complex carbohydrates and whole grains.
- Protein: 15–20% of total calories; combine plant and animal protein sources.
- Total fat: 20–25% of calories. Saturated fat: less than 7%. Trans fat: less than 1%.
- Polyunsaturated fat: 6–10% (omega-3 from fish; omega-6 from vegetable oils).
- Monounsaturated fat: up to 20% of total calories (olive oil, mustard oil).
- Soluble fibre: 10–25 g/day — reduces LDL cholesterol by approximately 5%.
- Dietary cholesterol: less than 200 mg/day.
- Sodium: less than 1.5 g/day.

---

## CHUNK: CHD_ALLOW_001
**CONDITION:** coronary heart disease, heart disease, heart attack, CHD, cholesterol
**CATEGORY:** allowed_foods
**KEYWORDS:** heart healthy foods, hilsha fish omega-3, oats barley heart, mustard oil olive oil, dal legumes heart, walnut almond heart, apple guava pear heart, leafy greens heart, egg white heart, lean chicken heart, flaxseed tisi
**QUERY_TRIGGERS:** what to eat heart disease, safe foods heart patient, heart healthy food bangladesh, omega-3 foods

Recommended foods for heart disease patients:
- Oily fish 2–3 times per week: hilsha / ilish (ইলিশ), rui (রুই), katla — omega-3 fatty acids (EPA and DHA) reduce triglycerides and heart attack risk.
- Whole grains: oats, barley, whole grain bread, brown rice — soluble beta-glucan fibre lowers LDL cholesterol.
- Cooking oils: mustard oil, extra virgin olive oil — monounsaturated fat; lowers serum cholesterol.
- Legumes: mosur dal, mung dal, chola, soybean — plant protein lowers LDL; high fibre.
- Nuts: walnuts, almonds (small handful per day) — omega-3 ALA and monounsaturated fats.
- Fruits: apple, pear, guava, orange, citrus — pectin (soluble fibre) plus antioxidants.
- Dark leafy greens: palong shak (spinach), lal shak (red amaranth), pui shak (Malabar spinach) — folate, Vitamin K, antioxidants; heart-protective.
- Lean protein: skimmed milk, egg whites (limit yolk to maximum 3 per week), skinless chicken breast (grilled or boiled).
- Flaxseed (তিসি / tisi), sunflower seeds — plant-based omega-3 and fibre.

---

## CHUNK: CHD_AVOID_001
**CONDITION:** coronary heart disease, heart disease, CHD
**CATEGORY:** avoided_foods
**KEYWORDS:** avoid heart disease, trans fat avoid, dalda vanaspati avoid, coconut oil heart, butter heart, organ meat heart, deep fried heart, processed meat sausage, sugary foods heart, saturated fat avoid
**QUERY_TRIGGERS:** what not to eat heart disease, bad foods heart, avoid heart disease food

Foods to strictly avoid or limit with heart disease:
- Dalda / vanaspati (ডালডা), partially hydrogenated oils — trans-fat; severely raises LDL and lowers HDL.
- Butter, full-fat cream, coconut oil, coconut milk (নারিকেল দুধ) — saturated fat; promotes arterial plaque build-up.
- Red meat (gorur mangsho) in excess — limit to maximum once per week.
- Organ meats in excess: liver, brain, kidney — very high cholesterol content.
- Deep-fried foods: pakora, puri, french fries, fried chicken — trans-fat plus saturated fat.
- Processed meats: sausages, salami, bacon — high saturated fat and sodium; directly promote heart disease.
- Baked goods made with dalda: pastries, biscuits, cakes — hidden trans-fats and saturated fats.
- Full-fat dairy in excess: whole milk, paneer, cream.
- High-sugar foods and beverages — raise triglycerides; contribute to obesity and heart disease.

---

## CHUNK: CHD_TIPS_001
**CONDITION:** coronary heart disease, heart disease
**CATEGORY:** cooking_tips
**KEYWORDS:** cooking tips heart disease, how to cook fish heart, grill hilsha, oats khichuri, dal garlic heart, small meals heart
**QUERY_TRIGGERS:** cooking tips heart disease, how to cook for heart patient, how to grill fish heart

Practical cooking tips for heart disease patients:
1. Grill or steam hilsha (ilish) fish instead of deep-frying — preserves omega-3 content which is destroyed by high heat.
2. Replace dalda entirely with mustard oil; use less than 15 ml per person per day.
3. Add oats to breakfast khichuri or porridge for soluble fibre that lowers LDL.
4. Cook dal with garlic and mustard seeds — garlic reduces cholesterol absorption.
5. Remove all visible fat from meat and all skin from chicken before cooking.
6. Eat smaller, more frequent meals — large meals increase cardiac workload.
7. Combine animal protein with plant protein at each meal for better cardiovascular outcomes.

---

## CHUNK: CKD_PARAMS_001
**CONDITION:** kidney disease, chronic kidney disease, CKD, renal disease, creatinine, kidneys, dialysis
**CATEGORY:** nutritional_parameters
**KEYWORDS:** CKD parameters, kidney disease diet, protein CKD, potassium CKD, phosphorus CKD, fluid CKD, dialysis diet, GFR diet, kidney disease nutrition targets
**QUERY_TRIGGERS:** diet for kidney disease, CKD nutrition, how much protein kidney, kidney diet parameters, fluid restriction kidney

Key daily nutritional targets for Chronic Kidney Disease (CKD) patients (varies by disease stage):
- Energy: 35–40 kcal/kg ideal body weight per day (30–35 kcal/kg for transplant patients).
- Protein — Stage 1–3: 0.75 g/kg/day; Stage 4–5: 0.6–1.0 g/kg/day. NOTE: Dialysis patients require MORE protein: 1.1–1.3 g/kg/day (opposite of pre-dialysis).
- At least 50% of protein must come from high biological value sources: egg, fish, chicken, milk.
- Fat: 20–30% of calories; LDL target less than 100 mg/dl; triglycerides target less than 150 mg/dl.
- Potassium: restrict to 3–4 g/day when serum potassium (K+) exceeds 5.0 mEq/dL.
- Phosphorus: restrict to 800–1000 mg/day from Stage 3 onwards.
- Sodium: 1–3 g/day in advanced stages (GFR less than 10% of normal).
- Calcium: less than 2.0 g total daily from all sources including supplements.
- Fluid: 500 ml plus previous day's urine output (for late CKD stages only — not early stages).

---

## CHUNK: CKD_ALLOW_001
**CONDITION:** kidney disease, CKD, renal disease
**CATEGORY:** allowed_foods
**KEYWORDS:** safe foods kidney disease, CKD allowed foods, white rice kidney, egg white kidney, low potassium vegetables, bottle gourd lau kidney, leaching technique, apple cranberry kidney, low phosphorus foods
**QUERY_TRIGGERS:** what can I eat kidney disease, CKD safe foods, vegetables for kidney patient, low potassium foods

Safe foods for CKD patients (after proper preparation):
- Grains: white rice (well-cooked), white bread, plain ruti — lower phosphorus than brown rice; manageable carbohydrate load.
- Protein: egg white (limited egg yolk) — high biological value protein with low phosphorus compared to whole egg; fresh fish in small controlled portions; skinless chicken breast.
- Safe vegetables (after LEACHING TECHNIQUE): bottle gourd (লাউ / lau), ridge gourd (ঝিঙা / jhinga), snake gourd (চিচিঙ্গা / chichinga), cabbage, green beans.
- Lower potassium fruits: apple, cranberry, grapes — safe in small amounts.
- Cooking oils: mustard oil or olive oil in moderation — healthy fat without kidney burden.
- Required supplements (consult physician): folic acid 1 mg/day, pyridoxine (B6) 5 mg, Vitamin C 60–100 mg — depleted by CKD.

---

## CHUNK: CKD_TIPS_001
**CONDITION:** kidney disease, CKD, renal disease
**CATEGORY:** cooking_tips
**KEYWORDS:** leaching technique CKD, how to remove potassium vegetables, boil vegetables kidney, cooking tips CKD, potassium removal vegetables, kidney cooking method, salt substitute CKD danger
**QUERY_TRIGGERS:** how to cook for kidney patient, remove potassium from vegetables, leaching vegetables, cooking tips CKD

Critical cooking tips for CKD patients:

LEACHING TECHNIQUE (MANDATORY for high-potassium vegetables):
1. Peel the vegetable and cut into small pieces.
2. Soak in warm water for at least 2 hours.
3. Discard the soaking water completely.
4. Boil in fresh water, then discard the boiling water.
5. Now add to curry — this removes 30–50% of potassium.
Always boil vegetables and discard cooking water before adding to curries.

Additional tips:
- Use white rice and white bread instead of brown or whole grain varieties (lower phosphorus).
- Cook in small, precisely measured portions to control protein and potassium intake.
- NEVER use salt substitutes that contain potassium chloride — they are dangerously high in potassium for CKD patients.
- Dialysis patients have OPPOSITE protein needs (higher) — consult nephrologist for specific amounts.

---

## CHUNK: CKD_AVOID_001
**CONDITION:** kidney disease, CKD, renal, dialysis
**CATEGORY:** avoided_foods
**KEYWORDS:** avoid kidney disease, high potassium foods kidney, spinach tomato potato kidney avoid, banana orange dried fruits kidney, dal kidney avoid, dairy phosphorus kidney, cola dark soda kidney, dried fish shutki kidney, excess protein kidney
**QUERY_TRIGGERS:** what not to eat kidney disease, foods bad for kidneys, avoid CKD, high potassium foods

Foods to avoid or strictly limit with CKD:
- High-potassium vegetables: spinach, tomato, potato in large amounts — worsens dangerous hyperkalaemia in late CKD.
- High-potassium fruits: bananas, oranges, dried fruits, avocado — very high potassium; avoid entirely in advanced CKD.
- Dal and lentils in large quantities: high in both phosphorus and potassium — limit severely; small amounts only after physician guidance.
- Dairy products in large amounts: milk, cheese, yogurt — high phosphorus; promotes dangerous vascular calcification in CKD.
- Nuts, seeds, and whole grains in excess — high phosphorus content.
- Processed foods, salty snacks, pickles — high sodium; worsens oedema and blood pressure.
- Cola drinks and dark sodas — extremely high in phosphoric acid; severely damaging to CKD kidneys.
- Dried fish (শুটকি / shutki) and preserved meats — extremely high sodium; dangerous in CKD.
- Excess protein: red meat, large fish portions — increases urea load; accelerates kidney function decline.

---

## CHUNK: STONES_PARAMS_001
**CONDITION:** kidney stones, renal stones, pather, oxalate stones, uric acid stones
**CATEGORY:** nutritional_parameters
**KEYWORDS:** kidney stones diet, oxalate limit, fluid intake stones, calcium stones, citrate stones, sodium stones, fibre kidney stones
**QUERY_TRIGGERS:** diet for kidney stones, how much water kidney stones, nutrition targets kidney stones

Key daily nutritional targets for Kidney Stone patients:
- Protein: 0.8–1.0 g/kg body weight per day; first-class protein (egg, fish, chicken) preferred.
- Fluid: critical — drink enough to achieve urine volume of 2000–2500 ml per day (approximately 10–12 glasses of water daily).
- Oxalate (for calcium-oxalate type stones): less than 40–50 mg/day.
- Sodium: less than 2000 mg/day (excess sodium increases urinary calcium and promotes stone growth).
- Calcium: 1000 mg/day (under 50 years); 1200 mg/day (over 50 years) — do NOT restrict dietary calcium; this worsens stones.
- Urinary citrate (target greater than 640 mg/day): lemonade therapy helps achieve this.
- Fibre: increase to 25 g/day from fruits, vegetables, and cereals.

---

## CHUNK: STONES_QA_001
**CONDITION:** kidney stones, renal stones
**CATEGORY:** qa_pair
**KEYWORDS:** lemon water stones, how to prevent kidney stones drink, citrate water sharbat stones, daily drink kidney stones, coconut water stones
**QUERY_TRIGGERS:** what to drink kidney stones, lemon water kidney stones, daily drink for stones, prevent kidney stones drink

Q: What should I drink daily to prevent kidney stones?
A: The most important intervention for kidney stones is high fluid intake. Follow this daily drink plan:
- Primary: 10–12 large glasses of plain water throughout the day (most critical).
- Lemon water therapy: squeeze 1 full lemon into 2 litres of water and drink throughout the day. Lemon citrate inhibits crystal formation and prevents stone growth.
- Fresh green coconut water (ডাবের পানি / dabar pani): natural electrolytes; moderate potassium; excellent for kidney stone patients.
- Avoid: strong tea (high oxalate — limit to 1 cup per day of weak brew), cola and dark sodas (phosphoric acid), alcohol, and sweetened juices.
- If you find plain water difficult, try warm lemon water with no sugar. Never add sugar or sweetener to your lemon water (sugar worsens urinary oxalate).

---

## CHUNK: STONES_AVOID_001
**CONDITION:** kidney stones, renal stones, oxalate stones
**CATEGORY:** avoided_foods
**KEYWORDS:** high oxalate foods avoid, spinach kidney stones, beet kidney stones, okra dheros stones, peanut almond stones, chocolate oxalate, black tea stones, wheat bran stones, excess animal protein stones, sodium stones
**QUERY_TRIGGERS:** what not to eat kidney stones, avoid oxalate foods, bad for kidney stones, high oxalate foods bangladesh

Foods to avoid or limit for kidney stone patients:
- Extremely high-oxalate foods (for calcium-oxalate stone type): spinach (পালং শাক / palong shak), beetroot, okra (ঢেঁড়স / dheros).
- Nuts: peanut (চিনাবাদাম / china badam), almonds in excess — high oxalate.
- Chocolate, cocoa powder, cocoa-based drinks — very high oxalate content.
- Black tea in excess: contains high oxalate — limit to 1 to 2 weak cups per day.
- Wheat bran and whole bran cereals in excess — high oxalate.
- Dried figs, plums, sweet potato (for oxalate stone patients) — high oxalate concentration.
- Excess sodium and processed salty foods — increases urinary calcium and promotes stone growth.
- Excess animal protein: red meat, organ meat, large fish portions — increases urinary uric acid and oxalate.

---

## CHUNK: LIVER_PARAMS_001
**CONDITION:** liver disease, fatty liver, hepatitis, cirrhosis, jaundice, NAFLD, liver problem
**CATEGORY:** nutritional_parameters
**KEYWORDS:** liver disease diet, fatty liver diet, hepatitis nutrition, cirrhosis diet, BCAA liver, protein liver, calorie liver disease, sodium cirrhosis, vitamins liver
**QUERY_TRIGGERS:** diet for liver disease, fatty liver diet, nutrition targets liver patient, hepatitis nutrition, cirrhosis diet

Key daily nutritional targets for liver disease patients (varies by condition):
- Fatty Liver (NAFLD): Reduce by 500–1000 kcal/day; Protein: 1.0–1.5 g/kg/day.
- Hepatitis: Calories 35–45 kcal/kg/day; Protein: 1.5–2 g/kg/day; Fat: 20–30 g/day.
- Cirrhosis (compensated): 1.2–1.3 g protein/kg/day; 25–35 kcal/kg/day.
- Cirrhosis (decompensated): 1.5–2 g protein/kg/day; 25–45 kcal/kg/day.
- Carbohydrates: 40–50% of energy; complex carbs preferred; simple sugars less than 10%.
- Fat: approximately 25–30% of total calories — monounsaturated and polyunsaturated fats preferred.
- Sodium: severely restricted in cirrhosis with oedema or ascites to 400–800 mg/day.
- Required vitamins: thiamine, folic acid (1 g/day), B6, B12, Vitamin K, carotenoids, Vitamin E, zinc.

---

## CHUNK: LIVER_ALLOW_001
**CONDITION:** liver disease, fatty liver, hepatitis, cirrhosis
**CATEGORY:** allowed_foods
**KEYWORDS:** liver safe foods, egg white liver, lean fish liver, chicken liver disease, whole grains liver, olive oil liver, omega-3 liver, BCAA liver, broccoli spinach liver, papaya mango carrot liver, guava amloki liver
**QUERY_TRIGGERS:** what to eat liver disease, safe foods liver, foods for fatty liver, hepatitis safe foods

Recommended foods for liver disease patients:
- Protein sources: egg white and low-fat fish (rui, tilapia, catla — boiled) — high biological value protein essential for liver cell regeneration. Egg white specifically is rich in branched-chain amino acids (BCAA: leucine, isoleucine, valine) which are metabolised by muscle rather than liver — safest protein in cirrhosis.
- Skinless chicken: boiled or steamed only — lean high-quality protein with low fat burden.
- Whole grains: brown rice, oats, whole wheat ruti — complex carbs; slow energy release; hepatic protection.
- Cooking oils: extra virgin olive oil, canola oil, sunflower oil — reduce hepatic inflammation.
- Oily fish (hilsha, sardines in moderate amounts), walnuts, flaxseed — omega-3 reduces liver inflammation in fatty liver disease (NAFLD).
- Nuts: almonds, cashews in moderate amounts — Vitamin E antioxidant for liver.
- Dark leafy vegetables: broccoli, spinach (cooked), cabbage — Vitamin K prevents liver bleeding; folate; antioxidants.
- Carotenoid-rich foods: ripe papaya, ripe mango, carrot — antioxidant enzymes support liver function.
- Low-fructose fruits: guava, amloki, small portions of papaya — safer than high-fructose fruits which worsen fatty liver.
- Garlic and turmeric: add liberally to all cooking — both have documented hepatoprotective (liver-protecting) properties.

---

## CHUNK: LIVER_AVOID_001
**CONDITION:** liver disease, fatty liver, hepatitis, cirrhosis
**CATEGORY:** avoided_foods
**KEYWORDS:** avoid liver disease, alcohol liver avoid, fructose liver, sugary drinks fatty liver, butter ghee liver avoid, fried foods liver, processed foods liver, red meat organ meat liver, reheated oil liver toxic
**QUERY_TRIGGERS:** what not to eat liver disease, bad foods liver, avoid fatty liver, hepatitis avoid foods

Foods to strictly avoid with liver disease:
- Alcohol: completely and permanently — directly toxic to liver cells (hepatocytes); the primary cause of fatty liver, hepatitis, and cirrhosis.
- High-fructose drinks: sweetened soft drinks, commercial fruit juices, sports drinks — fructose directly drives hepatic fat accumulation.
- Saturated fats: butter, ghee (গরুর ঘি), coconut oil, full-fat dairy — cause hepatic fat accumulation in NAFLD.
- Deep-fried foods and fast foods — trans-fat plus saturated fat combination worsens liver function.
- Strong tea, coffee, cold drinks — irritate already-inflamed liver (especially during hepatitis).
- Sodium-heavy foods: pickles, processed foods, salty snacks — worsen oedema and ascites in cirrhosis.
- Red meat and organ meats (liver, brain) in excess — high saturated fat plus excess ammonia load in cirrhosis.
- Reheated oil or high-heat re-fried oil — generates trans-fats that directly harm the liver.
- Herbal tonics and sedative medications without medical advice — many commonly used herbs are hepatotoxic.

---

## CHUNK: OBESITY_PARAMS_001
**CONDITION:** obesity, overweight, weight loss, weight management, mota, ওজন কমানো
**CATEGORY:** nutritional_parameters
**KEYWORDS:** obesity diet, weight loss parameters, calorie deficit, free sugars limit, cooking oil limit obesity, meal frequency weight loss, fibre satiety obesity
**QUERY_TRIGGERS:** diet for weight loss, nutrition targets obesity, how to lose weight diet, calorie targets weight loss

Key daily nutritional targets for obesity and weight management:
- Target rate: reduce 0.5 kg per week by reducing caloric intake by 500–750 kcal/day from usual intake.
- Total fat: less than 30% of daily calories; equal balance of saturated, monounsaturated, polyunsaturated fats.
- Free sugars: less than 10% of energy; less than 5% for additional benefit.
- Sodium: less than 2000 mg/day.
- Fibre: increases satiety, reduces glucose spikes and cholesterol.
- Meal frequency: 5–6 small meals every 3–4 hours; NEVER skip meals.
- Cooking oil maximum: 15 ml per person per day total.

---

## CHUNK: OBESITY_TIPS_001
**CONDITION:** obesity, overweight, weight loss
**CATEGORY:** cooking_tips
**KEYWORDS:** cooking tips weight loss, small plate obesity, plate method Bangladesh, non-stick pan oil free, eat slow weight loss, vegetable soup before meal, no screen eating, avoid eating before sleep weight loss
**QUERY_TRIGGERS:** cooking tips weight loss, how to eat less, portion control tips, cooking without oil weight loss

Practical cooking and eating tips for weight management:
1. Use smaller plates and bowls — psychological portion control reduces intake without hunger.
2. Plate method: fill half the plate with vegetables, one quarter with lean protein (fish, chicken, dal), one quarter with carbohydrates (rice or ruti).
3. Cook without oil using a non-stick pan; if oil is needed, use a spray bottle or measure less than 1 teaspoon.
4. Eat slowly and chew each mouthful thoroughly — satiety signals take 20 minutes to register; rushing leads to overeating.
5. Start each meal with a bowl of plain vegetable soup or salad to fill stomach before the main course.
6. Do not eat while watching television or mobile phone — unconscious overeating increases by approximately 25%.
7. Avoid eating within 2 hours of sleeping to prevent calorie storage as body fat.

---

## CHUNK: THYROID_PARAMS_001
**CONDITION:** hypothyroidism, thyroid, thyroid problem, low thyroid, থাইরয়েড
**CATEGORY:** nutritional_parameters
**KEYWORDS:** hypothyroidism diet, iodine thyroid, selenium thyroid, zinc thyroid, goitrogen hypothyroidism, fibre thyroid, gluten thyroid, Hashimoto's diet
**QUERY_TRIGGERS:** diet for hypothyroidism, thyroid diet, iodine food thyroid, selenium foods thyroid

Key nutritional targets for hypothyroidism patients:
- Iodine: always use iodised salt exclusively; recommended 150 mcg/day (adult) — deficiency causes goitre and worsens hypothyroidism.
- Selenium: include selenium-rich foods to support T4 to T3 hormone conversion.
- Zinc: include zinc-rich foods to support thyroid hormone production.
- Fibre: 30–40 g/day recommended — constipation is common in hypothyroidism; high fibre prevents it.
- Limit free sugars and excess refined cereals.
- Limit goitrogenic foods — cooking reduces goitrogenic effect significantly.
- Limit gluten-containing grains if autoimmune thyroid disease (Hashimoto's thyroiditis) is present.

---

## CHUNK: THYROID_ALLOW_001
**CONDITION:** hypothyroidism, thyroid problem
**CATEGORY:** allowed_foods
**KEYWORDS:** iodine foods bangladesh, saltwater fish iodine, marine fish iodine, hilsha iodine, eggs thyroid, selenium foods, pumpkin seeds zinc, yogurt thyroid, legumes zinc thyroid, cooked vegetables thyroid, oily fish thyroid inflammation
**QUERY_TRIGGERS:** what to eat hypothyroidism, iodine-rich foods, selenium-rich foods thyroid, safe foods thyroid

Recommended foods for hypothyroidism patients:
- Iodine sources: iodised salt (must use exclusively — do not substitute rock salt or sea salt); saltwater fish (hilsha, marine fish, shrimp/chingri) — natural iodine sources.
- Selenium sources (support T4-to-T3 conversion): eggs (whole egg), beef in small amounts, chicken, tuna, shrimp, oatmeal, whole wheat bread, garlic, onion.
- Zinc sources (thyroid hormone production): pumpkin seeds (মিষ্টিকুমড়ার বিচি / mistikumrar bichi), yogurt (দই / doi), masoor dal, mung dal, legumes.
- Antioxidant foods: apple, grapefruit, papaya — combat free radical damage from thyroid dysfunction.
- Cooked colourful seasonal vegetables and dark leafy greens — goitrogenic effect is significantly reduced by cooking.
- Healthy fats: oily fish, flaxseeds, extra virgin olive oil — reduce thyroid-related inflammation.

---

## CHUNK: THYROID_AVOID_001
**CONDITION:** hypothyroidism, thyroid
**CATEGORY:** avoided_foods
**KEYWORDS:** goitrogen avoid, raw cabbage thyroid, raw broccoli thyroid, raw cauliflower thyroid, soy thyroid avoid, raw spinach thyroid, walnuts peanuts thyroid, gluten thyroid Hashimoto, coffee levothyroxine avoid
**QUERY_TRIGGERS:** what not to eat thyroid, avoid foods hypothyroidism, goitrogenic foods avoid, soy thyroid

Foods to limit or avoid with hypothyroidism:
- Soy milk, soy sauce, and soy-based products — isoflavones interfere with thyroid hormone synthesis; limit or avoid.
- Raw cruciferous vegetables: raw cabbage, raw broccoli, raw cauliflower, raw turnips — goitrogens block iodine uptake when raw; always cook these thoroughly to significantly reduce goitrogenic effect.
- Raw spinach in excess — goitrogenic when raw; safe in cooked form.
- Walnuts, peanuts, almonds, cashews, flaxseeds in large amounts — goitrogenic compounds interfere with thyroid.
- Gluten-containing grains: wheat, semolina (sooji), rye, barley, bread, pasta — limit if autoimmune thyroid disease (Hashimoto's thyroiditis) is diagnosed.
- Coffee, excess tea, alcohol — may irritate thyroid; coffee specifically inhibits levothyroxine absorption.
- Packaged snacks and processed foods — promote weight gain which is worsened by hypothyroidism.

---

## CHUNK: THYROID_TIPS_001
**CONDITION:** hypothyroidism, thyroid
**CATEGORY:** cooking_tips
**KEYWORDS:** thyroid medication timing, levothyroxine food timing, cook vegetables thyroid, iodised salt cooking, selenium meal thyroid, constipation thyroid fibre
**QUERY_TRIGGERS:** cooking tips thyroid, when to eat medication thyroid, how to cook vegetables thyroid, iodised salt thyroid

Critical cooking and medication tips for hypothyroidism:
1. Always cook cruciferous vegetables (cabbage, broccoli, cauliflower) thoroughly — boiling reduces goitrogenic compounds by 30–50%.
2. Take thyroid medication (levothyroxine) on empty stomach, 30–60 minutes before eating anything.
3. Avoid soy products for at least 4 hours after taking thyroid medication.
4. Use only iodised salt in all cooking — never substitute rock salt (shil lobon) or sea salt — they do not contain iodine.
5. Include selenium-rich foods (eggs, marine fish) at every meal for T3 hormone activation support.
6. If experiencing constipation (very common in hypothyroidism): increase fibre from whole grains, vegetables, fruits, and increase water intake.

---

## CHUNK: TB_PARAMS_001
**CONDITION:** tuberculosis, TB, যক্ষ্মা, TB patient
**CATEGORY:** nutritional_parameters
**KEYWORDS:** tuberculosis diet, TB nutrition, protein TB, calorie TB, immune diet TB, recovery diet TB, vitamins TB, iron folate TB, zinc selenium TB
**QUERY_TRIGGERS:** diet for TB, nutrition tuberculosis patient, what to eat TB, TB recovery diet

Key daily nutritional targets for Tuberculosis (TB) patients:
- Energy: 200–300 kcal per day above normal needs; approximately 35–40 kcal/kg ideal body weight.
- Carbohydrates: 55–75% of total energy from complex carbs and low-GI foods.
- Protein: 1.2–1.5 g/kg/day (75–100 g/day total); for underweight patients: 1.7 g/kg/day.
- Fat: 20–30% of calories from mostly polyunsaturated and monounsaturated fats.
- Critical micronutrients (TB drugs deplete these): iron, folate, Vitamins A, C, E, D, B-complex.
- Immune-supporting minerals: selenium, zinc, copper, potassium, manganese.
- Fluid: 10–12 glasses per day — keeps respiratory secretions thin and prevents dehydration from fever.
- Meal frequency: 5–6 smaller meals per day; every 2 hours during acute fever stage.

---

## CHUNK: TB_ALLOW_001
**CONDITION:** tuberculosis, TB
**CATEGORY:** allowed_foods
**KEYWORDS:** TB safe foods, protein foods TB, eggs chicken fish TB, milk TB, dal sprouted TB, sajna pata TB, Vitamin C TB, orange guava amloki TB, beta carotene papaya mango carrot TB, nuts TB
**QUERY_TRIGGERS:** what to eat TB, safe foods tuberculosis, high protein foods TB, immune foods TB, recovery foods TB

Recommended foods for TB patients:
- Complete protein daily: eggs (daily), chicken, lean meat, fish — essential for rebuilding wasted muscle and supporting immune function.
- Milk or yogurt: 500–750 ml per day — calcium and protein; bone health protection during TB treatment.
- Pulses: mung dal, mosur dal, chola, motor — sprouted overnight before cooking to increase Vitamin C content and iron bioavailability.
- Dark green vegetables: drumstick leaves (সজনে পাতা / sajna pata), spinach, green beans — excellent source of iron, Vitamin A, folate, and antioxidants. Sajna pata cooked in dal is especially nutritious for TB patients.
- Vitamin C-rich foods: orange, guava, amloki, lemon, pineapple, pomegranate — enhance iron absorption from plant foods; powerful immune boosters.
- Yellow and orange foods: papaya, pumpkin, carrot, ripe mango — beta-carotene (Vitamin A) strengthens respiratory mucosa weakened by TB.
- Nuts: cashew, walnut, peanut — healthy fats; zinc and selenium for immune modulation.
- Whole grains: oats, brown rice, whole wheat ruti — sustained energy and B vitamins for immune function.
- Potassium-rich foods: banana, potato, pumpkin, bottle gourd, tomato — replace losses; energy sources.

---

## CHUNK: TB_TIPS_001
**CONDITION:** tuberculosis, TB
**CATEGORY:** cooking_tips
**KEYWORDS:** cooking tips TB, feed TB patient, liquid food TB fever, milk powder rice TB, sprout dal TB, lemon iron TB, egg TB recovery, small meals TB appetite
**QUERY_TRIGGERS:** how to cook for TB patient, TB recovery food, appetite TB cooking, fever food TB

Practical cooking tips for TB patients:
1. During fever and acute stage: serve liquid and semi-solid foods every 2 hours around the clock — high appetite suppression is normal during fever.
2. Serve 5–6 small visually appealing meals — poor appetite is very common in TB; small frequent servings are better tolerated.
3. Boost protein without adding volume: add milk powder or mashed dal to rice porridge (jau/khichuri).
4. Sprout mung dal and chola overnight before cooking — increases Vitamin C and enhances iron uptake significantly.
5. Cook sajna pata (drumstick leaves) with dal for a superb combination of iron plus Vitamin A.
6. Use eggs in all forms: soft-boiled, poached, scrambled — eggs are the most complete recovery food for TB patients.
7. Add a squeeze of lemon juice to all iron-rich meals (dal, shak, green vegetables) — doubles iron absorption from plant sources.

---

## CHUNK: DIARR_PARAMS_001
**CONDITION:** diarrhoea, diarrhea, loose motion, পাতলা পায়খানা, stomach upset, gastroenteritis
**CATEGORY:** nutritional_parameters
**KEYWORDS:** diarrhoea diet, ORS diarrhoea, rehydration, electrolytes diarrhoea, zinc supplement diarrhoea, lactose restrict, fibre diarrhoea, breastfeeding diarrhoea
**QUERY_TRIGGERS:** diet for diarrhoea, what to eat diarrhoea, nutrition loose motion, rehydration, ORS

Key priorities for managing diarrhoea through nutrition:
- Priority 1: Replace fluids and electrolytes using ORS (Oral Rehydration Salt) — WHO standard formula.
- Zinc supplement: 20 mg/day (children over 6 months) for 10–14 days; 10 mg/day (infants under 6 months) — reduces severity and duration.
- Normal dietary fibre helps restore mucosal function and firm stools after acute phase.
- Restrict lactose: limit cow milk in adults during acute diarrhoea — lactose intolerance worsens osmotic diarrhoea.
- Avoid fructose, sucrose, and alcohol — all worsen osmotic diarrhoea.
- Avoid gluten-containing foods if coeliac disease is suspected.
- For infants: continue breastfeeding on demand throughout — breast milk is superior to any formula or other food during diarrhoea.

---

## CHUNK: DIARR_QA_001
**CONDITION:** diarrhoea, diarrhea, loose motion
**CATEGORY:** qa_pair
**KEYWORDS:** rice ORS recipe, home ORS make, saline home, homemade rehydration, rice kanji ORS, diarrhoea drink home remedy bangladesh
**QUERY_TRIGGERS:** how to make ORS at home, rice saline, home remedy diarrhoea, kanji diarrhoea

Q: How do I make rice-based ORS at home during diarrhoea?
A: Home rice-ORS recipe (use when commercial ORS is unavailable):
1. Soak a fistful of clean raw rice in water for 10–15 minutes.
2. Grind or blend to a paste.
3. Add 500 ml of boiled cooled water and a small pinch of salt.
4. Cook while stirring until the first bubble appears.
5. Cool and use within 6 hours maximum — discard after 6 hours.
This replaces sodium, potassium, and glucose lost in stool. Also useful: green coconut water (ডাবের পানি / dabar pani) as a natural electrolyte drink.
IMPORTANT: If diarrhoea is severe, bloody, or lasts more than 2 days, see a doctor immediately.

---

## CHUNK: DIARR_TIPS_001
**CONDITION:** diarrhoea, diarrhea, loose motion
**CATEGORY:** cooking_tips
**KEYWORDS:** cooking tips diarrhoea, BRAT diet, bland foods diarrhoea, boil banana diarrhoea, plain rice diarrhoea, gradual reintroduce food diarrhoea, handwashing diarrhoea, do not starve diarrhoea
**QUERY_TRIGGERS:** cooking tips diarrhoea, what to feed diarrhoea patient, bland food recipe diarrhoea, banana rice diarrhoea

Practical cooking tips during diarrhoea:
1. Serve all foods very plain and well-cooked during acute phase — no spices, minimal oil, no chilli.
2. BRAT diet during recovery: Banana (boil green banana until soft, mash with pinch of salt), Rice (plain boiled white rice), Applesauce, Toast (white plain bread).
3. Boil green bananas until very soft then mash — resistant starch and pectin in green banana firm loose stools.
4. Gradually reintroduce regular foods over 3–5 days as stools normalise — do not rush.
5. Strictly maintain handwashing with soap before all food preparation and serving.
6. Do NOT restrict food intake entirely — the old belief of "starving" diarrhoea has been proven to worsen and prolong recovery.
7. Yogurt with live cultures (Lactobacillus-rich plain yogurt / টক দই) is better tolerated than milk during diarrhoea and helps restore gut bacteria.

---

## CHUNK: CANCER_PARAMS_001
**CONDITION:** cancer, cancer support, cancer patient, tumour, chemotherapy, radiation, oncology
**CATEGORY:** nutritional_parameters
**KEYWORDS:** cancer diet, cancer nutrition, protein cancer, fibre cancer, antioxidant cancer, calorie cancer patient, nausea cancer cooking, vitamins cancer, Vitamin A C E cancer
**QUERY_TRIGGERS:** diet for cancer patient, nutrition cancer, what to eat cancer, cancer recovery diet, chemo diet

Key daily nutritional targets for cancer support:
- Calories: 30–35 kcal/kg ideal body weight (cancer causes hypermetabolic state — higher than normal caloric need).
- Protein: 1.2–1.5 g/kg/day to maintain lean body mass; plant protein is encouraged.
- Fat: 20–30% of total calories.
- Fibre: at least 4 g per meal; high-fibre diet is especially protective against colon cancer.
- Antioxidant vitamins: Beta-carotene (Vitamin A), Vitamin C, Vitamin E — the antioxidant triad.
- Fluid: 2–3 litres per day; extra if vomiting or experiencing diarrhoea from treatment.
- Meal frequency: 6 small meals per day; small portions are easier to manage during nausea.
- Weight monitoring: check weekly — early weight loss triggers urgent nutritional intervention.

---

## CHUNK: CANCER_ALLOW_001
**CONDITION:** cancer, cancer patient, chemotherapy, oncology
**CATEGORY:** allowed_foods
**KEYWORDS:** cancer safe foods, antioxidant foods cancer, data shak cancer, kochu shak, pui shak, lau shak, papaya guava mango antioxidant, whole grains cancer, fish cancer, rice water sago cancer nausea, yogurt cancer, turmeric curcumin cancer, easy foods cancer
**QUERY_TRIGGERS:** what to eat cancer, antioxidant foods, easy foods nausea cancer, cancer recovery foods bangladesh

Recommended foods for cancer patients:
- High antioxidant greens: amaranth leaves (ডাটা শাক / data shak), colocasia leaves (কচু শাক / kochu shak), spinach (পালং শাক / palong shak), Indian spinach (পুঁই শাক / pui shak), bottle gourd leaves (লাউ শাক / lau shak) — rich in beta-carotene, Vitamin C, and Vitamin E.
- Antioxidant fruits: ripe mango, papaya, guava, amloki, grapefruit (জামবুরা / jambura), hogplum (আমড়া / amra) — Vitamin C and beta-carotene; anti-cancer antioxidants.
- Whole grains, nuts, seeds, legumes — fibre plus Vitamin E; protective against colorectal cancer.
- Gentle proteins: fish (preferred over red meat during treatment), poultry, beans, eggs.
- Hydration during nausea: rice water, sago water, barley water, green coconut water — gentle on inflamed stomach; easy to sip.
- Plain soups: chicken broth, vegetable broth — nutrients and hydration during treatment side effects.
- Yogurt (plain, Lactobacillus-rich) — easier to digest and swallow during chemotherapy or radiation.
- High-calorie small snacks when appetite is low: boiled egg, banana, peanut butter on white toast.
- Turmeric (হলুদ / holud) and ginger: add to all cooking — curcumin (in turmeric) has anti-inflammatory and potential anti-cancer properties; ginger reduces chemotherapy-related nausea.

---

## CHUNK: CANCER_AVOID_001
**CONDITION:** cancer, cancer patient, chemotherapy
**CATEGORY:** avoided_foods
**KEYWORDS:** avoid cancer, processed meat cancer, red meat cancer, nitrosamines cancer, fried food nausea, raw food cancer infection risk, alcohol cancer, tobacco cancer, reheated food cancer, spicy food cancer mouth sores
**QUERY_TRIGGERS:** what not to eat cancer, bad foods cancer, avoid during chemo, food safety cancer patient

Foods to avoid or limit during cancer and cancer treatment:
- Processed meats in excess: grilled or tandoori meats in excess, sausage, salami, ready-made patties — nitrosamines strongly linked to colorectal cancer.
- Red meat in excess (gorur mangsho, mohisher mangsho — beef and buffalo) — heme iron promotes colorectal cancer cell growth.
- High-sugar, high-salt, high-fat processed foods — promote inflammation; displace cancer-fighting nutrients.
- Refined carbohydrates and low-fibre foods — reduce protective fibre effect.
- Greasy foods and foods with strong odours — trigger nausea and vomiting during treatment; serve food at room temperature to reduce smell.
- Raw or undercooked meat, poultry, eggs, fish — extremely high infection risk in immunocompromised cancer patients; all food must be cooked through.
- Reheated and overcooked foods — Maillard reaction products may be potential carcinogens.
- Alcohol and tobacco — both directly promote cancer development and severely worsen treatment outcomes.
- Strongly acidic and spicy foods: worsen mouth sores and oesophageal irritation during radiation and chemotherapy.
- Food from street vendors and salad bars — food safety is critical for cancer patients whose immune system is compromised.

---

## CHUNK: MULTI_CONDITION_001
**CONDITION:** multiple conditions, comorbidity, diabetes AND hypertension, diabetes AND kidney disease, CKD AND diabetes
**CATEGORY:** conflict_resolution
**KEYWORDS:** multiple conditions, comorbidity, diabetes hypertension, diabetes CKD, conflict diet two conditions, which restriction wins, comorbid diet
**QUERY_TRIGGERS:** I have diabetes and hypertension, two conditions diet, both diabetes and kidney, diabetic and blood pressure

Managing multiple conditions simultaneously — dietary conflict resolution principles:

When a patient has two or more conditions, the STRICTER restriction applies and must be flagged:

1. Diabetes + Hypertension:
   - Use low-GI carbs (diabetes) AND low-sodium (hypertension).
   - Avoid both sugar AND excess salt simultaneously.
   - Recommended overlap: brown rice, dal, grilled fish, vegetables, mustard oil, yogurt.

2. Diabetes + CKD:
   - Brown rice is good for diabetes but HIGH phosphorus for CKD — solution: use white rice in small portions, well-cooked.
   - High-fibre dal is good for diabetes but HIGH potassium for CKD — solution: use very small amounts of dal after leaching; or avoid in late CKD.
   - CKD restrictions take clinical precedence; inform physician of both conditions.

3. Hypertension + CKD:
   - Both require low sodium — aligned; follow strictly.
   - Potassium: hypertension says INCREASE potassium; CKD says RESTRICT potassium — CKD restriction takes precedence when serum K+ is elevated.

Always recommend consulting a clinical dietitian when managing two or more conditions simultaneously.

---

## CHUNK: CONSULT_001
**CONDITION:** ALL
**CATEGORY:** safety_disclaimer
**KEYWORDS:** consult doctor, when to see doctor, physician advice, dietitian referral, safety disclaimer
**QUERY_TRIGGERS:** should I see a doctor, when to consult, disclaimer

When to consult a physician and clinical dietitian — these guidelines are general; always seek professional advice if:
- Your condition is newly diagnosed or rapidly changing.
- You are managing two or more conditions simultaneously (e.g., diabetes plus CKD).
- You experience unusual symptoms after changing your diet.
- You are pregnant, breastfeeding, elderly, or a child under 18.
- You have been prescribed a personalised diet plan by your physician.
- You experience unexplained weight loss or weight gain.
- Laboratory results (blood glucose, creatinine, lipid profile, etc.) are out of the normal range.

DISCLAIMER: This knowledge base is based on the National Dietary Guidelines for Bangladesh 2022 (BIRDEM | Ministry of Food | FAO | WHO | National Nutrition Services). It is for general educational and informational purposes only. Always follow your physician's and registered dietitian's specific advice for your individual health condition.

---
# END OF BD_Cooking_RAG_KnowledgeBase v1.0
# Total chunks: 42
# Conditions covered: Diabetes, Hypertension, CHD, CKD, Renal Stones, Liver Disease, Obesity, Hypothyroidism, TB, Diarrhoea, Cancer, Multi-condition
# Language: English with Bengali food name annotations
# Source: National Dietary Guidelines for Bangladesh 2022