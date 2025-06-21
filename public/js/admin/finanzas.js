/**
 * Gestión Financiera
 * Manejo de transacciones, presupuestos y reportes financieros
 */

import storage from '../storage.js';
import supabaseClient from '../supabase-client.js';
import utils from '../utils.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    if (!storage.get('adminLoggedIn')) {
        window.location.href = 'login.html';
        return;
    }

    // Initialize Supabase client
    const supabase = await supabaseClient.init();
    
    // Initialize tab functionality
    initTabs();
    
    // Load financial dashboard
    await loadFinancialDashboard();
    
    // Set up form submissions
    const transactionForm = document.getElementById('transactionForm');
    if (transactionForm) {
        transactionForm.addEventListener('submit', handleTransactionSubmit);
    }
    
    const budgetForm = document.getElementById('budgetForm');
    if (budgetForm) {
        budgetForm.addEventListener('submit', handleBudgetSubmit);
    }
    
    // Set up transaction filters
    document.getElementById('filterTransactionType')?.addEventListener('change', loadTransactions);
    document.getElementById('filterTransactionCategory')?.addEventListener('change', loadTransactions);
    document.getElementById('filterTransactionMonth')?.addEventListener('change', loadTransactions);
    document.getElementById('clearTransactionFiltersBtn')?.addEventListener('click', clearTransactionFilters);
    
    // Set up report generation
    document.getElementById('generateMonthlyReportBtn')?.addEventListener('click', () => generateReport('monthly'));
    document.getElementById('generateCategoryReportBtn')?.addEventListener('click', () => generateReport('category'));
    document.getElementById('generateBudgetReportBtn')?.addEventListener('click', () => generateReport('budget'));
    document.getElementById('generateCustomReportBtn')?.addEventListener('click', () => generateCustomReport());
    
    // Set up export buttons
    document.getElementById('exportReportPDFBtn')?.addEventListener('click', exportReportToPDF);
    document.getElementById('exportReportCSVBtn')?.addEventListener('click', exportReportToExcel);
    document.getElementById('exportTransactionsBtn')?.addEventListener('click', exportTransactions);
    
    // Load transaction categories
    loadTransactionCategories();
    
    // Load transactions
    loadTransactions();
    
    // Load budgets
    loadBudgets();
});

// Initialize tab functionality
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;
            
            // Update active tab button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Show target tab panel
            tabContents.forEach(panel => {
                panel.classList.remove('active');
                if (panel.id === targetTab) {
                    panel.classList.add('active');
                }
            });
        });
    });
}

// Load financial dashboard
async function loadFinancialDashboard() {
    try {
        // Get financial data
        let transactions = [];
        let budgets = [];
        
        const supabase = await supabaseClient.init();
        
        if (supabase) {
            // Get transactions from Supabase
            const { data: transactionsData, error: transactionsError } = await supabase
                .from('transactions')
                .select('*')
                .order('date', { ascending: false });
                
            if (transactionsError) throw transactionsError;
            transactions = transactionsData;
            
            // Get budgets from Supabase
            const { data: budgetsData, error: budgetsError } = await supabase
                .from('budgets')
                .select('*');
                
            if (budgetsError) throw budgetsError;
            budgets = budgetsData;
        } else {
            // Fallback to localStorage
            transactions = storage.get('transactions') || [];
            budgets = storage.get('budgets') || [];
        }
        
        // Calculate financial metrics
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        // Filter transactions for current month
        const currentMonthTransactions = transactions.filter(transaction => {
            const transactionDate = new Date(transaction.date);
            return transactionDate.getMonth() === currentMonth && 
                   transactionDate.getFullYear() === currentYear;
        });
        
        // Calculate income, expenses and balance
        const totalIncome = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);
            
        const totalExpenses = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);
            
        const totalBalance = totalIncome - totalExpenses;
        
        const monthlyIncome = currentMonthTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);
            
        const monthlyExpenses = currentMonthTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        
        // Calculate budget metrics
        const totalBudget = budgets.reduce((sum, b) => sum + parseFloat(b.amount), 0);
        const remainingBudget = totalBudget - monthlyExpenses;
        const budgetPercentage = totalBudget > 0 ? (remainingBudget / totalBudget) * 100 : 0;
        
        // Update dashboard metrics
        const totalBalanceElement = document.getElementById('totalBalance');
        if (totalBalanceElement) {
            totalBalanceElement.textContent = utils.formatCurrency(totalBalance);
        }
        
        const monthlyIncomeElement = document.getElementById('monthlyIncome');
        if (monthlyIncomeElement) {
            monthlyIncomeElement.textContent = utils.formatCurrency(monthlyIncome);
        }
        
        const monthlyExpensesElement = document.getElementById('monthlyExpenses');
        if (monthlyExpensesElement) {
            monthlyExpensesElement.textContent = utils.formatCurrency(monthlyExpenses);
        }
        
        const remainingBudgetElement = document.getElementById('remainingBudget');
        if (remainingBudgetElement) {
            remainingBudgetElement.textContent = utils.formatCurrency(remainingBudget);
        }
        
        // Update trends
        const balanceTrend = document.getElementById('balanceTrend');
        if (balanceTrend) {
            if (totalBalance > 0) {
                balanceTrend.textContent = '↗ Positivo';
                balanceTrend.className = 'trend positive';
            } else if (totalBalance < 0) {
                balanceTrend.textContent = '↘ Negativo';
                balanceTrend.className = 'trend negative';
            } else {
                balanceTrend.textContent = '→ Equilibrado';
                balanceTrend.className = 'trend neutral';
            }
        }
        
        const incomeTrend = document.getElementById('incomeTrend');
        if (incomeTrend) {
            incomeTrend.textContent = `↗ ${monthlyIncome > 0 ? '+' : ''}${utils.formatCurrency(monthlyIncome)}`;
            incomeTrend.className = 'trend positive';
        }
        
        const expensesTrend = document.getElementById('expensesTrend');
        if (expensesTrend) {
            expensesTrend.textContent = `${monthlyExpenses > 0 ? '↘' : '→'} ${utils.formatCurrency(monthlyExpenses)}`;
            expensesTrend.className = monthlyExpenses > 0 ? 'trend negative' : 'trend neutral';
        }
        
        const budgetTrend = document.getElementById('budgetTrend');
        if (budgetTrend) {
            budgetTrend.textContent = `${budgetPercentage.toFixed(0)}% disponible`;
            
            if (budgetPercentage > 50) {
                budgetTrend.className = 'trend positive';
            } else if (budgetPercentage > 20) {
                budgetTrend.className = 'trend neutral';
            } else {
                budgetTrend.className = 'trend negative';
            }
        }
        
        // Update balance status
        const balanceStatus = document.getElementById('balanceStatus');
        if (balanceStatus) {
            if (totalBalance > 0) {
                balanceStatus.textContent = 'Positivo';
                balanceStatus.className = 'status-badge active';
            } else if (totalBalance < 0) {
                balanceStatus.textContent = 'Negativo';
                balanceStatus.className = 'status-badge pending';
            } else {
                balanceStatus.textContent = 'Equilibrado';
                balanceStatus.className = 'status-badge';
            }
        } else {
            console.warn('Elemento con ID "balanceStatus" no encontrado');
        }
        
        // Create financial chart
        createFinancialChart(transactions);
        
    } catch (error) {
        console.error('Error loading financial dashboard:', error);
        utils.showAlert(`Error al cargar dashboard financiero: ${error.message}`, 'error');
    }
}

