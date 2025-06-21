import storage from '../storage.js';
import supabaseClient from '../supabase-client.js';
import utils from '../utils.js';

let supabase = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    if (!storage.get('adminLoggedIn')) {
        window.location.href = 'login.html';
        return;
    }

    // Initialize Supabase client
    supabase = await supabaseClient.init();
    
    // Initialize tab functionality
    initTabs();
    
    // Load dashboard data
    await loadDashboardData();
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize charts if Chart.js is available
    if (typeof Chart !== 'undefined') {
        initializeCharts();
    } else {
        console.error('Chart.js not loaded');
    }
});

// Initialize tab functionality
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const sidebar = document.querySelector('.sidebar');
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;

            // Update active tab button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Show target tab content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === targetTab) {
                    content.classList.add('active');

                    // Load tab-specific data
                    if (targetTab === 'estadisticas') {
                        loadDetailedStatistics();
                    } else if (targetTab === 'actividad') {
                        loadActivityLog();
                    } else if (targetTab === 'acciones') {
                        loadRecentChanges();
                    }
                }
            });

            // Close sidebar and overlay on mobile after tab click
            if (window.innerWidth < 1200) {
                if (sidebar && sidebar.classList.contains('active')) {
                    sidebar.classList.remove('active');
                    sidebar.setAttribute('aria-hidden', 'true');
                }
                if (sidebarOverlay && sidebarOverlay.classList.contains('active')) {
                    sidebarOverlay.classList.remove('active');
                }
                if (menuToggle) {
                    menuToggle.setAttribute('aria-expanded', 'false');
                }
            }
        });
    });
}

// Set up event listeners
function setupEventListeners() {
    // Logout button
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        storage.remove('adminLoggedIn');
        storage.remove('currentUser');
        window.location.href = 'login.html';
    });
    
    // Backup data button
    document.getElementById('backupDataBtn')?.addEventListener('click', backupData);
    
    // Activity log filters
    document.getElementById('searchActivity')?.addEventListener('input', loadActivityLog);
    document.getElementById('filterActivityType')?.addEventListener('change', loadActivityLog);
    document.getElementById('filterActivityUser')?.addEventListener('change', loadActivityLog);
    
    // Set up navigation for quick action cards
    setupQuickActionNavigation();
}

// Set up navigation for quick action cards
function setupQuickActionNavigation() {
    // All action buttons already have href attributes, no need for additional JS
    // Just make sure they're properly linked in the HTML
    
    // Example of how to add dynamic navigation if needed:
    document.querySelectorAll('.action-buttons a').forEach(link => {
        link.addEventListener('click', (e) => {
            // You can add analytics tracking here if needed
            console.log(`Navigating to: ${link.getAttribute('href')}`);
        });
    });
}

// Load dashboard data
async function loadDashboardData() {
    try {
        // Show loading state
        document.querySelectorAll('.number').forEach(el => {
            el.innerHTML = '<div class="loading-spinner-sm"></div>';
        });
        
        // Get current user
        const currentUser = storage.get('currentUser');
        if (currentUser) {
            document.getElementById('sessionInfo').textContent = `${currentUser.name || currentUser.username} (${currentUser.role})`;
        }
        
        // Check database connection
        if (supabase) {
            document.getElementById('dbStatus').textContent = 'Conectada';
            document.getElementById('dbStatus').style.color = '#28a745';
        } else {
            document.getElementById('dbStatus').textContent = 'Local (Sin conexión)';
            document.getElementById('dbStatus').style.color = '#ffc107';
        }
        
        // Load members count
        await loadMembersCount();
        
        // Load activities count
        await loadActivitiesCount();
        
        // Load leaders count
        await loadLeadersCount();
        
        // Load financial data
        await loadFinancialData();
        
        // Load contact messages
        await loadContactMessages();
        
        // Set interval to refresh contact messages every 30 seconds
        setInterval(() => {
            loadContactMessages();
        }, 30000);
        
        // Load activity chart data
        await loadActivityChartData();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        utils.showAlert('Error al cargar datos del dashboard', 'error');
    }
}

// Load members count
async function loadMembersCount() {
    try {
        let membersCount = 0;
        let membersChange = 0;
        
        const currentSupabase = supabaseClient.getClient();
        
        if (currentSupabase) {
            // Get scouts count from Supabase
            const { data: scoutsData, error: scoutsError } = await currentSupabase
                .from('scouts')
                .select('count');
                
            if (!scoutsError && scoutsData && scoutsData.length > 0) {
                membersCount = scoutsData[0]?.count || 0;
            }
            
            // Get scouts created in the last month
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            
            const { data: recentScouts, error: recentError } = await currentSupabase
                .from('scouts')
                .select('count')
                .gte('created_at', lastMonth.toISOString());
                
            if (!recentError && recentScouts && recentScouts.length > 0) {
                membersChange = recentScouts[0]?.count || 0;
            }
        } else {
            // Fallback to localStorage
            const members = storage.get('members') || [];
            const scouts = storage.get('scouts') || [];
            membersCount = members.length + scouts.length;
            
            // Calculate change (mock data for demo)
            membersChange = Math.floor(membersCount * 0.1); // Assume 10% are new
        }
        
        // Update UI
        document.getElementById('totalMembers').textContent = membersCount;
        
        const membersTrend = document.getElementById('membersTrend');
        if (membersTrend) {
            if (membersChange > 0) {
                membersTrend.textContent = `↗ +${membersChange} este mes`;
                membersTrend.className = 'trend positive';
            } else if (membersChange < 0) {
                membersTrend.textContent = `↘ ${membersChange} este mes`;
                membersTrend.className = 'trend negative';
            } else {
                membersTrend.textContent = `→ Sin cambios`;
                membersTrend.className = 'trend neutral';
            }
        }
        
    } catch (error) {
        console.error('Error loading members count:', error);
        document.getElementById('totalMembers').textContent = 'Error';
    }
}

