"""Seed script to populate learning paths with structured skill progressions."""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select, func, insert
from app.core.database import async_session_maker
from app.models.learning import LearningPath, Skill, learning_path_skills

# Define learning paths with their skills (in order)
LEARNING_PATHS_DATA = [
    {
        "name": "Kitchen Fundamentals",
        "description": "Master the essential skills every home cook needs. Start here to build a solid foundation for all your culinary adventures.",
        "category": "fundamentals",
        "difficulty": "beginner",
        "is_featured": True,
        "skills": [
            "Basic Knife Grip",
            "Mise en Place",
            "Mincing",
            "Seasoning",
            "Sautéing",
            "Roasting",
            "Pan Sauce",
        ],
    },
    {
        "name": "Knife Mastery",
        "description": "Progress from basic cuts to advanced knife techniques. Develop speed, precision, and confidence with your most important kitchen tool.",
        "category": "fundamentals",
        "difficulty": "intermediate",
        "is_featured": True,
        "skills": [
            "Basic Knife Grip",
            "Mincing",
            "Chiffonade",
            "Julienne Cut",
            "Brunoise Cut",
            "Butterflying",
            "Tourne Cut",
        ],
    },
    {
        "name": "Sauce Master",
        "description": "Learn the art of sauce making from simple pan sauces to classical French mother sauces and their derivatives.",
        "category": "fundamentals",
        "difficulty": "intermediate",
        "is_featured": True,
        "skills": [
            "Roux",
            "Reduction",
            "Pan Sauce",
            "Emulsification",
            "Mother Sauces",
        ],
    },
    {
        "name": "Stovetop Expert",
        "description": "Master all the essential stovetop cooking methods. From gentle poaching to high-heat searing.",
        "category": "fundamentals",
        "difficulty": "intermediate",
        "is_featured": False,
        "skills": [
            "Sautéing",
            "Steaming",
            "Poaching",
            "Deep Frying",
            "Stir-Frying",
            "Braising",
        ],
    },
    {
        "name": "Bread Baker's Journey",
        "description": "From simple loaves to artisan breads. Learn the science and craft of bread making.",
        "category": "specialty",
        "difficulty": "intermediate",
        "is_featured": True,
        "skills": [
            "Bread Kneading",
            "Sourdough Starter",
            "Laminated Dough",
        ],
    },
    {
        "name": "Pastry Foundations",
        "description": "Build a foundation in pastry arts. Master doughs, meringues, and chocolate work.",
        "category": "specialty",
        "difficulty": "advanced",
        "is_featured": False,
        "skills": [
            "Pie Crust",
            "Meringue Making",
            "Laminated Dough",
            "Tempering Chocolate",
        ],
    },
    {
        "name": "Asian Cuisine Essentials",
        "description": "Master the fundamental techniques of Asian cooking. Wok skills, stir-frying, and flavor development.",
        "category": "cuisine_specific",
        "difficulty": "intermediate",
        "is_featured": True,
        "skills": [
            "Wok Control",
            "Stir-Frying",
            "Steaming",
            "Umami Enhancement",
        ],
    },
    {
        "name": "French Technique Mastery",
        "description": "Classical French cooking techniques that form the foundation of Western cuisine.",
        "category": "cuisine_specific",
        "difficulty": "advanced",
        "is_featured": True,
        "skills": [
            "Mise en Place",
            "Julienne Cut",
            "Brunoise Cut",
            "Mother Sauces",
            "Braising",
            "Poaching",
            "Sauce Plating",
        ],
    },
    {
        "name": "Preservation & Fermentation",
        "description": "Learn traditional and modern methods of preserving food. From quick pickles to long ferments.",
        "category": "specialty",
        "difficulty": "intermediate",
        "is_featured": False,
        "skills": [
            "Pickling",
            "Jam Making",
            "Fermentation",
            "Curing",
        ],
    },
    {
        "name": "Temperature & Timing",
        "description": "Master the science of cooking temperatures. Perfect proteins every time.",
        "category": "advanced_techniques",
        "difficulty": "intermediate",
        "is_featured": False,
        "skills": [
            "Meat Doneness",
            "Oil Temperature",
            "Sugar Stages",
            "Sous Vide",
        ],
    },
    {
        "name": "Flavor Development Pro",
        "description": "Understand the science behind delicious food. Learn to build layers of flavor in every dish.",
        "category": "advanced_techniques",
        "difficulty": "intermediate",
        "is_featured": False,
        "skills": [
            "Seasoning",
            "Maillard Reaction",
            "Building Layers",
            "Umami Enhancement",
            "Reduction",
        ],
    },
    {
        "name": "Professional Plating",
        "description": "Transform your dishes from home-cooked to restaurant-quality presentation.",
        "category": "advanced_techniques",
        "difficulty": "intermediate",
        "is_featured": False,
        "skills": [
            "Color Balance",
            "Sauce Plating",
            "Height and Dimension",
        ],
    },
    {
        "name": "Grill Master",
        "description": "Master outdoor cooking from basic grilling to advanced techniques.",
        "category": "specialty",
        "difficulty": "beginner",
        "is_featured": True,
        "skills": [
            "Grilling",
            "Meat Doneness",
            "Marinating",
            "Seasoning",
        ],
    },
    {
        "name": "Kitchen Equipment Pro",
        "description": "Learn to properly use and maintain your kitchen tools for peak performance.",
        "category": "fundamentals",
        "difficulty": "beginner",
        "is_featured": False,
        "skills": [
            "Cast Iron Care",
            "Knife Sharpening",
            "Mandoline Use",
            "Wok Control",
        ],
    },
    {
        "name": "Complete Home Chef",
        "description": "The comprehensive path to becoming a confident home chef. Covers all essential techniques across categories.",
        "category": "fundamentals",
        "difficulty": "intermediate",
        "is_featured": True,
        "skills": [
            "Mise en Place",
            "Basic Knife Grip",
            "Seasoning",
            "Sautéing",
            "Roasting",
            "Grilling",
            "Braising",
            "Pan Sauce",
            "Blanching",
            "Meat Doneness",
            "Maillard Reaction",
            "Color Balance",
        ],
    },
]


