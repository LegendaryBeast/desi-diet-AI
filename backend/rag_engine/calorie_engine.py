"""
Calorie Engine based on National Dietary Guidelines (NDG) 2025.
Calculates Ideal Body Weight (IBW) and Daily Calorie Allowance (DCA).
Uses Mifflin-St Jeor equation for daily energy expenditure (TDEE).
"""

def calculate_targets(profile: dict) -> dict:
    """
    Feature: User target setup.
    Profile should contain: gender ('male'/'female'), height_cm, weight_kg, activity_level, age, goal
    Activity levels: 'sedentary', 'moderate', 'active'
    """
    height_cm = profile.get('height_cm', 160)
    weight_kg = profile.get('weight_kg', 60)
    gender = profile.get('gender', 'male').lower()
    activity = profile.get('activity_level', 'sedentary').lower()
    age = profile.get('age', 25)
    if age is None or age <= 0:
        age = 25
    goal = profile.get('goal', 'maintain')
    if goal is None:
        goal = 'maintain'
    
    # NDG 2025 BMI
    bmi = weight_kg / ((height_cm / 100) ** 2)
    body_type = 'normal'
    # Using South Asian cutoffs as suggested in NDG
    if bmi >= 27.5: body_type = 'obese'
    elif bmi >= 23.0: body_type = 'overweight'
    elif bmi < 18.5: body_type = 'underweight'

    # Mifflin-St Jeor BMR calculation
    if gender == 'male':
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    else:
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age - 161

    # Activity multiplier
    activity_map = {
        'sedentary': 1.2,
        'light': 1.375,
        'lightly_active': 1.375,
        'moderate': 1.55,
        'moderately_active': 1.55,
        'active': 1.725,
        'very_active': 1.725,
        'extremely_active': 1.9,
    }
    multiplier = activity_map.get(activity, 1.2)
    tdee = bmr * multiplier

    # Goal adjustment
    goal_lower = str(goal).lower()
    target_calories = tdee
    if 'gain' in goal_lower:
        target_calories += 300
    elif 'loss' in goal_lower or 'deficit' in goal_lower:
        target_calories -= 350
        # Ensure safe minimums
        min_safe = 1500 if gender == 'male' else 1200
        if target_calories < min_safe:
            target_calories = min_safe

    # Prevent unreasonable values
    target_calories = max(1200, round(target_calories))

    # NDG 2025 IBW Formula (Devine Formula adapted)
    h_inches = height_cm / 2.54
    if gender == 'male':
        ibw = 50 + 2.3 * (h_inches - 60)
    else:
        ibw = 45.5 + 2.3 * (h_inches - 60)
    if h_inches < 60:
        ibw = weight_kg
        
    # BMI category for display
    bmi_category = body_type.replace('_', ' ').title()
    
    return {
        'bmi': round(bmi, 1),
        'bmi_category': bmi_category,
        'body_type': body_type,
        'ideal_body_weight_kg': round(ibw, 1),
        'target_calories': target_calories,
        'protein_g': round((target_calories * 0.15) / 4),  # 15% from protein
        'fat_g': round((target_calories * 0.30) / 9),      # 30% from fat
        'carbs_g': round((target_calories * 0.55) / 4),    # 55% from carbs
        'fiber_g': 25,                                      # NDG default
        'water_L': round(ibw * 0.033, 1)                   # ~33ml per kg
    }