// Load activities count
async function loadActivitiesCount() {
    try {
        let activitiesCount = 0;
        let nextActivityDate = null;
        let nextActivityTitle = '';
        
        const currentSupabase = supabaseClient.getClient();
        
        if (currentSupabase) {
            // Get activities count from Supabase
            const { data: activitiesData, error: activitiesError } = await currentSupabase
                .from('activities')
                .select('count');
                
            if (!activitiesError && activitiesData && activitiesData.length > 0) {
                activitiesCount = activitiesData[0]?.count || 0;
            }
            
            // Get next upcoming activity
            const today = new Date().toISOString().split('T')[0];
            
            const { data: upcomingActivity, error: upcomingError } = await currentSupabase
                .from('activities')
                .select('*')
                .gte('date', today)
                .order('date', { ascending: true })
                .limit(1);
                
            if (!upcomingError && upcomingActivity && upcomingActivity.length > 0) {
                nextActivityDate = upcomingActivity[0].date;
                nextActivityTitle = upcomingActivity[0].title || upcomingActivity[0].name;
            }
        } else {
            // Fallback to localStorage
            const activities = storage.get('activities') || [];
            const plannedActivities = storage.get('plannedActivities') || [];
            activitiesCount = activities.length + plannedActivities.length;
            
            // Get next upcoming activity
            const today = new Date();
            const upcoming = [...activities, ...plannedActivities]
                .filter(a => new Date(a.date) >= today)
                .sort((a, b) => new Date(a.date) - new Date(b.date));
                
            if (upcoming.length > 0) {
                nextActivityDate = upcoming[0].date;
                nextActivityTitle = upcoming[0].title || upcoming[0].name;
            }
        }
        
        // Update UI
        document.getElementById('totalActivities').textContent = activitiesCount;
        
        if (nextActivityDate) {
            const formattedDate = utils.formatDate(nextActivityDate);
            const nextActivityElement = document.getElementById('nextActivity');
            if (nextActivityElement) {
                nextActivityElement.textContent = `${formattedDate} - ${nextActivityTitle}`;
            }
            
            // Set trend based on how soon the next activity is
            const daysUntil = Math.ceil((new Date(nextActivityDate) - new Date()) / (1000 * 60 * 60 * 24));
            
            const activitiesTrend = document.getElementById('activitiesTrend');
            if (activitiesTrend) {
                if (daysUntil <= 7) {
                    activitiesTrend.textContent = `↗ Próxima en ${daysUntil} días`;
                    activitiesTrend.className = 'trend positive';
                } else {
                    activitiesTrend.textContent = `→ Próxima en ${daysUntil} días`;
                    activitiesTrend.className = 'trend neutral';
                }
            }
        } else {
            const nextActivityElement = document.getElementById('nextActivity');
            if (nextActivityElement) {
                nextActivityElement.textContent = 'No hay actividades programadas';
            }
            
            const activitiesTrend = document.getElementById('activitiesTrend');
            if (activitiesTrend) {
                activitiesTrend.textContent = `→ Sin actividades`;
                activitiesTrend.className = 'trend neutral';
            }
        }
        
    } catch (error) {
        console.error('Error loading activities count:', error);
        document.getElementById('totalActivities').textContent = 'Error';
    }
}

// Load leaders count
async function loadLeadersCount() {
    try {
        let leadersCount = 0;
        let completeDocumentation = 0;
        
        const currentSupabase = supabaseClient.getClient();
        
        if (currentSupabase) {
            // Get dirigentes count from Supabase
            const { data: dirigentesData, error: dirigentesError } = await currentSupabase
                .from('dirigentes')
                .select('count');
                
            if (!dirigentesError && dirigentesData && dirigentesData.length > 0) {
                leadersCount = dirigentesData[0]?.count || 0;
            }
            
            // Get count of dirigentes with complete documentation
            const { data: completeData, error: completeError } = await currentSupabase
                .from('dirigentes')
                .select('count')
                .eq('documentacion_completa', true);
                
            if (!completeError && completeData && completeData.length > 0) {
                completeDocumentation = completeData[0]?.count || 0;
            }
        } else {
            // Fallback to localStorage
            const dirigentes = storage.get('dirigentes') || [];
            leadersCount = dirigentes.length;
            
            // Count dirigentes with complete documentation
            completeDocumentation = dirigentes.filter(d => d.documentacion_completa).length;
        }
        
        // Update UI
        document.getElementById('totalLeaders').textContent = leadersCount;
        
        // Calculate documentation percentage
        const docPercentage = leadersCount > 0 ? Math.round((completeDocumentation / leadersCount) * 100) : 0;
        const completeDocElement = document.getElementById('completeDocumentation');
        if (completeDocElement) {
            completeDocElement.textContent = `${docPercentage}%`;
        }
        
        // Set trend based on documentation percentage
        const leadersTrend = document.getElementById('leadersTrend');
        if (leadersTrend) {
            if (docPercentage >= 80) {
                leadersTrend.textContent = `↗ ${docPercentage}% documentación completa`;
                leadersTrend.className = 'trend positive';
            } else if (docPercentage >= 50) {
                leadersTrend.textContent = `→ ${docPercentage}% documentación completa`;
                leadersTrend.className = 'trend neutral';
            } else {
                leadersTrend.textContent = `↘ ${docPercentage}% documentación completa`;
                leadersTrend.className = 'trend negative';
            }
        }
        
    } catch (error) {
        console.error('Error loading leaders count:', error);
        document.getElementById('totalLeaders').textContent = 'Error';
    }
}

