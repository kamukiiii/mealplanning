import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import cors from 'cors';

const __dirname = path.resolve();
const dbPath = path.join(__dirname, 'data.db');
const db = new Database(dbPath);

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    current_amount REAL DEFAULT 0,
    unit TEXT,
    unit_cost REAL DEFAULT 0,
    total_spent REAL DEFAULT 0,
    total_amount REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ingredient_id INTEGER,
    amount REAL,
    price REAL,
    date TEXT,
    FOREIGN KEY(ingredient_id) REFERENCES ingredients(id)
  );

  CREATE TABLE IF NOT EXISTS meal_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    dish_name TEXT,
    status TEXT DEFAULT 'pending',
    cost_recorded REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS meal_plan_ingredients (
    meal_plan_id INTEGER,
    ingredient_id INTEGER,
    amount_needed REAL,
    FOREIGN KEY(meal_plan_id) REFERENCES meal_plans(id),
    FOREIGN KEY(ingredient_id) REFERENCES ingredients(id)
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes

  // Ingredients & Inventory
  app.get('/api/ingredients', (req, res) => {
    const rows = db.prepare('SELECT * FROM ingredients').all();
    res.json(rows);
  });

  app.post('/api/purchases', (req, res) => {
    const { name, amount, price, unit, date } = req.body;
    
    db.transaction(() => {
      // Find or create ingredient
      let ingredient = db.prepare('SELECT id, total_spent, total_amount FROM ingredients WHERE name = ?').get(name) as any;
      
      if (!ingredient) {
        const result = db.prepare('INSERT INTO ingredients (name, unit, current_amount, total_spent, total_amount, unit_cost) VALUES (?, ?, ?, ?, ?, ?)')
          .run(name, unit, amount, price, amount, price / amount);
        ingredient = { id: result.lastInsertRowid, total_spent: price, total_amount: amount };
      } else {
        const newTotalSpent = ingredient.total_spent + price;
        const newTotalAmount = ingredient.total_amount + amount;
        const newUnitCost = newTotalSpent / newTotalAmount;
        
        db.prepare('UPDATE ingredients SET current_amount = current_amount + ?, total_spent = ?, total_amount = ?, unit_cost = ? WHERE id = ?')
          .run(amount, newTotalSpent, newTotalAmount, newUnitCost, ingredient.id);
      }
      
      db.prepare('INSERT INTO purchases (ingredient_id, amount, price, date) VALUES (?, ?, ?, ?)')
        .run(ingredient.id, amount, price, date);
    })();
    
    res.json({ success: true });
  });

  // Meal Plans
  app.get('/api/meal-plans', (req, res) => {
    const plans = db.prepare('SELECT * FROM meal_plans ORDER BY date DESC').all() as any[];
    const result = plans.map(plan => {
      const ingredients = db.prepare(`
        SELECT mpi.ingredient_id, mpi.amount_needed, i.name, i.unit 
        FROM meal_plan_ingredients mpi
        JOIN ingredients i ON mpi.ingredient_id = i.id
        WHERE mpi.meal_plan_id = ?
      `).all(plan.id);
      return { ...plan, ingredients };
    });
    res.json(result);
  });

  app.post('/api/meal-plans', (req, res) => {
    const { date, dish_name, ingredients } = req.body;
    
    const result = db.transaction(() => {
      const plan = db.prepare('INSERT INTO meal_plans (date, dish_name) VALUES (?, ?)')
        .run(date, dish_name);
      
      const mealPlanId = plan.lastInsertRowid;
      
      for (const ing of ingredients) {
        db.prepare('INSERT INTO meal_plan_ingredients (meal_plan_id, ingredient_id, amount_needed) VALUES (?, ?, ?)')
          .run(mealPlanId, ing.ingredient_id, ing.amount_needed);
      }
      return mealPlanId;
    })();
    
    res.json({ id: result });
  });

  app.post('/api/meal-plans/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    db.transaction(() => {
      const plan = db.prepare('SELECT * FROM meal_plans WHERE id = ?').get(id) as any;
      if (plan.status === 'completed' && status !== 'completed') {
          // Revert if it was completed
          const ingredients = db.prepare('SELECT * FROM meal_plan_ingredients WHERE meal_plan_id = ?').all(id) as any[];
          for (const ing of ingredients) {
             db.prepare('UPDATE ingredients SET current_amount = current_amount + ? WHERE id = ?')
               .run(ing.amount_needed, ing.ingredient_id);
          }
           db.prepare('UPDATE meal_plans SET status = ?, cost_recorded = 0 WHERE id = ?').run(status, id);
      } else if (status === 'completed' && plan.status !== 'completed') {
        // Mark as completed
        const ingredients = db.prepare(`
          SELECT mpi.ingredient_id, mpi.amount_needed, i.unit_cost 
          FROM meal_plan_ingredients mpi
          JOIN ingredients i ON mpi.ingredient_id = i.id
          WHERE mpi.meal_plan_id = ?
        `).all(id) as any[];
        
        let totalCost = 0;
        for (const ing of ingredients) {
          db.prepare('UPDATE ingredients SET current_amount = current_amount - ? WHERE id = ?')
            .run(ing.amount_needed, ing.ingredient_id);
          totalCost += ing.amount_needed * ing.unit_cost;
        }
        
        db.prepare('UPDATE meal_plans SET status = ?, cost_recorded = ? WHERE id = ?')
          .run(status, totalCost, id);
      } else {
        db.prepare('UPDATE meal_plans SET status = ? WHERE id = ?').run(status, id);
      }
    })();
    
    res.json({ success: true });
  });

  app.delete('/api/meal-plans/:id', (req, res) => {
    const { id } = req.params;
    db.transaction(() => {
      db.prepare('DELETE FROM meal_plan_ingredients WHERE meal_plan_id = ?').run(id);
      db.prepare('DELETE FROM meal_plans WHERE id = ?').run(id);
    })();
    res.json({ success: true });
  });

  // Reports
  app.get('/api/reports/expenses', (req, res) => {
    const rows = db.prepare(`
      SELECT date, SUM(cost_recorded) as total_cost 
      FROM meal_plans 
      WHERE status = 'completed' 
      GROUP BY date 
      ORDER BY date
    `).all();
    res.json(rows);
  });

  app.put('/api/ingredients/:id', (req, res) => {
    const { id } = req.params;
    const { name, current_amount, unit_cost, unit } = req.body;
    
    db.prepare('UPDATE ingredients SET name = ?, current_amount = ?, unit_cost = ?, unit = ? WHERE id = ?')
      .run(name, current_amount, unit_cost, unit, id);
    
    res.json({ success: true });
  });

  app.delete('/api/ingredients/:id', (req, res) => {
    const { id } = req.params;
    db.transaction(() => {
      db.prepare('DELETE FROM meal_plan_ingredients WHERE ingredient_id = ?').run(id);
      db.prepare('DELETE FROM purchases WHERE ingredient_id = ?').run(id);
      db.prepare('DELETE FROM ingredients WHERE id = ?').run(id);
    })();
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