// Create financial chart
function createFinancialChart(transactions) {
    try {
        const canvas = document.getElementById('financeChart');
        if (!canvas) {
            console.warn('Canvas element not found for financial chart');
            return;
        }
        
        // Get last 6 months of data
        const now = new Date();
        const months = [];
        const incomeData = [];
        const expenseData = [];
        
        for (let i = 5; i >= 0; i--) {
            const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthName = month.toLocaleDateString('es-ES', { month: 'short' });
            months.push(monthName);
            
            const monthTransactions = transactions.filter(transaction => {
                const transactionDate = new Date(transaction.date);
                return transactionDate.getMonth() === month.getMonth() && 
                       transactionDate.getFullYear() === month.getFullYear();
            });
            
            const monthlyIncome = monthTransactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + parseFloat(t.amount), 0);
                
            const monthlyExpense = monthTransactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + parseFloat(t.amount), 0);
                
            incomeData.push(monthlyIncome);
            expenseData.push(monthlyExpense);
        }
        
        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.error('Chart.js is not loaded');
            return;
        }
        
        // Check if we need to destroy an existing chart
        if (window.financeChart && typeof window.financeChart.destroy === 'function') {
            window.financeChart.destroy();
        }
        
        // Create new chart
        const ctx = canvas.getContext('2d');
        window.financeChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [
                    {
                        label: 'Ingresos',
                        data: incomeData,
                        backgroundColor: 'rgba(40, 167, 69, 0.5)',
                        borderColor: 'rgba(40, 167, 69, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Gastos',
                        data: expenseData,
                        backgroundColor: 'rgba(220, 53, 69, 0.5)',
                        borderColor: 'rgba(220, 53, 69, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return utils.formatCurrency(value);
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + utils.formatCurrency(context.raw);
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error creating financial chart:', error);
    }
}

// Load transaction categories
function loadTransactionCategories() {
    const incomeCategories = [
        'cuotas', 'donaciones', 'eventos', 'ventas', 'subsidios', 'otros-ingresos'
    ];
    
    const expenseCategories = [
        'actividades', 'equipamiento', 'transporte', 'alimentacion', 'materiales', 
        'mantenimiento', 'servicios', 'administrativos', 'capacitacion', 'otros-gastos'
    ];
    
    const categorySelect = document.getElementById('transactionCategory');
    const filterCategorySelect = document.getElementById('filterTransactionCategory');
    
    if (categorySelect) {
        categorySelect.innerHTML = '<option value="">Seleccionar categoría</option>';
        
        const transactionType = document.getElementById('transactionType').value;
        
        const categories = transactionType === 'income' ? incomeCategories : expenseCategories;
        
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = formatCategoryName(category);
            categorySelect.appendChild(option);
        });
    }
    
    if (filterCategorySelect) {
        filterCategorySelect.innerHTML = '<option value="">Todas las categorías</option>';
        
        // Add income categories
        const incomeOptgroup = document.createElement('optgroup');
        incomeOptgroup.label = 'Ingresos';
        
        incomeCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = formatCategoryName(category);
            incomeOptgroup.appendChild(option);
        });
        
        filterCategorySelect.appendChild(incomeOptgroup);
        
        // Add expense categories
        const expenseOptgroup = document.createElement('optgroup');
        expenseOptgroup.label = 'Gastos';
        
        expenseCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = formatCategoryName(category);
            expenseOptgroup.appendChild(option);
        });
        
        filterCategorySelect.appendChild(expenseOptgroup);
    }
    
    // Update categories when transaction type changes
    document.getElementById('transactionType')?.addEventListener('change', loadTransactionCategories);
}

// Format category name
function formatCategoryName(category) {
    const categoryNames = {
        'cuotas': 'Cuotas Mensuales',
        'donaciones': 'Donaciones',
        'eventos': 'Eventos',
        'ventas': 'Ventas',
        'subsidios': 'Subsidios',
        'otros-ingresos': 'Otros Ingresos',
        'actividades': 'Actividades',
        'equipamiento': 'Equipamiento',
        'transporte': 'Transporte',
        'alimentacion': 'Alimentación',
        'materiales': 'Materiales',
        'mantenimiento': 'Mantenimiento',
        'servicios': 'Servicios',
        'administrativos': 'Administrativos',
        'capacitacion': 'Capacitación',
        'otros-gastos': 'Otros Gastos'
    };
    
    return categoryNames[category] || category.replace('-', ' ');
}

// Handle transaction form submission
async function handleTransactionSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    
    const transaction = {
        type: formData.get('type'),
        category: formData.get('category'),
        amount: parseFloat(formData.get('amount')),
        description: formData.get('description'),
        date: formData.get('date'),
        notes: formData.get('notes') || null,
        created_at: new Date().toISOString()
    };
    
    try {
        const supabase = await supabaseClient.init();
        
        if (supabase) {
            // Save to Supabase
            const { data, error } = await supabase
                .from('transactions')
                .insert([transaction])
                .select();
                
            if (error) throw error;
            
            utils.showAlert('Transacción registrada exitosamente en la base de datos', 'success');
        } else {
            // Fallback to localStorage
            const transactions = storage.get('transactions') || [];
            transaction.id = Date.now().toString();
            transactions.push(transaction);
            storage.set('transactions', transactions);
            
            utils.showAlert('Transacción registrada exitosamente (almacenamiento local)', 'success');
        }
        
        // Reset form and reload data
        form.reset();
        await loadTransactions();
        await loadFinancialDashboard();
        
    } catch (error) {
        console.error('Error saving transaction:', error);
        utils.showAlert(`Error al registrar transacción: ${error.message}`, 'error');
    }
}