async def seed_learning_paths():
    """Seed the database with learning paths."""
    async with async_session_maker() as session:
        # Check if learning paths already exist
        result = await session.execute(select(func.count(LearningPath.id)))
        count = result.scalar()

        if count > 0:
            print(f"Learning paths already exist ({count} found). Skipping seed.")
            return

        # Get all skills for mapping
        skills_result = await session.execute(select(Skill))
        skills = {skill.name: skill.id for skill in skills_result.scalars().all()}

        if not skills:
            print("No skills found. Please run seed_skills.py first.")
            return

        print(f"Found {len(skills)} skills. Creating {len(LEARNING_PATHS_DATA)} learning paths...")

        for path_data in LEARNING_PATHS_DATA:
            skill_names = path_data.pop("skills")

            # Calculate estimated hours from skills
            skill_ids = []
            total_hours = 0
            for skill_name in skill_names:
                if skill_name in skills:
                    skill_ids.append(skills[skill_name])

            # Get estimated hours for these skills
            if skill_ids:
                hours_result = await session.execute(
                    select(func.sum(Skill.estimated_learning_hours))
                    .where(Skill.id.in_(skill_ids))
                )
                total_hours = hours_result.scalar() or 0

            # Create learning path
            learning_path = LearningPath(
                name=path_data["name"],
                description=path_data.get("description"),
                category=path_data.get("category"),
                difficulty=path_data.get("difficulty"),
                estimated_hours=total_hours,
                skill_count=len(skill_ids),
                is_active=True,
                is_featured=path_data.get("is_featured", False),
            )
            session.add(learning_path)
            await session.flush()  # Get the ID

            # Add skills to path with order
            for order, skill_name in enumerate(skill_names):
                if skill_name in skills:
                    await session.execute(
                        insert(learning_path_skills).values(
                            learning_path_id=learning_path.id,
                            skill_id=skills[skill_name],
                            order=order,
                        )
                    )
                else:
                    print(f"  Warning: Skill '{skill_name}' not found, skipping...")

            print(f"  Created: {path_data['name']} ({len(skill_ids)} skills, ~{total_hours}h)")

        await session.commit()
        print(f"\nSuccessfully seeded {len(LEARNING_PATHS_DATA)} learning paths!")


if __name__ == "__main__":
    asyncio.run(seed_learning_paths())
