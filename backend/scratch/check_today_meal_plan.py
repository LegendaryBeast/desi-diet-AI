import asyncio
import json
from app.db import prisma
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

async def main():
    await prisma.connect()
    try:
        # Find the latest user in the database
        user = await prisma.user.find_first(order={"createdAt": "desc"})
        if not user:
            print("No users found.")
            return

        print(f"User ID: {user.id}")
        profile = await prisma.profile.find_unique(where={"userId": user.id})
        if profile:
            print(f"Profile Name (En): {profile.nameEn}, Name (Bn): {profile.nameBn}")

        # Fetch all meal plans
        plans = await prisma.mealplan.find_many(
            where={"userId": user.id},
            order={"planDate": "desc"}
        )
        print(f"Found {len(plans)} meal plans:")
        for idx, p in enumerate(plans):
            print(f"\n[{idx}] ID: {p.planId} | Date: {p.planDate} (UTC) | Type: {p.planType} | Target: {p.calorieTarget}")
            # Try to load the meal names
            try:
                data = json.loads(p.planData)
                meals = data.get("meals", [])
                print(f"  Meals: {len(meals)}")
                for m in meals:
                    items_str = ", ".join([i.get("name_bn") or i.get("name_en") or "" for i in m.get("items", [])])
                    print(f"    - {m.get('slot')}: {items_str} ({m.get('target_calories')} kcal)")
            except Exception as e:
                print(f"  Error loading data: {e}")

    finally:
        await prisma.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
