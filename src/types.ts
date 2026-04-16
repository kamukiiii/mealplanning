// Shared types for the application
export interface Ingredient {
  id: number;
  name: string;
  current_amount: number;
  unit: string;
  unit_cost: number;
  last_updated?: string;
}

export interface Purchase {
  id: number;
  ingredient_id: number;
  ingredient_name?: string;
  amount: number;
  price: number;
  date: string;
}

export interface MealPlan {
  id: number;
  date: string;
  dish_name: string;
  status: 'pending' | 'completed' | 'cancelled';
  cost_recorded: number;
  ingredients: MealPlanIngredient[];
}

export interface MealPlanIngredient {
  ingredient_id: number;
  name: string;
  amount_needed: number;
  unit: string;
}

export interface DailyAccount {
  date: string;
  total_cost: number;
  meal_count: number;
}
