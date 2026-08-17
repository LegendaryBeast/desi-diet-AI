# DesiDiet Datasets

This directory contains the datasets used to construct the DesiDiet hybrid knowledge graph, as described in the accompanying paper.

## Files

| File | Records | Description |
|------|---------|-------------|
| `bd_food_nutrients.csv` | 581 food records | Core food-nutrient dataset combining Bangladesh FCT 2014 and supplementary records. 32 columns including bilingual names (English + Bengali) and 26 nutrient fields. |
| `bd_common_foods_from_indian_thali.csv` | 329 records | Supplementary food records originally from the Indian Thali GraphRAG dataset (Dindukurthi et al., 2026; IFCT 2017). The authors removed foods not commonly consumed in Bangladesh, retaining 329 items familiar in both countries. 422 columns with extended nutrient and food-descriptor fields. |
| `BDfood_Scraped.csv` | ~580 records | Raw food composition data scraped from the Bangladesh Food Composition Table (FCT 2014) PDF. 32 columns with nutrient values in original units (mg, mcg). |
| `disease_nutrients.csv` | 70 records | Disease–nutrient clinical mappings curated from WHO, CDC, and NIH guidelines. Reviewed by a consulting nutritionist (Sarmin Jahan Bithi). |
| `food_compatibility.csv` | 575 records | Culturally curated food-compatibility matrix with meal-slot assignments, role classifications, and compatibility scores. |
| `nutrients_abbreviations.csv` | 214 records | Nutrient abbreviation-to-full-name mapping dictionary used for column header resolution. |
| `Indian_RDA.csv` | 330 records | ICMR-NIN 2020 Recommended Dietary Allowances for 33 nutrients across 10 demographic brackets (Male/Female × 5 age groups). Used as proxy RDA for Bangladesh. |

## Data Sources

- **Bangladesh Food Composition Table (2014)**: Institute of Nutrition and Food Science, University of Dhaka, in collaboration with FAO.
- **National Dietary Guidelines for Bangladesh (2025)**: Ministry of Health and Family Welfare, Government of Bangladesh.
- **Supplementary food data**: Filtered from the Indian Food Composition Tables (IFCT 2017) dataset provided by Dindukurthi et al. (2026) to include foods culturally familiar in Bangladesh.
- **RDA Standards**: ICMR-NIN Expert Committee (2020), "Nutrient requirements for Indians: A report of the Expert Group."
- **Disease-nutrient mappings**: Curated from publicly accessible WHO, CDC, and NIH clinical guidelines.

## License

The Bangladesh Food Composition Table (2014) is publicly available from the University of Dhaka. The disease–nutrient mappings are derived from publicly accessible international health organization publications. Please cite the original sources when using these datasets.

## Citation

If you use these datasets, please cite the accompanying paper:

> Prappo, T.H. & Islam, M.S. (2026). DesiDiet: A Culturally-Grounded GraphRAG Framework with Hybrid Knowledge Graph for Personalized Nutrition in Bangladesh. *Informatics in Medicine Unlocked*.