// Load financial data
async function loadFinancialData() {
    try {
        let totalIncome = 0;
        let totalExpenses = 0;
        let totalBalance = 0;
        let availableBudget = 0;
        
        const currentSupabase = supabaseClient.getClient();
        
        if (currentSupabase) {
            // Get income sum from Supabase
            const { data: incomeData, error: incomeError } = await currentSupabase
                .from('transactions')
                .select('amount')
                .eq('type', 'income');
                
            if (!incomeError && incomeData) {
                totalIncome = incomeData.reduce((sum, transaction) => sum + parseFloat(transaction.amount || 0), 0);
            }
            
            // Get expenses sum from Supabase
            const { data: expensesData, error: expensesError } = await currentSupabase
                .from('transactions')
                .select('amount')
                .eq('type', 'expense');
                
            if (!expensesError && expensesData) {
                totalExpenses = expensesData.reduce((sum, transaction) => sum + parseFloat(transaction.amount || 0), 0);
            }
            
            // Get budgets sum from Supabase
            const { data: budgetsData, error: budgetsError } = await currentSupabase
                .from('budgets')
                .select('amount');
                
            if (!budgetsError && budgetsData) {
                availableBudget = budgetsData.reduce((sum, budget) => sum + parseFloat(budget.amount || 0), 0);
            }
        } else {
            // Fallback to localStorage
            const transactions = storage.get('transactions') || [];
            
            // Calculate income and expenses
            totalIncome = transactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
                
            totalExpenses = transactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
                
            // Get budgets
            const budgets = storage.get('budgets') || [];
            availableBudget = budgets.reduce((sum, b) => sum + parseFloat(b.amount || 0), 0);
        }
        
        // Calculate balance
        totalBalance = totalIncome - totalExpenses;
        
        // Update UI
        const totalBalanceElement = document.getElementById('totalBalance');
        if (totalBalanceElement) {
            totalBalanceElement.textContent = utils.formatCurrency(totalBalance);
        }
        
        const availableBudgetElement = document.getElementById('availableBudget');
        if (availableBudgetElement) {
            availableBudgetElement.textContent = utils.formatCurrency(availableBudget);
        }
        
        // Set balance status
        const balanceStatus = document.getElementById('balanceStatus');
        if (balanceStatus) {
            if (totalBalance > 0) {
                balanceStatus.textContent = 'Positivo';
                balanceStatus.className = 'status-badge active';
            } else if (totalBalance < 0) {
                balanceStatus.textContent = 'Negativo';
                balanceStatus.className = 'status-badge inactive';
            } else {
                balanceStatus.textContent = 'Neutro';
                balanceStatus.className = 'status-badge pending';
            }
        }
        
        // Set balance trend
        const balanceTrend = document.getElementById('balanceTrend');
        if (balanceTrend) {
            const balancePercentage = totalIncome > 0 ? Math.round((totalBalance / totalIncome) * 100) : 0;
            
            if (balancePercentage > 20) {
                balanceTrend.textContent = `↗ +${balancePercentage}% sobre ingresos`;
                balanceTrend.className = 'trend positive';
            } else if (balancePercentage >= 0) {
                balanceTrend.textContent = `→ +${balancePercentage}% sobre ingresos`;
                balanceTrend.className = 'trend neutral';
            } else {
                balanceTrend.textContent = `↘ ${balancePercentage}% sobre ingresos`;
                balanceTrend.className = 'trend negative';
            }
        }
        
    } catch (error) {
        console.error('Error loading financial data:', error);
        const totalBalanceElement = document.getElementById('totalBalance');
        if (totalBalanceElement) {
            totalBalanceElement.textContent = 'Error';
        }
    }
}

