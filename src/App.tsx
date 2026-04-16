import React, { useState, useEffect } from 'react';
import { 
  History, 
  Calendar, 
  ShoppingCart, 
  PieChart, 
  Check, 
  X, 
  Plus, 
  Clock, 
  ChevronRight, 
  ChevronLeft, 
  Trash2, 
  AlertTriangle,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  format, 
  addDays, 
  subDays, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay,
  parseISO,
  startOfDay
} from 'date-fns';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar 
} from 'recharts';
import { Ingredient, MealPlan, MealPlanIngredient } from './types';

// Components
const PageContainer = ({ children }: { children: React.ReactNode }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="pb-24 pt-6 px-4 max-w-lg mx-auto"
  >
    {children}
  </motion.div>
);

const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string, key?: any }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4 ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = 'primary', className = "", disabled = false }: any) => {
  const variants = {
    primary: 'bg-indigo-600 text-white active:bg-indigo-700',
    secondary: 'bg-gray-100 text-gray-800 active:bg-gray-200',
    danger: 'bg-red-50 text-red-600 active:bg-red-100',
    outline: 'border border-gray-200 text-gray-600 active:bg-gray-50',
    ghost: 'text-gray-500 hover:text-gray-800'
  };
  return (
    <button 
      disabled={disabled}
      onClick={onClick}
      className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${variants[variant as keyof typeof variants]} ${className}`}
    >
      {children}
    </button>
  );
};

export default function App() {
  const [authorized, setAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'meals' | 'inventory' | 'reports'>('meals');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [reportsData, setReportsData] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Password Logic
  const handleAuth = () => {
    // Simple private password (can be changed in .env)
    if (password === '8888') {
      setAuthorized(true);
      localStorage.setItem('diet_auth', 'true');
    }
  };

  useEffect(() => {
    if (localStorage.getItem('diet_auth') === 'true') {
      setAuthorized(true);
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const respIng = await fetch('/api/ingredients');
      const dataIng = await respIng.json();
      setIngredients(dataIng);

      const respPlans = await fetch('/api/meal-plans');
      const dataPlans = await respPlans.json();
      setMealPlans(dataPlans);

      const respReports = await fetch('/api/reports/expenses');
      const dataReports = await respReports.json();
      setReportsData(dataReports);
    } catch (e) {
      console.error('Fetch error:', e);
    }
  };

  if (!authorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg shadow-indigo-100">
            <Lock className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-center mb-2">私密饮食资产</h1>
          <p className="text-gray-500 text-center mb-8">请输入访问密码</p>
          <input 
            type="password" 
            placeholder="****"
            className="w-full bg-white border border-gray-200 rounded-2xl p-4 text-center text-2xl tracking-widest mb-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
          />
          <Button className="w-full py-4 text-lg" onClick={handleAuth}>进入系统</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FE] text-gray-900 font-sans">
      <AnimatePresence mode="wait">
        {activeTab === 'meals' && (
          <MealsPage 
            key="meals" 
            selectedDate={selectedDate} 
            setSelectedDate={setSelectedDate} 
            mealPlans={mealPlans} 
            ingredients={ingredients}
            onUpdate={fetchData} 
          />
        )}
        {activeTab === 'inventory' && (
          <InventoryPage 
            key="inventory" 
            ingredients={ingredients} 
            onUpdate={fetchData} 
          />
        )}
        {activeTab === 'reports' && (
          <ReportsPage 
            key="reports" 
            reportsData={reportsData} 
            mealPlans={mealPlans}
          />
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around items-center py-3 px-6 safe-area-bottom z-50 shadow-lg">
        <NavButton active={activeTab === 'meals'} onClick={() => setActiveTab('meals')} icon={<Calendar />} label="计划" />
        <NavButton active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} icon={<ShoppingCart />} label="库存" />
        <NavButton active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={<PieChart />} label="复盘" />
      </nav>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-indigo-600' : 'text-gray-400'}`}
    >
      <div className={`p-2 rounded-xl transition-all ${active ? 'bg-indigo-50 shadow-sm' : ''}`}>
        {React.cloneElement(icon as React.ReactElement, { size: 24, strokeWidth: active ? 2.5 : 2 })}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}

