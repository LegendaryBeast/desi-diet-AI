# DesiDiet — Food Data Provenance & Dictionary

**Document Version:** 1.0.0  
**Last Updated:** September 2026  
**Authoritative Dataset:** `backend/data/bd_food_nutrients.csv` (582 rows, 32 columns, 582 distinct canonical food codes)

---

## 1. Dataset Provenance & Scope

The DesiDiet nutrition platform relies on a single authoritative dataset: `backend/data/bd_food_nutrients.csv`.

### Primary Sources
1. **Food Composition Table for Bangladesh (FCT 2013/2014)**:
   - *Title:* Food Composition Table for Bangladesh (1st Edition, June 2013; distributed as FCT 2014).
   - *Publisher:* Institute of Nutrition and Food Science (INFS), University of Dhaka & Centre for Advanced Research in Sciences (CARS).
   - *Coverage:* 258 core foods directly from FCT 2013/2014 (`FCT_2014`), plus 5 reconciled entries (`FCT_2014+BD`).
2. **Supplementary Bangladeshi Foods (`BD_original`)**:
   - *Coverage:* 319 common local recipe variants, preparations, snacks, and street foods.
   - *Language:* Curated with localized Bengali (`lang_bn`) and phonetic Banglish (`lang`) names.

### Decommissioned & Redundant Files
- `backend/data/BDfood_Scraped.csv`: Raw PDF-scraped text with noisy formatting. Completely reconciled into `bd_food_nutrients.csv` and deleted.
- `backend/data/BD_food_details.csv`: Historical supplementary table with 422 sparse columns. Reconciled and deleted to eliminate duplicate truth sources.

---

## 2. Food Code Disambiguation & Canonical Mapping

Historical audit of `bd_food_nutrients.csv` revealed two code integrity defects:
1. Six cereal foods shared the literal string `"code"` as their ID.
2. Two legitimate codes (`02_0001` and `02_0014`) appeared twice due to preparation differences.

Per Master Prompt guidelines, these rows were **not** deleted. Instead, they were assigned canonical semantic codes preserving legacy mappings:

| Original Code | Food Name | Bengali Name (`lang_bn`) | Food Group | Canonical Code | Reason / Note |
|---|---|---|---|---|---|
| `code` | Barley | বার্লি | Cereals and Millets | `01_0045` | Cereal prefix `01_` sequential allocation |
| `code` | Maize dry | ভুট্টা | Cereals and Millets | `01_0046` | Cereal prefix `01_` sequential allocation |
| `code` | Maize tender local | ভুট্টা | Cereals and Millets | `01_0047` | Cereal prefix `01_` sequential allocation |
| `code` | Maize tender sweet | ভুট্টা | Cereals and Millets | `01_0048` | Cereal prefix `01_` sequential allocation |
| `code` | Rice puffed | মুড়ি | Cereals and Millets | `01_0049` | Cereal prefix `01_` sequential allocation |
| `code` | Rice parboiled milled | সিদ্ধ চাল | Cereals and Millets | `01_0050` | Cereal prefix `01_` sequential allocation |
| `02_0001` (row 27) | Bengal gram, dehulled, split, dried, raw | ছোলার ডাল | Grain Legumes | `02_0001` | Primary raw entry |
| `02_0001` (row 37) | Bengal gram, roasted | ছোলার ডাল (ভাজা) | Grain Legumes | `02_0017` | Distinct roasted preparation state |
| `02_0014` (row 32) | Grass pea, split, boiled | খেসারির ডাল (রান্না করা) | Grain Legumes | `02_0014` | Primary boiled entry |
| `02_0014` (row 39) | Grass pea, split, boiled | খেসারি ডাল (রান্না করা) | Grain Legumes | `02_0014_alt` | Alternate phonetic spelling preserved |

In `backend/data/food_compatibility.csv`, the Barley entry at row 73 was migrated from `"code"` to `"01_0045"`.

---

## 3. Data Dictionary (32 Columns)

All nutrient concentrations are reported **per 100g of edible portion**.