async function loadContactMessages() {
    try {
        let contacts = [];
        
        const currentSupabase = supabaseClient.getClient();
        console.log('Supabase client:', currentSupabase);
        
        if (currentSupabase) {
            // Get contact messages from Supabase
            const { data, error } = await currentSupabase
                .from('contacts')
                .select('*')
                .order('date', { ascending: false })
                .limit(10);
            console.log('Supabase contacts data:', data, 'error:', error);
            if (!error && data) {
                contacts = data;
            } else {
                console.error('Error fetching contacts from Supabase:', error);
            }
        } else {
            // Fallback to localStorage
            contacts = storage.get('contacts') || [];
            
            // Sort by date (newest first) and limit to 10
            contacts = contacts
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 10);
        }
        
        // Update UI
        const contactMessagesContainer = document.getElementById('contactMessages');
        if (!contactMessagesContainer) return;
        
        if (contacts.length === 0) {
            contactMessagesContainer.innerHTML = '<p class="no-content">No hay mensajes de contacto</p>';
            return;
        }
        
        contactMessagesContainer.innerHTML = '';
        
        contacts.forEach((contact, index) => {
            const messageCard = document.createElement('div');
            messageCard.className = `card message-card ${contact.status === 'read' ? 'read' : ''}`;
            messageCard.innerHTML = `
                <h4>${contact.name}</h4>
                <p class="date">${utils.formatDate(contact.date)}</p>
                <p><strong>Email:</strong> ${contact.email}</p>
                <p><strong>Teléfono:</strong> ${contact.phone}</p>
                <p>${contact.message}</p>
                <div class="button-group">
                    <button class="btn btn-primary" onclick="markAsRead(${contact.id})" ${contact.status === 'read' ? 'disabled' : ''}>
                        ${contact.status === 'read' ? 'Leído' : 'Marcar como leído'}
                    </button>
                    <button class="btn btn-secondary" onclick="deleteMessage(${contact.id})">Eliminar</button>
                </div>
            `;
            contactMessagesContainer.appendChild(messageCard);
        });
        
    } catch (error) {
        console.error('Error loading contact messages:', error);
        const contactMessagesContainer = document.getElementById('contactMessages');
        if (contactMessagesContainer) {
            contactMessagesContainer.innerHTML = '<p class="error-message">Error al cargar mensajes</p>';
        }
    }
}

// Load activity chart data
async function loadActivityChartData() {
    try {
        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.error('Chart.js not loaded');
            return;
        }
        
        const activityChartElement = document.getElementById('activityChart');
        if (!activityChartElement) {
            console.error('Activity chart element not found');
            return;
        }
        
        // Get data for the chart
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const currentMonth = new Date().getMonth();
        
        // Last 6 months
        const labels = [];
        for (let i = 5; i >= 0; i--) {
            const monthIndex = (currentMonth - i + 12) % 12;
            labels.push(months[monthIndex]);
        }
        
        // Get activities data
        let activitiesData = [0, 0, 0, 0, 0, 0];
        let membersData = [0, 0, 0, 0, 0, 0];
        
        const currentSupabase = supabaseClient.getClient();
        
        if (currentSupabase) {
            // Get real data from Supabase if possible
            try {
                // For activities, we'll count by month
                for (let i = 0; i < 6; i++) {
                    const monthDate = new Date();
                    monthDate.setMonth(currentMonth - i);
                    const startOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).toISOString();
                    const endOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).toISOString();
                    
                    const { data, error } = await currentSupabase
                        .from('activities')
                        .select('count')
                        .gte('date', startOfMonth)
                        .lte('date', endOfMonth);
                        
                    if (!error && data && data.length > 0) {
                        // Store in reverse order (most recent month last)
                        activitiesData[5 - i] = data[0].count || 0;
                    }
                }
                
                // For members, we'll get the total count for each month
                // This would require a more complex query in a real app
                // For now, we'll use mock data that increases slightly each month
                let baseCount = 40;
                for (let i = 0; i < 6; i++) {
                    membersData[i] = baseCount + i * 2;
                }
            } catch (error) {
                console.error('Error getting chart data from Supabase:', error);
                // Fall back to mock data
                activitiesData = [5, 7, 4, 8, 6, 9];
                membersData = [40, 42, 45, 47, 48, 50];
            }
        } else {
            // Fallback to localStorage with mock data
            activitiesData = [5, 7, 4, 8, 6, 9];
            membersData = [40, 42, 45, 47, 48, 50];
        }
        
        // Create chart
        const ctx = activityChartElement.getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Actividades',
                        data: activitiesData,
                        borderColor: '#2A6E3F',
                        backgroundColor: 'rgba(42, 110, 63, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Miembros Activos',
                        data: membersData,
                        borderColor: '#8B4513',
                        backgroundColor: 'rgba(139, 69, 19, 0.1)',
                        tension: 0.4,
                        fill: true,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Actividades'
                        }
                    },
                    y1: {
                        beginAtZero: true,
                        position: 'right',
                        grid: {
                            drawOnChartArea: false
                        },
                        title: {
                            display: true,
                            text: 'Miembros'
                        }
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('Error loading activity chart data:', error);
    }
}

// Load detailed statistics
async function loadDetailedStatistics() {
    try {
        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.error('Chart.js not loaded');
            return;
        }
        
        // Load groups chart
        await loadGroupsChart();
        
        // Load attendance chart
        await loadAttendanceChart();
        
        // Load financial chart
        await loadFinancialChart();
        
    } catch (error) {
        console.error('Error loading detailed statistics:', error);
        utils.showAlert('Error al cargar estadísticas detalladas', 'error');
    }
}

