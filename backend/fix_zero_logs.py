"""
One-time migration: Fix zero-calorie meal tracking logs by looking up
the associated meal plan and fetching macros from Neo4j by food code.
"""
import asyncio
import json
import sys
sys.path.insert(0, '.')

from app.db import prisma
from rag_engine import KhadokGraphRAG


FOOD_MACRO_QUERY = (
    "MATCH (f:Food) WHERE f.code = $code "
    "RETURN f.energy_kcal AS cal, f.protein_g AS prot, "
    "f.fat_g AS fat, f.carbohydrate_g AS carbs"
)


async def main():
    await prisma.connect()
    rag = KhadokGraphRAG()
    driver = rag.get_neo4j_driver()

    # Get the most recent plan for each user
    plans = await prisma.mealplan.find_many(
        where={"planType": "daily"},
        order={"createdAt": "desc"},
        take=50,
    )

    # Build user -> slot -> items mapping from latest plan per user
    user_plan_map = {}
    for plan in plans:
        uid = plan.userId
        if uid not in user_plan_map:
            user_plan_map[uid] = {}
            plan_data = json.loads(plan.planData) if plan.planData else {}
            for meal in plan_data.get("meals", []):
                user_plan_map[uid][meal["slot"]] = meal.get("items", [])

    # Get all zero-cal logs
    zero_logs = await prisma.mealtracking.find_many(
        where={"totalCals": 0},
        order={"loggedAt": "desc"},
        take=50,
    )
    print(f"Found {len(zero_logs)} zero-calorie logs")

    fixed = 0
    for log in zero_logs:
        uid = log.userId
        slot = log.mealSlot
        slot_items = user_plan_map.get(uid, {}).get(slot, [])

        if not slot_items:
            print(f"  Skipping {log.id} — no plan items for slot '{slot}'")
            continue

        total_cals = total_prot = total_carbs = total_fat = 0.0
        parsed = []

        for item in slot_items:
            code = item.get("food_code") or item.get("code", "")
            amount_g = float(item.get("amount_g") or 100)
            scale = amount_g / 100.0

            if not code:
                continue

            try:
                with driver.session() as s:
                    res = s.run(FOOD_MACRO_QUERY, code=code).single()
                    if res:
                        cal   = float(res["cal"]   or 0) * scale
                        prot  = float(res["prot"]  or 0) * scale
                        fat   = float(res["fat"]   or 0) * scale
                        carbs = float(res["carbs"] or 0) * scale
                        total_cals  += cal
                        total_prot  += prot
                        total_carbs += carbs
                        total_fat   += fat
                        parsed.append({
                            "code":      code,
                            "name":      item.get("name_en") or item.get("name_bn", ""),
                            "amount_g":  amount_g,
                            "calories":  round(cal,   1),
                            "protein_g": round(prot,  1),
                            "carbs_g":   round(carbs, 1),
                            "fat_g":     round(fat,   1),
                        })
            except Exception as e:
                print(f"  Neo4j error for code={code}: {e}")

        if total_cals > 0:
            macros = {
                "protein_g": round(total_prot,  1),
                "carbs_g":   round(total_carbs, 1),
                "fat_g":     round(total_fat,   1),
            }
            await prisma.mealtracking.update(
                where={"id": log.id},
                data={
                    "totalCals":   int(total_cals),
                    "macros":      json.dumps(macros),
                    "parsedItems": json.dumps(parsed),
                },
            )
            fixed += 1
            print(
                f"  Fixed [{slot}] cals={int(total_cals)} "
                f"P={macros['protein_g']} C={macros['carbs_g']} F={macros['fat_g']}"
            )
        else:
            print(f"  Could not resolve macros for log {log.id} [{slot}]")

    print(f"\nDone. Fixed {fixed} / {len(zero_logs)} logs.")
    await prisma.disconnect()


asyncio.run(main())