| # | Column Name | Type | Unit | Description | Plausible Range |
|---|---|---|---|---|---|
| 1 | `source` | string | - | Data provenance label (`FCT_2014`, `BD_original`, `FCT_2014+BD`) | Categorical |
| 2 | `code` | string | - | Canonical food identifier (unique key) | Unique |
| 3 | `name` | string | - | English food title and descriptor | Text |
| 4 | `lang` | string | - | Banglish / phonetic vernacular name | Text |
| 5 | `lang_bn` | string | - | Authentic Bengali script name | Text |
| 6 | `grup` | string | - | Food category / botanical & culinary grouping | 21 categories |
| 7 | `enerc_kcal` | float | kcal | Energy content | 0.0 – 900.0 kcal |
| 8 | `water` | float | g | Moisture / water content | 0.0 – 100.0 g |
| 9 | `protcnt` | float | g | Total crude protein ($N \times 6.25$) | 0.0 – 100.0 g |
| 10 | `fatce` | float | g | Total crude lipid / fat | 0.0 – 100.0 g |
| 11 | `cho` | float | g | Available carbohydrate or total carbohydrate by difference | 0.0 – 100.0 g |
| 12 | `fibtg` | float | g | Total dietary fiber | 0.0 – 100.0 g |
| 13 | `ash` | float | g | Total mineral residue / inorganic ash | 0.0 – 100.0 g |
| 14 | `ca` | float | mg | Calcium | 0.0 – 10,000.0 mg |
| 15 | `fe` | float | mg | Total elemental iron | 0.0 – 500.0 mg |
| 16 | `mg` | float | mg | Magnesium | 0.0 – 2,000.0 mg |
| 17 | `p` | float | mg | Phosphorus | 0.0 – 5,000.0 mg |
| 18 | `k` | float | mg | Potassium | 0.0 – 10,000.0 mg |
| 19 | `na` | float | mg | Sodium (natural + added) | 0.0 – 40,000.0 mg |
| 20 | `zn` | float | mg | Zinc | 0.0 – 200.0 mg |
| 21 | `cu` | float | mg | Copper | 0.0 – 50.0 mg |
| 22 | `vita` | float | µg (mcg) | Vitamin A (Retinol Activity Equivalents, RAE) | 0.0 – 50,000.0 µg |
| 23 | `retol` | float | µg (mcg) | Preformed Retinol | 0.0 – 50,000.0 µg |
| 24 | `cartbeq` | float | µg (mcg) | Beta-Carotene equivalents | 0.0 – 100,000.0 µg |
| 25 | `vitd` | float | µg (mcg) | Vitamin D (Calciferol) | 0.0 – 2,000.0 µg |
| 26 | `vite` | float | mg | Vitamin E (alpha-tocopherol equivalents) | 0.0 – 200.0 mg |
| 27 | `thia` | float | mg | Thiamine (Vitamin B1) | 0.0 – 50.0 mg |
| 28 | `ribf` | float | mg | Riboflavin (Vitamin B2) | 0.0 – 50.0 mg |
| 29 | `nia` | float | mg | Niacin (Vitamin B3) | 0.0 – 200.0 mg |
| 30 | `vitb6c` | float | mg | Total Pyridoxine (Vitamin B6) | 0.0 – 50.0 mg |
| 31 | `folsum` | float | µg (mcg) | Total Folates (Vitamin B9) | 0.0 – 5,000.0 µg |
| 32 | `vitc` | float | mg | Total Ascorbic Acid (Vitamin C) | 0.0 – 5,000.0 mg |

---

## 4. Dimensional Unit Rules & Plausibility Invariants

1. **Strict Unit Conversions**:
   - Mass: $1\text{ g} = 1,000\text{ mg} = 1,000,000\text{ }\mu\text{g}$.
   - Energy: $1\text{ kcal} = 4.184\text{ kJ}$.
   - Magnitude-based unit guessing is **strictly prohibited**. Every quantity requires an explicit unit string.
2. **Measurement Status Distinctions**:
   - `MEASURED`: A confirmed analytical laboratory number.
   - `TRACE`: Present at levels below quantification limit ($<0.05$). Mapped to 0.0 for calculations, but flagged as `TRACE`.
   - `MISSING`: Not analyzed or unrecorded. Retained as `None`/`null`. **Never treated as measured zero**.
3. **Macronutrient Plausibility Invariant**:
   - Sum of proximate constituents:
     $$\text{Water} + \text{Protein} + \text{Fat} + \text{CHO} + \text{Ash} \le 105.0\text{g per 100g}$$
   - Allows up to 5% analytical variance. If total carbohydrate includes fiber, fiber is not added twice.

---

## 5. Missingness Profile (582 Foods)

| Nutrient | Missingness (%) | Clinical Handling |
|---|---|---|
| `cartbeq` (Beta-Carotene) | 53.4% | Fall back to `vita` (Retinol Activity Equivalents) |
| `vitd` (Vitamin D) | 39.0% | Mark as partially known; do not assume adequacy |
| `retol` (Preformed Retinol) | 34.0% | Retained as null if unmeasured |
| `vitc` (Vitamin C) | 26.3% | Flag in tracker if food plan contains unmeasured sources |
| `vite` (Vitamin E) | 20.5% | Recorded as null; flagged if clinically monitored |
| Macronutrients (`protcnt`, `fatce`, `cho`) | 0.0% | 100% complete across all 582 items |
| Minerals (`ca`, `fe`, `na`, `k`, `p`) | 0.0% | 100% complete across all 582 items |