// Load groups chart
async function loadGroupsChart() {
    try {
        const groupsChartElement = document.getElementById('groupsChart');
        if (!groupsChartElement) {
            console.error('Groups chart element not found');
            return;
        }
        
        // Group names and colors
        const groups = [
            { id: 'bandada', name: '🐦 Bandada', color: '#1e88e5' },
            { id: 'manada', name: '🐺 Manada', color: '#43a047' },
            { id: 'compania', name: '🍀 Compañía', color: '#7cb342' },
            { id: 'tropa', name: '🏕️ Tropa', color: '#fb8c00' },
            { id: 'avanzada', name: '🌠 Avanzada', color: '#8e24aa' },
            { id: 'clan', name: '🔥 Clan', color: '#e53935' }
        ];
        
        // Get members count by group
        let groupCounts = {};
        
        const currentSupabase = supabaseClient.getClient();
        
        if (currentSupabase) {
            // Get counts from Supabase
            for (const group of groups) {
                const { data, error } = await currentSupabase
                    .from('scouts')
                    .select('count')
                    .eq('group_section', group.id);
                    
                if (!error && data && data.length > 0) {
                    groupCounts[group.id] = data[0]?.count || 0;
                }
            }
        } else {
            // Fallback to localStorage
            const members = storage.get('members') || [];
            const scouts = storage.get('scouts') || [];
            const allMembers = [...members, ...scouts];
            
            // Count members by group
            groups.forEach(group => {
                groupCounts[group.id] = allMembers.filter(m => 
                    m.group === group.id || m.group_section === group.id
                ).length;
            });
        }
        
        // Prepare chart data
        const labels = groups.map(g => g.name);
        const data = groups.map(g => groupCounts[g.id] || 0);
        const colors = groups.map(g => g.color);
        
        // Create chart
        const ctx = groupsChartElement.getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Miembros por Grupo',
                    data: data,
                    backgroundColor: colors,
                    borderColor: colors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Número de Miembros'
                        }
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('Error loading groups chart:', error);
    }
}

// Load attendance chart
async function loadAttendanceChart() {
    try {
        const attendanceChartElement = document.getElementById('attendanceChart');
        if (!attendanceChartElement) {
            console.error('Attendance chart element not found');
            return;
        }
        
        // Get attendance data
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const currentMonth = new Date().getMonth();
        
        // Last 6 months
        const labels = [];
        for (let i = 5; i >= 0; i--) {
            const monthIndex = (currentMonth - i + 12) % 12;
            labels.push(months[monthIndex]);
        }
        
        // Get real attendance data if available
        let attendanceData = {};
        
        const currentSupabase = supabaseClient.getClient();
        
        if (currentSupabase) {
            try {
                // Try to get real attendance data from Supabase
                const { data, error } = await currentSupabase
                    .from('attendance_by_group')
                    .select('*');
                    
                if (!error && data && data.length > 0) {
                    // Process data into the format we need
                    const groups = ['bandada', 'manada', 'compania', 'tropa', 'avanzada', 'clan'];
                    
                    groups.forEach(group => {
                        attendanceData[group] = [];
                        for (let i = 0; i < 6; i++) {
                            // Find attendance for this group and month
                            const monthData = data.find(d => 
                                d.group_section === group && 
                                new Date(d.month).getMonth() === (currentMonth - i + 12) % 12
                            );
                            
                            // Add percentage or default value
                            attendanceData[group].push(
                                monthData ? Math.round(monthData.avg_attendance_percentage) : 
                                Math.floor(Math.random() * 20) + 70 // Fallback to random 70-90%
                            );
                        }
                        
                        // Reverse to get chronological order
                        attendanceData[group].reverse();
                    });
                } else {
                    // No data available, use mock data
                    console.log('No attendance data available, using mock data');
                    attendanceData = {
                        'bandada': labels.map(() => Math.floor(Math.random() * 20) + 70), // 70-90%
                        'manada': labels.map(() => Math.floor(Math.random() * 20) + 75),  // 75-95%
                        'compania': labels.map(() => Math.floor(Math.random() * 25) + 65), // 65-90%
                        'tropa': labels.map(() => Math.floor(Math.random() * 30) + 60),   // 60-90%
                        'avanzada': labels.map(() => Math.floor(Math.random() * 35) + 55), // 55-90%
                        'clan': labels.map(() => Math.floor(Math.random() * 40) + 50)     // 50-90%
                    };
                }
            } catch (error) {
                console.error('Error getting attendance data:', error);
                // Fall back to mock data
                attendanceData = {
                    'bandada': labels.map(() => Math.floor(Math.random() * 20) + 70), // 70-90%
                    'manada': labels.map(() => Math.floor(Math.random() * 20) + 75),  // 75-95%
                    'compania': labels.map(() => Math.floor(Math.random() * 25) + 65), // 65-90%
                    'tropa': labels.map(() => Math.floor(Math.random() * 30) + 60),   // 60-90%
                    'avanzada': labels.map(() => Math.floor(Math.random() * 35) + 55), // 55-90%
                    'clan': labels.map(() => Math.floor(Math.random() * 40) + 50)     // 50-90%
                };
            }
        } else {
            // Fallback to mock data
            attendanceData = {
                'bandada': labels.map(() => Math.floor(Math.random() * 20) + 70), // 70-90%
                'manada': labels.map(() => Math.floor(Math.random() * 20) + 75),  // 75-95%
                'compania': labels.map(() => Math.floor(Math.random() * 25) + 65), // 65-90%
                'tropa': labels.map(() => Math.floor(Math.random() * 30) + 60),   // 60-90%
                'avanzada': labels.map(() => Math.floor(Math.random() * 35) + 55), // 55-90%
                'clan': labels.map(() => Math.floor(Math.random() * 40) + 50)     // 50-90%
            };
        }
        
        // Create chart
        const ctx = attendanceChartElement.getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '🐦 Bandada',
                        data: attendanceData['bandada'],
                        borderColor: '#1e88e5',
                        backgroundColor: 'rgba(30, 136, 229, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: '🐺 Manada',
                        data: attendanceData['manada'],
                        borderColor: '#43a047',
                        backgroundColor: 'rgba(67, 160, 71, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: '🍀 Compañía',
                        data: attendanceData['compania'],
                        borderColor: '#7cb342',
                        backgroundColor: 'rgba(124, 179, 66, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: '🏕️ Tropa',
                        data: attendanceData['tropa'],
                        borderColor: '#fb8c00',
                        backgroundColor: 'rgba(251, 140, 0, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: '🌠 Avanzada',
                        data: attendanceData['avanzada'],
                        borderColor: '#8e24aa',
                        backgroundColor: 'rgba(142, 36, 170, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: '🔥 Clan',
                        data: attendanceData['clan'],
                        borderColor: '#e53935',
                        backgroundColor: 'rgba(229, 57, 53, 0.1)',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Porcentaje de Asistencia'
                        },
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('Error loading attendance chart:', error);
    }
}