// Handle budget form submission
async function handleBudgetSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    
    const budget = {
        category: formData.get('category'),
        amount: parseFloat(formData.get('amount')),
        period: formData.get('period'),
        start_date: formData.get('startDate'),
        description: formData.get('description') || null,
        created_at: new Date().toISOString()
    };
    
    try {
        const supabase = await supabaseClient.init();
        
        if (supabase) {
            // Save to Supabase
            const { data, error } = await supabase
                .from('budgets')
                .insert([budget])
                .select();
                
            if (error) throw error;
            
            utils.showAlert('Presupuesto creado exitosamente en la base de datos', 'success');
        } else {
            // Fallback to localStorage
            const budgets = storage.get('budgets') || [];
            budget.id = Date.now().toString();
            budgets.push(budget);
            storage.set('budgets', budgets);
            
            utils.showAlert('Presupuesto creado exitosamente (almacenamiento local)', 'success');
        }
        
        // Reset form and reload data
        form.reset();
        await loadBudgets();
        await loadFinancialDashboard();
        
    } catch (error) {
        console.error('Error saving budget:', error);
        utils.showAlert(`Error al crear presupuesto: ${error.message}`, 'error');
    }
}

// Load transactions
async function loadTransactions() {
    const transactionHistory = document.getElementById('transactionHistory');
    if (!transactionHistory) return;
    
    try {
        // Show loading state
        transactionHistory.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>Cargando transacciones...</p>
            </div>
        `;
        
        // Get filter values
        const typeFilter = document.getElementById('filterTransactionType')?.value || '';
        const categoryFilter = document.getElementById('filterTransactionCategory')?.value || '';
        const monthFilter = document.getElementById('filterTransactionMonth')?.value || '';
        
        // Get transactions
        let transactions = [];
        
        const supabase = await supabaseClient.init();
        
        if (supabase) {
            // Query Supabase with filters
            let query = supabase.from('transactions').select('*');
            
            if (typeFilter) {
                query = query.eq('type', typeFilter);
            }
            
            if (categoryFilter) {
                query = query.eq('category', categoryFilter);
            }
            
            if (monthFilter) {
                const [year, month] = monthFilter.split('-');
                const startDate = `${year}-${month}-01`;
                const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];
                
                query = query.gte('date', startDate).lte('date', endDate);
            }
            
            const { data, error } = await query.order('date', { ascending: false });
            
            if (error) throw error;
            transactions = data;
        } else {
            // Fallback to localStorage
            transactions = storage.get('transactions') || [];
            
            // Apply filters
            transactions = transactions.filter(transaction => {
                const matchesType = !typeFilter || transaction.type === typeFilter;
                const matchesCategory = !categoryFilter || transaction.category === categoryFilter;
                
                let matchesMonth = true;
                if (monthFilter) {
                    const [year, month] = monthFilter.split('-');
                    const transactionDate = new Date(transaction.date);
                    matchesMonth = transactionDate.getFullYear() === parseInt(year) && 
                                   transactionDate.getMonth() + 1 === parseInt(month);
                }
                
                return matchesType && matchesCategory && matchesMonth;
            });
            
            // Sort by date (newest first)
            transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        }
        
        // Group transactions by month
        const groupedTransactions = {};
        
        transactions.forEach(transaction => {
            const date = new Date(transaction.date);
            const monthYear = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
            
            if (!groupedTransactions[monthYear]) {
                groupedTransactions[monthYear] = [];
            }
            
            groupedTransactions[monthYear].push(transaction);
        });
        
        // Render transactions
        if (Object.keys(groupedTransactions).length === 0) {
            transactionHistory.innerHTML = `
                <p class="no-content">No hay transacciones que coincidan con los filtros seleccionados</p>
            `;
            return;
        }
        
        let html = '';
        
        for (const [month, monthTransactions] of Object.entries(groupedTransactions)) {
            html += `
                <div class="month-group">
                    <h4 class="month-header">${month}</h4>
                    <div class="transactions-list">
            `;
            
            monthTransactions.forEach(transaction => {
                html += `
                    <div class="transaction-card ${transaction.type}">
                        <div class="transaction-info">
                            <h4>${transaction.description}</h4>
                            <p class="transaction-meta">
                                ${utils.formatDate(transaction.date)} - ${formatCategoryName(transaction.category)}
                            </p>
                            <p class="transaction-amount ${transaction.type}">
                                ${utils.formatCurrency(transaction.amount)}
                            </p>
                            ${transaction.notes ? `<p class="transaction-notes">${transaction.notes}</p>` : ''}
                        </div>
                        <div class="transaction-actions">
                            <button class="btn btn-secondary btn-sm" onclick="editTransaction('${transaction.id}')">Editar</button>
                            <button class="btn btn-secondary btn-sm" onclick="deleteTransaction('${transaction.id}')">Eliminar</button>
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
        
        transactionHistory.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading transactions:', error);
        transactionHistory.innerHTML = `
            <div class="alert alert-error">
                <p>Error al cargar transacciones: ${error.message}</p>
            </div>
        `;
    }
}