// Pages
const MealsPage = ({ selectedDate, setSelectedDate, mealPlans, ingredients, onUpdate }: any) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newMeal, setNewMeal] = useState({ dish_name: '', ingredients: [] as any[] });

  const isPastDay = startOfDay(selectedDate) < startOfDay(new Date());

  const currentPlans = mealPlans.filter((p: any) => p.date === format(selectedDate, 'yyyy-MM-dd'));

  const handleStatusChange = async (id: number, status: string) => {
    await fetch(`/api/meal-plans/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    onUpdate();
  };

  const handlePostpone = async (plan: any) => {
    const nextDate = format(addDays(parseISO(plan.date), 1), 'yyyy-MM-dd');
    await fetch('/api/meal-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: nextDate,
        dish_name: plan.dish_name,
        ingredients: plan.ingredients.map((i: any) => ({ ingredient_id: i.ingredient_id, amount_needed: i.amount_needed }))
      })
    });
    await fetch(`/api/meal-plans/${plan.id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' })
    });
    onUpdate();
  };

  const handleDelete = async (id: number) => {
    if (confirm('确定删除该计划吗？')) {
      await fetch(`/api/meal-plans/${id}`, { method: 'DELETE' });
      onUpdate();
    }
  };

  const addIngredientToMeal = () => {
    setNewMeal({ ...newMeal, ingredients: [...newMeal.ingredients, { ingredient_id: ingredients[0]?.id || 0, amount_needed: 0 }] });
  };

  const handleSaveMeal = async () => {
    if (!newMeal.dish_name) return;
    await fetch('/api/meal-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: format(selectedDate, 'yyyy-MM-dd'),
        dish_name: newMeal.dish_name,
        ingredients: newMeal.ingredients
      })
    });
    setNewMeal({ dish_name: '', ingredients: [] });
    setIsAdding(false);
    onUpdate();
  };

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black text-gray-900 leading-none mb-1">每日计划</h2>
          <p className="text-gray-500 font-medium">{format(selectedDate, 'yyyy年MM月dd日')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="w-10 h-10 p-0 rounded-full" onClick={() => setSelectedDate(subDays(selectedDate, 1))}>
            <ChevronLeft size={20} />
          </Button>
          <Button variant="outline" className="w-10 h-10 p-0 rounded-full" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
            <ChevronRight size={20} />
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {currentPlans.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
            <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="text-gray-300" />
            </div>
            <p className="text-gray-400 font-medium">今天没有饮食安排</p>
          </div>
        ) : (
          currentPlans.map((plan: any) => (
            <Card key={plan.id} className="relative overflow-hidden group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold mb-1">{plan.dish_name}</h3>
                  <div className="flex flex-wrap gap-2">
                    {plan.ingredients.map((ing: any, i: number) => {
                      const stock = ingredients.find((si: any) => si.id === ing.ingredient_id);
                      const isShort = (stock?.current_amount || 0) < ing.amount_needed;
                      return (
                        <span key={i} className={`text-[11px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${isShort ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                          {ing.name} {ing.amount_needed}{ing.unit}
                          {isShort && <AlertTriangle size={10} />}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <button onClick={() => handleDelete(plan.id)} className="text-gray-300 hover:text-red-500 p-1">
                  <Trash2 size={16} />
                </button>
              </div>

              {plan.status === 'pending' ? (
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="primary" className="bg-emerald-500" onClick={() => handleStatusChange(plan.id, 'completed')}>
                    <Check size={18} /> 完成
                  </Button>
                  <Button variant="danger" onClick={() => handleStatusChange(plan.id, 'cancelled')}>
                    <X size={18} /> 取消
                  </Button>
                  <Button variant="secondary" onClick={() => handlePostpone(plan)}>
                    <History size={18} /> 顺延
                  </Button>
                </div>
              ) : (
                <div className={`py-2 px-4 rounded-xl flex items-center justify-between ${plan.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-500'}`}>
                  <div className="flex items-center gap-2 font-bold uppercase text-xs tracking-widest">
                    {plan.status === 'completed' ? <Check size={16} /> : <X size={16} />}
                    {plan.status === 'completed' ? '已完成' : '已取消'}
                  </div>
                  {plan.status === 'completed' && <span className="font-bold">¥{plan.cost_recorded.toFixed(2)}</span>}
                  {!isPastDay && <Button variant="ghost" className="text-xs font-bold" onClick={() => handleStatusChange(plan.id, 'pending')}>重置</Button>}
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {!isPastDay && (
        <button 
          onClick={() => setIsAdding(true)}
          className="fixed bottom-28 right-6 w-14 h-14 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-200 flex items-center justify-center animate-bounce-slow"
        >
          <Plus size={32} />
        </button>
      )}

      {/* Add Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-4">
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black">新增菜品</h3>
              <button onClick={() => setIsAdding(false)} className="bg-gray-100 p-2 rounded-full"><X size={20} /></button>
            </div>
            
            <div className="space-y-4 mb-8">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">菜名</label>
                <input 
                  autoFocus
                  className="w-full bg-gray-50 border-none rounded-2xl p-4 text-lg font-bold outline-none" 
                  value={newMeal.dish_name} 
                  onChange={e => setNewMeal({...newMeal, dish_name: e.target.value})}
                  placeholder="例如：西红柿炒鸡蛋"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex justify-between">
                  关联食材
                  <button onClick={addIngredientToMeal} className="text-indigo-600 text-[10px]">+ 添加</button>
                </label>
                <div className="space-y-2">
                  {newMeal.ingredients.map((mi, idx) => (
                    <div key={idx} className="flex gap-2 items-center bg-gray-50 p-2 rounded-xl">
                      <select 
                        className="flex-1 bg-transparent font-medium"
                        value={mi.ingredient_id}
                        onChange={e => {
                          const ings = [...newMeal.ingredients];
                          ings[idx].ingredient_id = parseInt(e.target.value);
                          setNewMeal({...newMeal, ingredients: ings});
                        }}
                      >
                        {ingredients.map((ing: any) => (
                          <option key={ing.id} value={ing.id}>{ing.name}</option>
                        ))}
                      </select>
                      <input 
                        className="w-16 bg-white rounded-lg px-2 py-1 text-center font-bold"
                        type="number" 
                        value={mi.amount_needed}
                        onChange={e => {
                          const ings = [...newMeal.ingredients];
                          ings[idx].amount_needed = parseFloat(e.target.value);
                          setNewMeal({...newMeal, ingredients: ings});
                        }}
                      />
                      <span className="text-xs text-gray-400 font-bold">
                        {ingredients.find((i:any) => i.id === mi.ingredient_id)?.unit || ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Button className="w-full py-4 rounded-3xl" onClick={handleSaveMeal}>保存计划</Button>
          </motion.div>
        </div>
      )}
    </PageContainer>
  );
};

const InventoryPage = ({ ingredients, onUpdate }: any) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [purchase, setPurchase] = useState({ name: '', amount: 0, price: 0, unit: 'g', date: format(new Date(), 'yyyy-MM-dd') });

  const handleSavePurchase = async () => {
    if (!purchase.name || purchase.amount < 0 || purchase.price < 0) return;
    await fetch('/api/purchases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(purchase)
    });
    setPurchase({ name: '', amount: 0, price: 0, unit: 'g', date: format(new Date(), 'yyyy-MM-dd') });
    setIsAdding(false);
    onUpdate();
  };

  const handleDeleteIngredient = async (id: number) => {
    if (confirm('删除食材将同时移除相关的购买记录和计划关联，确定吗？')) {
      await fetch(`/api/ingredients/${id}`, { method: 'DELETE' });
      onUpdate();
    }
  };

  const handleUpdateIngredient = async () => {
    if (!editForm.name || editForm.current_amount < 0 || editForm.unit_cost < 0) return;
    await fetch(`/api/ingredients/${editForm.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm)
    });
    setIsEditing(false);
    setEditForm(null);
    onUpdate();
  };

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black text-gray-900 leading-none mb-1">食材库存</h2>
          <p className="text-gray-500 font-medium">共管理 {ingredients.length} 种食材</p>
        </div>
        <Button variant="primary" className="rounded-2xl" onClick={() => setIsAdding(true)}>
          <Plus size={20} /> 录入买菜
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {ingredients.map((ing: any) => (
          <Card key={ing.id} className="p-0 overflow-hidden relative">
            <div className="p-4 pt-10">
              <div className="absolute top-2 right-2 flex gap-1">
                <button 
                  onClick={() => { setEditForm(ing); setIsEditing(true); }}
                  className="bg-indigo-50 text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  <History size={14} />
                </button>
                <button 
                  onClick={() => handleDeleteIngredient(ing.id)}
                  className="bg-red-50 text-red-600 p-1.5 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <h3 className="text-lg font-bold mb-1 truncate">{ing.name}</h3>
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-black ${ing.current_amount <= 0 ? 'text-red-500' : 'text-indigo-600'}`}>
                  {ing.current_amount}
                </span>
                <span className="text-xs text-gray-400 font-bold uppercase">{ing.unit}</span>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-2 border-t border-gray-100 flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <span>成本</span>
              <span className="text-gray-900">¥{(ing.unit_cost || 0).toFixed(4)}/{ing.unit}</span>
            </div>
          </Card>
        ))}
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-4">
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl overflow-y-auto max-h-[90vh]"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black">录入购买记录</h3>
              <button onClick={() => setIsAdding(false)} className="bg-gray-100 p-2 rounded-full"><X size={20} /></button>
            </div>
            
            <div className="space-y-4 mb-8 text-left">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">食材名称</label>
                  <input 
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold outline-none" 
                    value={purchase.name} 
                    onChange={e => setPurchase({...purchase, name: e.target.value})}
                    placeholder="例如：五花肉"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">购买分量</label>
                  <input 
                    type="number"
                    min="0"
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold outline-none" 
                    value={purchase.amount || ''} 
                    onChange={e => setPurchase({...purchase, amount: Math.max(0, parseFloat(e.target.value))})}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">单位</label>
                  <input 
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold outline-none" 
                    value={purchase.unit} 
                    onChange={e => setPurchase({...purchase, unit: e.target.value})}
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">总价格 (元)</label>
                  <input 
                    type="number"
                    min="0"
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold outline-none" 
                    value={purchase.price || ''} 
                    onChange={e => setPurchase({...purchase, price: Math.max(0, parseFloat(e.target.value))})}
                  />
                </div>
              </div>
            </div>

            <Button className="w-full py-4 rounded-3xl" onClick={handleSavePurchase}>保存买菜记录</Button>
          </motion.div>
        </div>
      )}

      {isEditing && editForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-4">
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black">修改库存/成本</h3>
              <button onClick={() => setIsEditing(false)} className="bg-gray-100 p-2 rounded-full"><X size={20} /></button>
            </div>
            
            <div className="space-y-4 mb-8 text-left">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">库存总量 ({editForm.unit})</label>
                <input 
                  type="number"
                  min="0"
                  className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold outline-none" 
                  value={editForm.current_amount} 
                  onChange={e => setEditForm({...editForm, current_amount: Math.max(0, parseFloat(e.target.value))})}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">单位成本 (元/{editForm.unit})</label>
                <input 
                  type="number"
                  min="0"
                  step="0.0001"
                  className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold outline-none" 
                  value={editForm.unit_cost} 
                  onChange={e => setEditForm({...editForm, unit_cost: Math.max(0, parseFloat(e.target.value))})}
                />
              </div>
            </div>

            <Button className="w-full py-4 rounded-3xl" onClick={handleUpdateIngredient}>保存修改</Button>
          </motion.div>
        </div>
      )}
    </PageContainer>
  );
};


const ReportsPage = ({ reportsData, mealPlans }: any) => {
  const chartData = reportsData.map((d: any) => ({
    name: format(parseISO(d.date), 'MM/dd'),
    cost: d.total_cost
  }));

  const completionRate = mealPlans.length > 0 
    ? (mealPlans.filter((p: any) => p.status === 'completed').length / mealPlans.length * 100).toFixed(0)
    : 0;

  const totalMonthlyCost = reportsData
    .reduce((acc, curr) => acc + curr.total_cost, 0)
    .toFixed(2);

  const mostCancelled = Object.entries(
    mealPlans.filter((p: any) => p.status === 'cancelled').reduce((acc: any, curr: any) => {
      acc[curr.dish_name] = (acc[curr.dish_name] || 0) + 1;
      return acc;
    }, {})
  ).sort((a: any, b: any) => b[1] - a[1]).slice(0, 3);

  return (
    <PageContainer>
      <h2 className="text-3xl font-black mb-8">数据复盘</h2>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="bg-indigo-600 border-none text-white p-6">
          <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest mb-1">本月消耗</p>
          <p className="text-3xl font-black">¥{totalMonthlyCost}</p>
        </Card>
        <Card className="bg-emerald-500 border-none text-white p-6">
          <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mb-1">执行率</p>
          <p className="text-3xl font-black">{completionRate}%</p>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-black mb-6">历史开销趋势</h3>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} tick={{fill: '#9CA3AF'}} />
              <YAxis axisLine={false} tickLine={false} fontSize={10} tick={{fill: '#9CA3AF'}} />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
              />
              <Line type="monotone" dataKey="cost" stroke="#4F46E5" strokeWidth={4} dot={{ r: 4, fill: '#4F46E5' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-black mb-4 flex items-center gap-2">
          <AlertTriangle className="text-amber-500" size={20} />
          待优化菜品 (取消较多)
        </h3>
        <div className="space-y-3">
          {mostCancelled.length > 0 ? mostCancelled.map(([name, count]: any) => (
            <div key={name} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
              <span className="font-bold">{name}</span>
              <span className="bg-red-50 text-red-600 px-2 py-1 rounded-lg text-xs font-bold">取消 {count} 次</span>
            </div>
          )) : (
            <p className="text-gray-400 text-sm italic">暂无频繁取消的计划</p>
          )}
        </div>
      </Card>
    </PageContainer>
  );
};