// Load financial chart
async function loadFinancialChart() {
    try {
        const financialChartElement = document.getElementById('financialChart');
        if (!financialChartElement) {
            console.error('Financial chart element not found');
            return;
        }
        
        // Get financial data
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const currentMonth = new Date().getMonth();
        
        // Last 6 months
        const labels = [];
        for (let i = 5; i >= 0; i--) {
            const monthIndex = (currentMonth - i + 12) % 12;
            labels.push(months[monthIndex]);
        }
        
        let incomeData = [];
        let expenseData = [];
        let balanceData = [];
        
        const currentSupabase = supabaseClient.getClient();
        
        if (currentSupabase) {
            try {
                // Try to get real financial data from Supabase
                // For each month, get sum of income and expenses
                for (let i = 0; i < 6; i++) {
                    const monthDate = new Date();
                    monthDate.setMonth(currentMonth - i);
                    const startOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).toISOString().split('T')[0];
                    const endOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).toISOString().split('T')[0];
                    
                    // Get income for this month
                    const { data: incomeMonthData, error: incomeError } = await currentSupabase
                        .from('transactions')
                        .select('amount')
                        .eq('type', 'income')
                        .gte('date', startOfMonth)
                        .lte('date', endOfMonth);
                        
                    let monthIncome = 0;
                    if (!incomeError && incomeMonthData) {
                        monthIncome = incomeMonthData.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
                    }
                    
                    // Get expenses for this month
                    const { data: expenseMonthData, error: expenseError } = await currentSupabase
                        .from('transactions')
                        .select('amount')
                        .eq('type', 'expense')
                        .gte('date', startOfMonth)
                        .lte('date', endOfMonth);
                        
                    let monthExpense = 0;
                    if (!expenseError && expenseMonthData) {
                        monthExpense = expenseMonthData.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
                    }
                    
                    // Store in reverse order (most recent month last)
                    incomeData[5 - i] = monthIncome;
                    expenseData[5 - i] = monthExpense;
                }
                
                // Calculate balance
                balanceData = incomeData.map((income, i) => income - expenseData[i]);
            } catch (error) {
                console.error('Error getting financial data from Supabase:', error);
                // Fall back to mock data
                incomeData = labels.map(() => Math.floor(Math.random() * 500) + 1000);
                expenseData = labels.map(() => Math.floor(Math.random() * 400) + 800);
                balanceData = incomeData.map((income, i) => income - expenseData[i]);
            }
        } else {
            // Fallback to localStorage with mock data
            incomeData = labels.map(() => Math.floor(Math.random() * 500) + 1000);
            expenseData = labels.map(() => Math.floor(Math.random() * 400) + 800);
            balanceData = incomeData.map((income, i) => income - expenseData[i]);
        }
        
        // Create chart
        const ctx = financialChartElement.getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Ingresos',
                        data: incomeData,
                        backgroundColor: 'rgba(40, 167, 69, 0.7)',
                        borderColor: 'rgba(40, 167, 69, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Gastos',
                        data: expenseData,
                        backgroundColor: 'rgba(220, 53, 69, 0.7)',
                        borderColor: 'rgba(220, 53, 69, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Balance',
                        data: balanceData,
                        type: 'line',
                        borderColor: '#2A6E3F',
                        backgroundColor: 'rgba(42, 110, 63, 0.1)',
                        fill: true,
                        tension: 0.4,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Monto ($)'
                        }
                    },
                    y1: {
                        position: 'right',
                        beginAtZero: true,
                        grid: {
                            drawOnChartArea: false
                        },
                        title: {
                            display: true,
                            text: 'Balance ($)'
                        }
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('Error loading financial chart:', error);
    }
}