// Load budgets
async function loadBudgets() {
    const budgetsList = document.getElementById('budgetsList');
    if (!budgetsList) return;
    
    try {
        // Show loading state
        budgetsList.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>Cargando presupuestos...</p>
            </div>
        `;
        
        // Get budgets and transactions
        let budgets = [];
        let transactions = [];
        
        const supabase = await supabaseClient.init();
        
        if (supabase) {
            // Get budgets from Supabase
            const { data: budgetsData, error: budgetsError } = await supabase
                .from('budgets')
                .select('*')
                .order('created_at', { ascending: false });
                
            if (budgetsError) throw budgetsError;
            budgets = budgetsData;
            
            // Get transactions from Supabase
            const { data: transactionsData, error: transactionsError } = await supabase
                .from('transactions')
                .select('*');
                
            if (transactionsError) throw transactionsError;
            transactions = transactionsData;
        } else {
            // Fallback to localStorage
            budgets = storage.get('budgets') || [];
            transactions = storage.get('transactions') || [];
        }
        
        // Render budgets
        if (budgets.length === 0) {
            budgetsList.innerHTML = `
                <p class="no-content">No hay presupuestos definidos</p>
            `;
            return;
        }
        
        let html = '';
        
        budgets.forEach(budget => {
            // Calculate spent amount for this budget
            const spentAmount = transactions
                .filter(t => t.type === 'expense' && t.category === budget.category)
                .reduce((sum, t) => sum + parseFloat(t.amount), 0);
                
            const remainingAmount = parseFloat(budget.amount) - spentAmount;
            const percentageUsed = (spentAmount / parseFloat(budget.amount)) * 100;
            const isOverBudget = remainingAmount < 0;
            
            html += `
                <div class="budget-item">
                    <div class="budget-header">
                        <h5>${formatCategoryName(budget.category)}</h5>
                        <span class="budget-amount">${utils.formatCurrency(budget.amount)}</span>
                    </div>
                    <div class="progress-container">
                        <div class="progress-bar">
                            <div class="progress-fill ${isOverBudget ? 'over-budget' : ''}" style="width: ${Math.min(percentageUsed, 100)}%"></div>
                        </div>
                    </div>
                    <div class="budget-details">
                        <span>Gastado: ${utils.formatCurrency(spentAmount)}</span>
                        <span class="${isOverBudget ? 'over-budget' : 'remaining'}">
                            ${isOverBudget ? 'Excedido: ' : 'Restante: '}
                            ${utils.formatCurrency(Math.abs(remainingAmount))}
                        </span>
                    </div>
                    <div class="budget-meta">
                        <span>Período: ${formatPeriod(budget.period)}</span>
                        <span>Desde: ${utils.formatDate(budget.start_date)}</span>
                    </div>
                    <div class="budget-actions">
                        <button class="btn btn-secondary btn-sm" onclick="editBudget('${budget.id}')">Editar</button>
                        <button class="btn btn-secondary btn-sm" onclick="deleteBudget('${budget.id}')">Eliminar</button>
                    </div>
                </div>
            `;
        });
        
        budgetsList.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading budgets:', error);
        budgetsList.innerHTML = `
            <div class="alert alert-error">
                <p>Error al cargar presupuestos: ${error.message}</p>
            </div>
        `;
    }
}

// Format period
function formatPeriod(period) {
    const periodNames = {
        'monthly': 'Mensual',
        'quarterly': 'Trimestral',
        'yearly': 'Anual'
    };
    
    return periodNames[period] || period;
}

// Clear transaction filters
function clearTransactionFilters() {
    const typeFilter = document.getElementById('filterTransactionType');
    const categoryFilter = document.getElementById('filterTransactionCategory');
    const monthFilter = document.getElementById('filterTransactionMonth');
    
    if (typeFilter) typeFilter.value = '';
    if (categoryFilter) categoryFilter.value = '';
    if (monthFilter) monthFilter.value = '';
    
    loadTransactions();
}

// Generate report
async function generateReport(type) {
    const reportContainer = document.getElementById('reportContainer');
    const reportActions = document.getElementById('reportActions');
    
    if (!reportContainer) return;
    
    try {
        // Show loading state
        reportContainer.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>Generando reporte...</p>
            </div>
        `;
        
        // Get transactions and budgets
        let transactions = [];
        let budgets = [];
        
        const supabase = await supabaseClient.init();
        
        if (supabase) {
            // Get transactions from Supabase
            const { data: transactionsData, error: transactionsError } = await supabase
                .from('transactions')
                .select('*')
                .order('date', { ascending: false });
                
            if (transactionsError) throw transactionsError;
            transactions = transactionsData;
            
            // Get budgets from Supabase
            const { data: budgetsData, error: budgetsError } = await supabase
                .from('budgets')
                .select('*');
                
            if (budgetsError) throw budgetsError;
            budgets = budgetsData;
        } else {
            // Fallback to localStorage
            transactions = storage.get('transactions') || [];
            budgets = storage.get('budgets') || [];
        }
        
        // Generate report based on type
        let reportHTML = '';
        
        switch (type) {
            case 'monthly':
                reportHTML = generateMonthlyReport(transactions);
                break;
            case 'category':
                reportHTML = generateCategoryReport(transactions);
                break;
            case 'budget':
                reportHTML = generateBudgetReport(transactions, budgets);
                break;
            default:
                throw new Error('Tipo de reporte no válido');
        }
        
        reportContainer.innerHTML = reportHTML;
        
        // Show export actions
        if (reportActions) {
            reportActions.style.display = 'flex';
        }
        
    } catch (error) {
        console.error('Error generating report:', error);
        reportContainer.innerHTML = `
            <div class="alert alert-error">
                <p>Error al generar reporte: ${error.message}</p>
            </div>
        `;
        
        // Hide export actions
        if (reportActions) {
            reportActions.style.display = 'none';
        }
    }
}

// Generate custom report
async function generateCustomReport() {
    const startDate = document.getElementById('customStartDate')?.value;
    const endDate = document.getElementById('customEndDate')?.value;
    
    if (!startDate || !endDate) {
        utils.showAlert('Por favor seleccione fechas de inicio y fin', 'error');
        return;
    }
    
    const reportContainer = document.getElementById('reportContainer');
    const reportActions = document.getElementById('reportActions');
    
    if (!reportContainer) return;
    
    try {
        // Show loading state
        reportContainer.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>Generando reporte personalizado...</p>
            </div>
        `;
        
        // Get transactions
        let transactions = [];
        
        const supabase = await supabaseClient.init();
        
        if (supabase) {
            // Get transactions from Supabase
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .gte('date', startDate)
                .lte('date', endDate)
                .order('date', { ascending: false });
                
            if (error) throw error;
            transactions = data;
        } else {
            // Fallback to localStorage
            const allTransactions = storage.get('transactions') || [];
            
            // Filter by date range
            transactions = allTransactions.filter(transaction => {
                const transactionDate = transaction.date;
                return transactionDate >= startDate && transactionDate <= endDate;
            });
            
            // Sort by date (newest first)
            transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        }
        
        // Generate report
        const reportTitle = `Reporte Personalizado (${utils.formatDate(startDate)} - ${utils.formatDate(endDate)})`;
        
        const totalIncome = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);
            
        const totalExpenses = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);
            
        const balance = totalIncome - totalExpenses;
        
        let reportHTML = `
            <div class="report">
                <h4>${reportTitle}</h4>
                <div class="report-summary">
                    <p>Ingresos Totales: <span class="income">${utils.formatCurrency(totalIncome)}</span></p>
                    <p>Gastos Totales: <span class="expense">${utils.formatCurrency(totalExpenses)}</span></p>
                    <p>Balance: <span class="${balance >= 0 ? 'positive' : 'negative'}">${utils.formatCurrency(balance)}</span></p>
                </div>
                
                <h5>Transacciones en el Período</h5>
                <table class="monthly-breakdown">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Descripción</th>
                            <th>Categoría</th>
                            <th>Tipo</th>
                            <th>Monto</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        if (transactions.length === 0) {
            reportHTML += `
                <tr>
                    <td colspan="5" class="text-center">No hay transacciones en este período</td>
                </tr>
            `;
        } else {
            transactions.forEach(transaction => {
                reportHTML += `
                    <tr>
                        <td>${utils.formatDate(transaction.date)}</td>
                        <td>${transaction.description}</td>
                        <td>${formatCategoryName(transaction.category)}</td>
                        <td>${transaction.type === 'income' ? 'Ingreso' : 'Gasto'}</td>
                        <td class="${transaction.type}">${utils.formatCurrency(transaction.amount)}</td>
                    </tr>
                `;
            });
        }
        
        reportHTML += `
                    </tbody>
                </table>
            </div>
        `;
        
        reportContainer.innerHTML = reportHTML;
        
        // Show export actions
        if (reportActions) {
            reportActions.style.display = 'flex';
        }
        
    } catch (error) {
        console.error('Error generating custom report:', error);
        reportContainer.innerHTML = `
            <div class="alert alert-error">
                <p>Error al generar reporte personalizado: ${error.message}</p>
            </div>
        `;
        
        // Hide export actions
        if (reportActions) {
            reportActions.style.display = 'none';
        }
    }
}

