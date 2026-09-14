# DesiDiet — Clinical Scope & Nutrition Rule Review

**Document Version:** 1.0.0  
**Date:** September 2026  
**Standards Grounding:** National Dietary Guidelines for Bangladesh (NDG 2025), ICMR-NIN 2020, WHO Guideline on Sodium Intake (2023), KDIGO Clinical Practice Guideline for CKD (2024).

---

## 1. Clinical Scope & Population Boundaries

DesiDiet is designed as an evidence-grounded dietary planning and nutritional monitoring assistant for the adult Bangladeshi population.

### Supported Populations
- **Adults (19–65 years)**: Both male and female, sedentary to heavy physical activity.
- **Elderly (> 65 years)**: Adjusted for age-related lower basal energy and higher calcium/vitamin D requirements.
- **Pregnant & Lactating Women**: Nutritional escalation for gestational trimesters and lactation.

### Unsupported Populations & Safeguards
- **Infants (< 2 years)**: Automatically returns `UNSUPPORTED`. Infant nutrition requires exclusive breastfeeding (0–6 months) and specialized complementary feeding under pediatric clinical supervision.
- **Missing Demographics**: Missing age or gender returns `NEEDS_CLARIFICATION`. The system **strictly forbids** defaulting unspecified gender to male or unspecified age to adult.

---

## 2. Adjudication of the Adult Female Iron Standard

### The Historical Discrepancy
In the historical repository:
- `backend/data/Indian_RDA.csv` listed adult female iron as **8.1 mg/day**.
- `backend/validate_project.py` and manuscript drafts referenced **29 mg/day**.
- Neither file explicitly defined the requirement type or bioavailability context.

### Formal Adjudication & Clinical Evidence
1. **Physiological / Absorbed Requirement (EAR)**:
   - The physiological requirement for absorbed iron in non-pregnant adult women (19–50 years) is approximately **1.46 mg of absorbed iron per day** to offset basal dermal, gastrointestinal, and menstrual blood losses.
   - At high bioavailability (~18–20% from a Western meat-rich diet), the dietary requirement is **8.1 mg/day**. This is the **Estimated Average Requirement (EAR)** under optimal absorption.
2. **National Dietary Allowance (RDA) under Bangladeshi Conditions**:
   - The habitual Bangladeshi diet is predominantly plant- and cereal-based (rice, roti, pulses, vegetables) containing high concentrations of phytates and polyphenols that inhibit non-haem iron absorption, with low average daily haem iron (meat) intake.
   - Under standard 8–10% South Asian dietary bioavailability:
     $$\text{Dietary Intake} = \frac{1.46\text{ mg absorbed}}{0.10 \times 0.50} \approx 29.0\text{ mg/day}$$
   - **National Guideline Consensus**: Both the **National Dietary Guidelines for Bangladesh (NDG 2025, Table 20)** and **ICMR-NIN 2020 (Table 2.1)** formally establish **29 mg/day** as the official Recommended Dietary Allowance (RDA) for adult non-pregnant females.
3. **Pregnancy Escalation**:
   - During the 2nd and 3rd trimesters, fetal-placental growth and expanded maternal blood volume increase the RDA to **38 mg/day** (NDG 2025 Table 20).
   - Because dietary food alone rarely meets 38 mg/day on a low-bioavailability diet, clinical guidelines mandate daily oral elemental iron supplementation (60 mg elemental iron + 400 µg folic acid).

### Implementation in Code
In `backend/app/data/reference_intakes.py`:
- `fe` for adult females is typed as `RequirementType.RDA` with target **29.0 mg/day**, minimum bound **15.0 mg/day** (EAR), and explicit bioavailability metadata `bioavailability_pct = 10.0`.
- The 8.1 mg value is preserved in documentation as the basal physiological reference, preventing any silent ambiguity.

---

## 3. Chronic Disease Clinical Rules

| Condition | Primary Nutrient Target | Clinical Threshold | Guideline Source | Mechanism |
|---|---|---|---|---|
| **Hypertension** | Sodium (`na`) | $< 1,500\text{ mg/day}$ (equivalent to $< 3.75\text{g}$ salt) | AHA / NDG 2025 | Reduces extracellular fluid volume and vascular resistance |
| **Hypertension** | Potassium (`k`) | $\ge 3,500\text{ mg/day}$ | WHO / NDG 2025 | Promotes natriuresis (contraindicated in severe CKD) |
| **Type 2 Diabetes** | Dietary Fiber (`fibtg`) | $\ge 25–30\text{ g/day}$ | ADA / NDG 2025 | Retards carbohydrate absorption, blunts postprandial hyperglycemia |
| **Type 2 Diabetes** | Carbohydrate (`cho`) | $45–55\%$ of total calories | NDG 2025 Table 15 | Prevents glucose surges; prioritizes low-GI whole grains |
| **CKD Stage 3–5** | Total Protein (`protcnt`) | $0.6–0.8\text{ g/kg/day}$ (max $38–45\text{g/day}$) | KDIGO 2024 | Decreases glomerular hyperfiltration and nitrogenous waste |
| **CKD Stage 3–5** | Phosphorus (`p`) | $< 800–1,000\text{ mg/day}$ | KDIGO 2024 | Prevents hyperphosphatemia and vascular calcification |
| **CKD Stage 3–5** | Potassium (`k`) | $< 2,000–2,500\text{ mg/day}$ | KDIGO 2024 | Prevents fatal cardiac arrhythmias from hyperkalemia |
| **Gout** | Purine / Protein | Moderate protein, zero organ meats | NDG 2025 | Prevents hyperuricemia and crystal arthropathy |

---

## 4. Multi-Condition Conflict Resolution

When a patient presents with multiple comorbid conditions (e.g. Type 2 Diabetes + CKD Stage 3):
1. **Rule Precedence Hierarchy**:
   $$\text{Renal / Organ Safety Caps} \succ \text{Cardiovascular Restrictions} \succ \text{Metabolic Targets} \succ \text{General RDA}$$
2. **Example Conflict**:
   - A general diabetic diet might recommend higher protein ($1.0–1.2\text{ g/kg}$) to promote satiety.
   - However, for a patient with diabetic nephropathy (CKD), the **KDIGO $0.8\text{ g/kg}$ protein restriction strictly supersedes** the diabetic protein target.
   - The engine issues a logged audit note: *"CKD: Protein capped at 45g/day supersedes general metabolic protein recommendations."*