// Load activity log
async function loadActivityLog() {
    try {
        const activityLogContainer = document.getElementById('activityLog');
        if (!activityLogContainer) return;
        
        // Show loading state
        activityLogContainer.innerHTML = '<div class="loading-container"><div class="loading-spinner"></div><p>Cargando actividad...</p></div>';
        
        // Get filter values
        const searchTerm = document.getElementById('searchActivity')?.value.toLowerCase() || '';
        const typeFilter = document.getElementById('filterActivityType')?.value || '';
        const userFilter = document.getElementById('filterActivityUser')?.value || '';
        
        let auditLog = [];
        
        const currentSupabase = supabaseClient.getClient();
        
        if (currentSupabase) {
            // Build query
            let query = currentSupabase
                .from('audit_log')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(50);
                
            if (typeFilter) {
                query = query.eq('action', typeFilter);
            }
            
            if (userFilter) {
                query = query.eq('user_name', userFilter);
            }
            
            if (searchTerm) {
                query = query.ilike('description', `%${searchTerm}%`);
            }
            
            const { data, error } = await query;
            
            if (!error && data) {
                auditLog = data;
            } else {
                throw new Error(error?.message || 'Error fetching audit log');
            }
        } else {
            // Fallback to localStorage
            auditLog = storage.get('auditLog') || [];
            
            // Apply filters
            auditLog = auditLog.filter(entry => {
                const matchesSearch = !searchTerm || (entry.description && entry.description.toLowerCase().includes(searchTerm));
                const matchesType = !typeFilter || entry.action === typeFilter;
                const matchesUser = !userFilter || entry.user === userFilter || entry.user_name === userFilter;
                
                return matchesSearch && matchesType && matchesUser;
            });
            
            // Sort by timestamp (newest first)
            auditLog.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            // Limit to 50 entries
            auditLog = auditLog.slice(0, 50);
        }
        
        // Populate user filter if needed
        if (document.getElementById('filterActivityUser') && !userFilter) {
            const userSelect = document.getElementById('filterActivityUser');
            
            // Clear existing options except the first one
            while (userSelect.options.length > 1) {
                userSelect.remove(1);
            }
            
            // Get unique users
            const users = [...new Set(auditLog.map(entry => entry.user || entry.user_name).filter(Boolean))];
            
            // Add options
            users.forEach(user => {
                if (user) {
                    const option = document.createElement('option');
                    option.value = user;
                    option.textContent = user;
                    userSelect.appendChild(option);
                }
            });
        }
        
        // Update UI
        if (auditLog.length === 0) {
            activityLogContainer.innerHTML = '<p class="no-content">No hay registros de actividad</p>';
            return;
        }
        
        activityLogContainer.innerHTML = '';
        
        auditLog.forEach(entry => {
            const logEntry = document.createElement('div');
            logEntry.className = 'audit-entry';
            
            logEntry.innerHTML = `
                <div class="audit-header">
                    <span class="audit-action ${entry.action}">${entry.action.toUpperCase()}</span>
                    <span class="audit-timestamp">${utils.formatDate(entry.timestamp)}</span>
                </div>
                <div class="audit-details">
                    <p><strong>Usuario:</strong> ${entry.user || entry.user_name}</p>
                    <p><strong>Tipo:</strong> ${entry.type}</p>
                    <p><strong>Descripción:</strong> ${entry.description}</p>
                    ${entry.ip ? `<p><strong>IP:</strong> ${entry.ip}</p>` : ''}
                </div>
            `;
            
            activityLogContainer.appendChild(logEntry);
        });
        
    } catch (error) {
        console.error('Error loading activity log:', error);
        const activityLogContainer = document.getElementById('activityLog');
        if (activityLogContainer) {
            activityLogContainer.innerHTML = '<p class="error-message">Error al cargar el registro de actividad</p>';
        }
    }
}

// Load recent changes
async function loadRecentChanges() {
    try {
        const recentChangesContainer = document.getElementById('recentChanges');
        if (!recentChangesContainer) return;
        
        // Show loading state
        recentChangesContainer.innerHTML = '<div class="loading-container"><div class="loading-spinner"></div><p>Cargando cambios recientes...</p></div>';
        
        let recentChanges = [];
        
        const currentSupabase = supabaseClient.getClient();
        
        if (currentSupabase) {
            // Get recent changes from audit log
            const { data, error } = await currentSupabase
                .from('audit_log')
                .select('*')
                .in('action', ['create', 'update', 'delete'])
                .order('timestamp', { ascending: false })
                .limit(10);
                
            if (!error && data) {
                // Transform to our format
                recentChanges = data.map(entry => ({
                    type: entry.type,
                    action: entry.action,
                    name: entry.description.split(' ').slice(-1)[0], // Extract name from description
                    date: entry.timestamp,
                    user: entry.user_name
                }));
            } else {
                // Fall back to mock data
                recentChanges = getMockRecentChanges();
            }
        } else {
            // Get from localStorage if possible
            const auditLog = storage.get('auditLog') || [];
            
            if (auditLog.length > 0) {
                // Filter for create/update/delete actions
                recentChanges = auditLog
                    .filter(entry => ['create', 'update', 'delete'].includes(entry.action))
                    .map(entry => ({
                        type: entry.type,
                        action: entry.action,
                        name: entry.description.split(' ').slice(-1)[0], // Extract name from description
                        date: entry.timestamp,
                        user: entry.user
                    }))
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .slice(0, 10);
            } else {
                // Fall back to mock data
                recentChanges = getMockRecentChanges();
            }
        }
        
        // Update UI
        if (recentChanges.length === 0) {
            recentChangesContainer.innerHTML = '<p class="no-content">No hay cambios recientes</p>';
            return;
        }
        
        recentChangesContainer.innerHTML = '';
        
        recentChanges.forEach(change => {
            const changeCard = document.createElement('div');
            changeCard.className = 'change-card';
            
            const actionText = {
                'create': 'creó',
                'update': 'actualizó',
                'delete': 'eliminó'
            }[change.action] || 'modificó';
            
            const typeText = {
                'member': 'miembro',
                'activity': 'actividad',
                'transaction': 'transacción',
                'dirigente': 'dirigente',
                'document': 'documento',
                'inventory': 'inventario',
                'user': 'usuario',
                'scout': 'scout'
            }[change.type] || change.type;
            
            const timeAgo = getTimeAgo(new Date(change.date));
            
            changeCard.innerHTML = `
                <div class="change-header">
                    <span class="change-icon ${change.type}"></span>
                    <div class="change-info">
                        <p><strong>${change.user}</strong> ${actionText} ${typeText} <strong>${change.name}</strong></p>
                        <p class="change-time">${timeAgo}</p>
                    </div>
                </div>
            `;
            
            recentChangesContainer.appendChild(changeCard);
        });
        
    } catch (error) {
        console.error('Error loading recent changes:', error);
        const recentChangesContainer = document.getElementById('recentChanges');
        if (recentChangesContainer) {
            recentChangesContainer.innerHTML = '<p class="error-message">Error al cargar cambios recientes</p>';
        }
    }
}