// Generate monthly report
function generateMonthlyReport(transactions) {
    // Get current month and year
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Filter transactions for current month
    const monthTransactions = transactions.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        return transactionDate.getMonth() === currentMonth && 
               transactionDate.getFullYear() === currentYear;
    });
    
    // Calculate totals
    const totalIncome = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        
    const totalExpenses = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        
    const balance = totalIncome - totalExpenses;
    
    // Group transactions by category
    const incomeByCategory = {};
    const expensesByCategory = {};
    
    monthTransactions.forEach(transaction => {
        if (transaction.type === 'income') {
            if (!incomeByCategory[transaction.category]) {
                incomeByCategory[transaction.category] = 0;
            }
            incomeByCategory[transaction.category] += parseFloat(transaction.amount);
        } else {
            if (!expensesByCategory[transaction.category]) {
                expensesByCategory[transaction.category] = 0;
            }
            expensesByCategory[transaction.category] += parseFloat(transaction.amount);
        }
    });
    
    // Generate report HTML
    const monthName = now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    
    let reportHTML = `
        <div class="report">
            <h4>Reporte Mensual: ${monthName}</h4>
            <div class="report-summary">
                <p>Ingresos Totales: <span class="income">${utils.formatCurrency(totalIncome)}</span></p>
                <p>Gastos Totales: <span class="expense">${utils.formatCurrency(totalExpenses)}</span></p>
                <p>Balance: <span class="${balance >= 0 ? 'positive' : 'negative'}">${utils.formatCurrency(balance)}</span></p>
            </div>
            
            <h5>Desglose por Categoría</h5>
            <div class="category-section">
                <h6>Ingresos</h6>
                <div class="category-list">
    `;
    
    if (Object.keys(incomeByCategory).length === 0) {
        reportHTML += `<p class="no-content">No hay ingresos registrados este mes</p>`;
    } else {
        for (const [category, amount] of Object.entries(incomeByCategory)) {
            reportHTML += `
                <div class="category-item">
                    <span>${formatCategoryName(category)}</span>
                    <span class="income">${utils.formatCurrency(amount)}</span>
                </div>
            `;
        }
    }
    
    reportHTML += `
                </div>
            </div>
            
            <div class="category-section">
                <h6>Gastos</h6>
                <div class="category-list">
    `;
    
    if (Object.keys(expensesByCategory).length === 0) {
        reportHTML += `<p class="no-content">No hay gastos registrados este mes</p>`;
    } else {
        for (const [category, amount] of Object.entries(expensesByCategory)) {
            reportHTML += `
                <div class="category-item">
                    <span>${formatCategoryName(category)}</span>
                    <span class="expense">${utils.formatCurrency(amount)}</span>
                </div>
            `;
        }
    }
    
    reportHTML += `
                </div>
            </div>
            
            <h5>Transacciones del Mes</h5>
            <table class="monthly-breakdown">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Descripción</th>
                        <th>Categoría</th>
                        <th>Tipo</th>
                        <th>Monto</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    if (monthTransactions.length === 0) {
        reportHTML += `
            <tr>
                <td colspan="5" class="text-center">No hay transacciones este mes</td>
            </tr>
        `;
    } else {
        monthTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        monthTransactions.forEach(transaction => {
            reportHTML += `
                <tr>
                    <td>${utils.formatDate(transaction.date)}</td>
                    <td>${transaction.description}</td>
                    <td>${formatCategoryName(transaction.category)}</td>
                    <td>${transaction.type === 'income' ? 'Ingreso' : 'Gasto'}</td>
                    <td class="${transaction.type}">${utils.formatCurrency(transaction.amount)}</td>
                </tr>
            `;
        });
    }
    
    reportHTML += `
                </tbody>
            </table>
        </div>
    `;
    
    return reportHTML;
}

// Generate category report
function generateCategoryReport(transactions) {
    // Group transactions by category
    const categorySummary = {};
    
    transactions.forEach(transaction => {
        if (!categorySummary[transaction.category]) {
            categorySummary[transaction.category] = {
                income: 0,
                expense: 0,
                count: 0,
                firstDate: null,
                lastDate: null
            };
        }
        
        const amount = parseFloat(transaction.amount);
        
        if (transaction.type === 'income') {
            categorySummary[transaction.category].income += amount;
        } else {
            categorySummary[transaction.category].expense += amount;
        }
        
        categorySummary[transaction.category].count++;
        
        const transactionDate = new Date(transaction.date);
        
        if (!categorySummary[transaction.category].firstDate || 
            transactionDate < new Date(categorySummary[transaction.category].firstDate)) {
            categorySummary[transaction.category].firstDate = transaction.date;
        }
        
        if (!categorySummary[transaction.category].lastDate || 
            transactionDate > new Date(categorySummary[transaction.category].lastDate)) {
            categorySummary[transaction.category].lastDate = transaction.date;
        }
    });
    
    // Generate report HTML
    let reportHTML = `
        <div class="report">
            <h4>Reporte por Categorías</h4>
            
            <table class="monthly-breakdown">
                <thead>
                    <tr>
                        <th>Categoría</th>
                        <th>Ingresos</th>
                        <th>Gastos</th>
                        <th>Balance</th>
                        <th>Transacciones</th>
                        <th>Período</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    if (Object.keys(categorySummary).length === 0) {
        reportHTML += `
            <tr>
                <td colspan="6" class="text-center">No hay datos disponibles</td>
            </tr>
        `;
    } else {
        for (const [category, data] of Object.entries(categorySummary)) {
            const balance = data.income - data.expense;
            const period = data.firstDate && data.lastDate ? 
                `${utils.formatDate(data.firstDate)} - ${utils.formatDate(data.lastDate)}` : 
                'N/A';
            
            reportHTML += `
                <tr>
                    <td>${formatCategoryName(category)}</td>
                    <td class="income">${utils.formatCurrency(data.income)}</td>
                    <td class="expense">${utils.formatCurrency(data.expense)}</td>
                    <td class="${balance >= 0 ? 'positive' : 'negative'}">${utils.formatCurrency(balance)}</td>
                    <td>${data.count}</td>
                    <td>${period}</td>
                </tr>
            `;
        }
    }
    
    reportHTML += `
                </tbody>
            </table>
            
            <h5 class="mt-4">Análisis Detallado por Categoría</h5>
    `;
    
    for (const [category, data] of Object.entries(categorySummary)) {
        const balance = data.income - data.expense;
        
        reportHTML += `
            <div class="category-section">
                <h6>${formatCategoryName(category)}</h6>
                <div class="category-list">
                    <div class="category-item">
                        <span>Ingresos Totales:</span>
                        <span class="income">${utils.formatCurrency(data.income)}</span>
                    </div>
                    <div class="category-item">
                        <span>Gastos Totales:</span>
                        <span class="expense">${utils.formatCurrency(data.expense)}</span>
                    </div>
                    <div class="category-item">
                        <span>Balance:</span>
                        <span class="${balance >= 0 ? 'positive' : 'negative'}">${utils.formatCurrency(balance)}</span>
                    </div>
                    <div class="category-item">
                        <span>Número de Transacciones:</span>
                        <span>${data.count}</span>
                    </div>
                    <div class="category-item">
                        <span>Primera Transacción:</span>
                        <span>${data.firstDate ? utils.formatDate(data.firstDate) : 'N/A'}</span>
                    </div>
                    <div class="category-item">
                        <span>Última Transacción:</span>
                        <span>${data.lastDate ? utils.formatDate(data.lastDate) : 'N/A'}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    reportHTML += `</div>`;
    
    return reportHTML;
}

// Generate budget report
function generateBudgetReport(transactions, budgets) {
    if (budgets.length === 0) {
        return `
            <div class="report">
                <h4>Reporte de Presupuestos</h4>
                <p class="no-content">No hay presupuestos definidos</p>
            </div>
        `;
    }
    
    // Calculate budget compliance
    const budgetCompliance = {};
    
    budgets.forEach(budget => {
        const category = budget.category;
        const budgetAmount = parseFloat(budget.amount);
        
        // Calculate spent amount for this category
        const spentAmount = transactions
            .filter(t => t.type === 'expense' && t.category === category)
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);
            
        const remaining = budgetAmount - spentAmount;
        const percentageUsed = (spentAmount / budgetAmount) * 100;
        
        budgetCompliance[category] = {
            budgetAmount,
            spentAmount,
            remaining,
            overBudget: remaining < 0,
            percentageUsed
        };
    });
    
    // Generate report HTML
    let reportHTML = `
        <div class="report">
            <h4>Reporte de Presupuestos</h4>
            
            <table class="monthly-breakdown">
                <thead>
                    <tr>
                        <th>Categoría</th>
                        <th>Presupuesto</th>
                        <th>Gastado</th>
                        <th>Restante</th>
                        <th>% Utilizado</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    for (const [category, data] of Object.entries(budgetCompliance)) {
        reportHTML += `
            <tr>
                <td>${formatCategoryName(category)}</td>
                <td>${utils.formatCurrency(data.budgetAmount)}</td>
                <td class="expense">${utils.formatCurrency(data.spentAmount)}</td>
                <td class="${data.overBudget ? 'negative' : 'positive'}">
                    ${data.overBudget ? '-' : ''}${utils.formatCurrency(Math.abs(data.remaining))}
                </td>
                <td>${data.percentageUsed.toFixed(1)}%</td>
                <td>
                    <span class="status-indicator ${data.overBudget ? 'incomplete' : 'complete'}">
                        ${data.overBudget ? 'Excedido' : 'Dentro del límite'}
                    </span>
                </td>
            </tr>
        `;
    }
    
    reportHTML += `
                </tbody>
            </table>
            
            <h5 class="mt-4">Detalles de Presupuestos</h5>
    `;
    
    budgets.forEach(budget => {
        const compliance = budgetCompliance[budget.category];
        
        reportHTML += `
            <div class="budget-item">
                <div class="budget-header">
                    <h5>${formatCategoryName(budget.category)}</h5>
                    <span class="budget-amount">${utils.formatCurrency(budget.amount)}</span>
                </div>
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill ${compliance.overBudget ? 'over-budget' : ''}" 
                             style="width: ${Math.min(compliance.percentageUsed, 100)}%"></div>
                    </div>
                </div>
                <div class="budget-details">
                    <span>Gastado: ${utils.formatCurrency(compliance.spentAmount)}</span>
                    <span class="${compliance.overBudget ? 'over-budget' : 'remaining'}">
                        ${compliance.overBudget ? 'Excedido: ' : 'Restante: '}
                        ${utils.formatCurrency(Math.abs(compliance.remaining))}
                    </span>
                </div>
                <div class="budget-meta">
                    <span>Período: ${formatPeriod(budget.period)}</span>
                    <span>Desde: ${utils.formatDate(budget.start_date)}</span>
                </div>
            </div>
        `;
    });
    
    reportHTML += `</div>`;
    
    return reportHTML;
}

// Export report to PDF
function exportReportToPDF() {
    try {
        // Check if jspdf is available
        if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
            utils.showAlert('Error: jsPDF no está disponible', 'error');
            return;
        }
        
        const jsPDF = window.jspdf.jsPDF;
        // Removed incorrect destructuring of autoTable
        
        // Create PDF document
        const doc = new jsPDF();
        
        // Add title
        doc.setFontSize(18);
        doc.text('Reporte Financiero - Grupo Scout', 14, 22);
        
        // Add date
        doc.setFontSize(11);
        doc.text(`Generado el ${new Date().toLocaleDateString('es-ES')}`, 14, 30);
        
        // Get report content
        const reportContainer = document.getElementById('reportContainer');
        if (!reportContainer) return;
        
        // Extract tables from report
        const tables = reportContainer.querySelectorAll('table');
        let yPos = 40;
        
        tables.forEach((table, index) => {
            // Add section title
            const sectionTitle = table.previousElementSibling?.tagName === 'H5' ? 
                table.previousElementSibling.textContent : 
                `Tabla ${index + 1}`;
                
            doc.setFontSize(14);
            doc.text(sectionTitle, 14, yPos);
            yPos += 10;
            
            // Use doc.autoTable instead of autoTable(doc, ...)
            doc.autoTable({ 
                html: table,
                startY: yPos,
                styles: { fontSize: 9 },
                columnStyles: { 
                    4: { halign: 'right' } // Align amount column to right
                },
                didDrawPage: (data) => {
                    // Update yPos for next table
                    yPos = data.cursor.y + 15;
                }
            });
        });
        
        // Add summary information
        const summaryElements = reportContainer.querySelectorAll('.report-summary p');
        if (summaryElements.length > 0) {
            doc.setFontSize(14);
            doc.text('Resumen', 14, yPos);
            yPos += 10;
            
            doc.setFontSize(11);
            summaryElements.forEach(element => {
                const text = element.textContent.replace(/\s+/g, ' ').trim();
                doc.text(text, 14, yPos);
                yPos += 7;
            });
        }
        
        // Add footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(10);
            doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width / 2, 
                     doc.internal.pageSize.height - 10, { align: 'center' });
            doc.text('Grupo Scout - Sistema de Gestión', 14, 
                     doc.internal.pageSize.height - 10);
        }
        
        // Save PDF
        doc.save(`Reporte_Financiero_${new Date().toISOString().split('T')[0]}.pdf`);
        
        utils.showAlert('Reporte exportado a PDF exitosamente', 'success');
    } catch (error) {
        console.error('Error exporting to PDF:', error);
        utils.showAlert(`Error al exportar a PDF: ${error.message}`, 'error');
    }
}