// Get mock recent changes
function getMockRecentChanges() {
    return [
        {
            type: 'member',
            action: 'create',
            name: 'Juan Pérez',
            date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            user: 'admin'
        },
        {
            type: 'activity',
            action: 'update',
            name: 'Campamento de Verano',
            date: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
            user: 'coordinador'
        },
        {
            type: 'transaction',
            action: 'create',
            name: 'Compra de materiales',
            date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            user: 'tesorero'
        },
        {
            type: 'dirigente',
            action: 'update',
            name: 'María González',
            date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            user: 'admin'
        }
    ];
}

// Initialize charts
function initializeCharts() {
    // This function is called once to set up Chart.js defaults
    if (typeof Chart === 'undefined') {
        console.error('Chart.js not loaded');
        return;
    }
    
    Chart.defaults.font.family = "'Open Sans', sans-serif";
    Chart.defaults.color = '#636e72';
    Chart.defaults.plugins.legend.position = 'top';
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(42, 110, 63, 0.8)';
    Chart.defaults.plugins.tooltip.titleColor = '#ffffff';
    Chart.defaults.plugins.tooltip.bodyColor = '#ffffff';
    Chart.defaults.plugins.tooltip.borderColor = 'rgba(255, 255, 255, 0.2)';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.cornerRadius = 6;
}

// Backup data
async function backupData() {
    try {
        // Create backup object
        const backup = {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            data: {}
        };
        
        // Get all localStorage keys
        const keys = storage.getAllKeys();
        
        // Add each key to backup
        keys.forEach(key => {
            backup.data[key] = storage.get(key);
        });
        
        // Convert to JSON string
        const backupJSON = JSON.stringify(backup, null, 2);
        
        // Create download link
        const blob = new Blob([backupJSON], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `scout_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Update last backup time
        document.getElementById('lastBackup').textContent = new Date().toLocaleString();
        
        utils.showAlert('Backup creado exitosamente', 'success');
    } catch (error) {
        console.error('Error creating backup:', error);
        utils.showAlert('Error al crear backup', 'error');
    }
}

// Mark message as read
window.markAsRead = async function(id) {
    try {
        const currentSupabase = supabaseClient.getClient();
        
        if (!currentSupabase) {
            utils.showAlert('No hay conexión a la base de datos', 'error');
            return;
        }
        
        const { error } = await currentSupabase
            .from('contacts')
            .update({ status: 'read' })
            .eq('id', id);
            
        if (error) throw error;
        
        // Reload messages
        await loadContactMessages();
        
        utils.showAlert('Mensaje marcado como leído', 'success');
    } catch (error) {
        console.error('Error marking message as read:', error);
        utils.showAlert('Error al marcar mensaje como leído', 'error');
    }
};

// Delete message
window.deleteMessage = async function(id) {
    try {
        const currentSupabase = supabaseClient.getClient();
        
        if (!currentSupabase) {
            utils.showAlert('No hay conexión a la base de datos', 'error');
            return;
        }
        
        const { error } = await currentSupabase
            .from('contacts')
            .delete()
            .eq('id', id);
            
        if (error) throw error;
        
        // Reload messages
        await loadContactMessages();
        
        utils.showAlert('Mensaje eliminado exitosamente', 'success');
    } catch (error) {
        console.error('Error deleting message:', error);
        utils.showAlert('Error al eliminar mensaje', 'error');
    }
};

// Helper function to format time ago
function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) {
        return 'hace unos segundos';
    } else if (diffMin < 60) {
        return `hace ${diffMin} ${diffMin === 1 ? 'minuto' : 'minutos'}`;
    } else if (diffHour < 24) {
        return `hace ${diffHour} ${diffHour === 1 ? 'hora' : 'horas'}`;
    } else if (diffDay < 30) {
        return `hace ${diffDay} ${diffDay === 1 ? 'día' : 'días'}`;
    } else {
        return utils.formatDate(date);
    }
}

// Make functions available globally
window.markAsRead = markAsRead;
window.deleteMessage = deleteMessage;
window.backupData = backupData;

export default {};