// Export report to Excel
function exportReportToExcel() {
    try {
        // Check if ExcelJS is available
        if (typeof ExcelJS === 'undefined') {
            utils.showAlert('Error: ExcelJS no está disponible', 'error');
            return;
        }
        
        // Create workbook
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Grupo Scout';
        workbook.lastModifiedBy = 'Sistema de Gestión';
        workbook.created = new Date();
        workbook.modified = new Date();
        
        // Add worksheet
        const worksheet = workbook.addWorksheet('Reporte Financiero');
        
        // Add title
        worksheet.mergeCells('A1:F1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = 'Reporte Financiero - Grupo Scout';
        titleCell.font = {
            size: 16,
            bold: true
        };
        titleCell.alignment = { horizontal: 'center' };
        
        // Add date
        worksheet.mergeCells('A2:F2');
        const dateCell = worksheet.getCell('A2');
        dateCell.value = `Generado el ${new Date().toLocaleDateString('es-ES')}`;
        dateCell.font = {
            size: 12,
            italic: true
        };
        dateCell.alignment = { horizontal: 'center' };
        
        // Get report content
        const reportContainer = document.getElementById('reportContainer');
        if (!reportContainer) return;
        
        // Extract tables from report
        const tables = reportContainer.querySelectorAll('table');
        let rowIndex = 4;
        
        tables.forEach((table, tableIndex) => {
            // Add section title
            const sectionTitle = table.previousElementSibling?.tagName === 'H5' ? 
                table.previousElementSibling.textContent : 
                `Tabla ${tableIndex + 1}`;
                
            const titleRow = worksheet.getRow(rowIndex);
            titleRow.getCell(1).value = sectionTitle;
            titleRow.getCell(1).font = {
                size: 14,
                bold: true
            };
            rowIndex += 2;
            
            // Get table headers
            const headerRow = table.querySelector('thead tr');
            const headers = Array.from(headerRow.querySelectorAll('th')).map(th => th.textContent.trim());
            
            // Add headers to worksheet
            const excelHeaderRow = worksheet.getRow(rowIndex);
            headers.forEach((header, index) => {
                const cell = excelHeaderRow.getCell(index + 1);
                cell.value = header;
                cell.font = {
                    bold: true
                };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: '2A6E3F' },
                    bgColor: { argb: '2A6E3F' }
                };
                cell.font = {
                    color: { argb: 'FFFFFF' },
                    bold: true
                };
            });
            rowIndex++;
            
            // Get table rows
            const rows = Array.from(table.querySelectorAll('tbody tr'));
            
            // Add rows to worksheet
            rows.forEach(row => {
                const cells = Array.from(row.querySelectorAll('td')).map(td => td.textContent.trim());
                const excelRow = worksheet.getRow(rowIndex);
                
                cells.forEach((cell, index) => {
                    excelRow.getCell(index + 1).value = cell;
                    
                    // Apply formatting for currency cells
                    if (cell.includes('$')) {
                        excelRow.getCell(index + 1).numFmt = '$#,##0';
                        
                        // Apply color based on income/expense
                        if (row.querySelector(`td:nth-child(${index + 1})`).classList.contains('income')) {
                            excelRow.getCell(index + 1).font = {
                                color: { argb: '28A745' }
                            };
                        } else if (row.querySelector(`td:nth-child(${index + 1})`).classList.contains('expense')) {
                            excelRow.getCell(index + 1).font = {
                                color: { argb: 'DC3545' }
                            };
                        }
                    }
                });
                
                rowIndex++;
            });
            
            rowIndex += 2; // Add space between tables
        });
        
        // Add summary information
        const summaryElements = reportContainer.querySelectorAll('.report-summary p');
        if (summaryElements.length > 0) {
            const summaryTitleRow = worksheet.getRow(rowIndex);
            summaryTitleRow.getCell(1).value = 'Resumen';
            summaryTitleRow.getCell(1).font = {
                size: 14,
                bold: true
            };
            rowIndex += 1;
            
            summaryElements.forEach(element => {
                const text = element.textContent.replace(/\s+/g, ' ').trim();
                const summaryRow = worksheet.getRow(rowIndex);
                summaryRow.getCell(1).value = text;
                rowIndex += 1;
            });
        }
        
        // Auto-fit columns
        worksheet.columns.forEach(column => {
            let maxLength = 0;
            column.eachCell({ includeEmpty: true }, cell => {
                const columnLength = cell.value ? cell.value.toString().length : 10;
                if (columnLength > maxLength) {
                    maxLength = columnLength;
                }
            });
            column.width = maxLength < 10 ? 10 : maxLength + 2;
        });
        
        // Generate Excel file
        workbook.xlsx.writeBuffer().then(buffer => {
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Reporte_Financiero_${new Date().toISOString().split('T')[0]}.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
        });
        
        utils.showAlert('Reporte exportado a Excel exitosamente', 'success');
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        utils.showAlert(`Error al exportar a Excel: ${error.message}`, 'error');
    }
}

// Export transactions
async function exportTransactions() {
    try {
        // Get transactions
        let transactions = [];
        
        const supabase = await supabaseClient.init();
        
        if (supabase) {
            // Get transactions from Supabase
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .order('date', { ascending: false });
                
            if (error) throw error;
            transactions = data;
        } else {
            // Fallback to localStorage
            transactions = storage.get('transactions') || [];
            
            // Sort by date (newest first)
            transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        }
        
        if (transactions.length === 0) {
            utils.showAlert('No hay transacciones para exportar', 'warning');
            return;
        }
        
        // Create workbook
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Grupo Scout';
        workbook.lastModifiedBy = 'Sistema de Gestión';
        workbook.created = new Date();
        workbook.modified = new Date();
        
        // Add worksheet
        const worksheet = workbook.addWorksheet('Transacciones');
        
        // Add headers
        worksheet.columns = [
            { header: 'Fecha', key: 'date', width: 15 },
            { header: 'Tipo', key: 'type', width: 10 },
            { header: 'Categoría', key: 'category', width: 20 },
            { header: 'Descripción', key: 'description', width: 30 },
            { header: 'Monto', key: 'amount', width: 15 },
            { header: 'Notas', key: 'notes', width: 30 }
        ];
        
        // Style header row
        worksheet.getRow(1).font = {
            bold: true,
            color: { argb: 'FFFFFF' }
        };
        
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '2A6E3F' }
        };
        
        // Add data rows
        transactions.forEach(transaction => {
            worksheet.addRow({
                date: new Date(transaction.date),
                type: transaction.type === 'income' ? 'Ingreso' : 'Gasto',
                category: formatCategoryName(transaction.category),
                description: transaction.description,
                amount: parseFloat(transaction.amount),
                notes: transaction.notes || ''
            });
        });
        
        // Format date column
        worksheet.getColumn('date').numFmt = 'dd/mm/yyyy';
        
        // Format amount column
        worksheet.getColumn('amount').numFmt = '$#,##0';
        
        // Apply conditional formatting for amount column
        worksheet.eachRow((row, rowIndex) => {
            if (rowIndex > 1) { // Skip header row
                const typeCell = row.getCell('type');
                const amountCell = row.getCell('amount');
                
                if (typeCell.value === 'Ingreso') {
                    amountCell.font = {
                        color: { argb: '28A745' }
                    };
                } else {
                    amountCell.font = {
                        color: { argb: 'DC3545' }
                    };
                }
            }
        });
        
        // Generate Excel file
        workbook.xlsx.writeBuffer().then(buffer => {
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Transacciones_${new Date().toISOString().split('T')[0]}.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
        });
        
        utils.showAlert('Transacciones exportadas exitosamente', 'success');
    } catch (error) {
        console.error('Error exporting transactions:', error);
        utils.showAlert(`Error al exportar transacciones: ${error.message}`, 'error');
    }
}

// Edit transaction
window.editTransaction = async function(id) {
    try {
        // Get transaction data
        let transaction;
        
        const supabase = await supabaseClient.init();
        
        if (supabase) {
            // Get transaction from Supabase
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('id', id)
                .single();
                
            if (error) throw error;
            transaction = data;
        } else {
            // Fallback to localStorage
            const transactions = storage.get('transactions') || [];
            transaction = transactions.find(t => t.id === id);
            
            if (!transaction) {
                throw new Error('Transacción no encontrada');
            }
        }
        
        // Populate form
        const form = document.getElementById('transactionForm');
        
        form.elements.type.value = transaction.type;
        
        // Load categories based on type
        loadTransactionCategories();
        
        // Set timeout to ensure categories are loaded
        setTimeout(() => {
            form.elements.category.value = transaction.category;
            form.elements.amount.value = transaction.amount;
            form.elements.description.value = transaction.description;
            form.elements.date.value = transaction.date;
            form.elements.notes.value = transaction.notes || '';
            
            // Add transaction ID to form
            form.dataset.transactionId = id;
            
            // Change submit button text
            const submitButton = form.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.textContent = 'Actualizar Transacción';
            }
            
            // Scroll to form
            form.scrollIntoView({ behavior: 'smooth' });
        }, 100);
        
    } catch (error) {
        console.error('Error loading transaction for edit:', error);
        utils.showAlert(`Error al cargar transacción: ${error.message}`, 'error');
    }
};

// Delete transaction
window.deleteTransaction = async function(id) {
    if (!confirm('¿Está seguro de que desea eliminar esta transacción? Esta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        const supabase = await supabaseClient.init();
        
        if (supabase) {
            // Delete from Supabase
            const { error } = await supabase
                .from('transactions')
                .delete()
                .eq('id', id);
                
            if (error) throw error;
            
            utils.showAlert('Transacción eliminada exitosamente de la base de datos', 'success');
        } else {
            // Fallback to localStorage
            const transactions = storage.get('transactions') || [];
            const updatedTransactions = transactions.filter(t => t.id !== id);
            
            if (transactions.length === updatedTransactions.length) {
                throw new Error('Transacción no encontrada');
            }
            
            storage.set('transactions', updatedTransactions);
            
            utils.showAlert('Transacción eliminada exitosamente (almacenamiento local)', 'success');
        }
        
        // Reload data
        await loadTransactions();
        await loadFinancialDashboard();
        
    } catch (error) {
        console.error('Error deleting transaction:', error);
        utils.showAlert(`Error al eliminar transacción: ${error.message}`, 'error');
    }
};

// Edit budget
window.editBudget = async function(id) {
    try {
        // Get budget data
        let budget;
        
        const supabase = await supabaseClient.init();
        
        if (supabase) {
            // Get budget from Supabase
            const { data, error } = await supabase
                .from('budgets')
                .select('*')
                .eq('id', id)
                .single();
                
            if (error) throw error;
            budget = data;
        } else {
            // Fallback to localStorage
            const budgets = storage.get('budgets') || [];
            budget = budgets.find(b => b.id === id);
            
            if (!budget) {
                throw new Error('Presupuesto no encontrado');
            }
        }
        
        // Populate form
        const form = document.getElementById('budgetForm');
        
        form.elements.category.value = budget.category;
        form.elements.amount.value = budget.amount;
        form.elements.period.value = budget.period;
        form.elements.startDate.value = budget.start_date;
        form.elements.description.value = budget.description || '';
        
        // Add budget ID to form
        form.dataset.budgetId = id;
        
        // Change submit button text
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.textContent = 'Actualizar Presupuesto';
        }
        
        // Scroll to form
        form.scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('Error loading budget for edit:', error);
        utils.showAlert(`Error al cargar presupuesto: ${error.message}`, 'error');
    }
};

// Delete budget
window.deleteBudget = async function(id) {
    if (!confirm('¿Está seguro de que desea eliminar este presupuesto? Esta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        const supabase = await supabaseClient.init();
        
        if (supabase) {
            // Delete from Supabase
            const { error } = await supabase
                .from('budgets')
                .delete()
                .eq('id', id);
                
            if (error) throw error;
            
            utils.showAlert('Presupuesto eliminado exitosamente de la base de datos', 'success');
        } else {
            // Fallback to localStorage
            const budgets = storage.get('budgets') || [];
            const updatedBudgets = budgets.filter(b => b.id !== id);
            
            if (budgets.length === updatedBudgets.length) {
                throw new Error('Presupuesto no encontrado');
            }
            
            storage.set('budgets', updatedBudgets);
            
            utils.showAlert('Presupuesto eliminado exitosamente (almacenamiento local)', 'success');
        }
        
        // Reload data
        await loadBudgets();
        await loadFinancialDashboard();
        
    } catch (error) {
        console.error('Error deleting budget:', error);
        utils.showAlert(`Error al eliminar presupuesto: ${error.message}`, 'error');
    }
};

// Make functions available globally
window.editTransaction = editTransaction;
window.deleteTransaction = deleteTransaction;
window.editBudget = editBudget;
window.deleteBudget = deleteBudget;
window.exportReportToPDF = exportReportToPDF;
window.exportReportToExcel = exportReportToExcel;
window.exportTransactions = exportTransactions;

export default {};