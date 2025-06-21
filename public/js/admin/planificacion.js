document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    if (!storage.get('adminLoggedIn')) {
        window.location.href = 'login.html';
        return;
    }

    // Tab functionality
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;
            
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });

    // Activity planning form
    const activityPlanForm = document.getElementById('activityPlanForm');
    if (activityPlanForm) {
        activityPlanForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const formData = new FormData(activityPlanForm);
            const activity = {
                id: Date.now(),
                title: formData.get('title'),
                type: formData.get('type'),
                date: formData.get('date'),
                time: formData.get('time'),
                duration: formData.get('duration'),
                targetGroup: formData.get('targetGroup'),
                location: formData.get('location'),
                description: formData.get('description'),
                responsible: formData.get('responsible'),
                materials: formData.get('materials'),
                status: 'planned',
                createdDate: new Date().toISOString()
            };

            const activities = storage.get('plannedActivities') || [];
            activities.push(activity);
            storage.set('plannedActivities', activities);

            activityPlanForm.reset();
            loadCalendar();
            utils.showAlert('Actividad programada exitosamente', 'success');
        });
    }

    // Calendar functionality
    let currentDate = new Date();

    const loadCalendar = () => {
        const calendar = document.getElementById('calendar');
        const currentMonthElement = document.getElementById('currentMonth');
        
        if (!calendar || !currentMonthElement) return;

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        currentMonthElement.textContent = new Date(year, month).toLocaleDateString('es-ES', { 
            month: 'long', 
            year: 'numeric' 
        });

        // Clear calendar
        calendar.innerHTML = '';

        // Add day headers
        const dayHeaders = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        dayHeaders.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-header';
            dayHeader.textContent = day;
            dayHeader.style.cssText = `
                background: var(--color-primary);
                color: white;
                padding: var(--spacing-sm);
                text-align: center;
                font-weight: 600;
            `;
            calendar.appendChild(dayHeader);
        });

        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        const activities = storage.get('plannedActivities') || [];

        // Add empty cells for previous month
        for (let i = firstDay - 1; i >= 0; i--) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day other-month';
            dayElement.textContent = daysInPrevMonth - i;
            calendar.appendChild(dayElement);
        }

        // Add days of current month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayActivities = activities.filter(activity => activity.date === dateStr);
            
            if (dayActivities.length > 0) {
                dayElement.classList.add('has-events');
            }
            
            const today = new Date();
            if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
                dayElement.classList.add('today');
            }
            
            dayElement.innerHTML = `
                <div style="font-weight: 600; margin-bottom: 4px;">${day}</div>
                ${dayActivities.map(activity => `
                    <div style="font-size: 0.7rem; background: var(--color-primary); color: white; padding: 2px 4px; margin: 1px 0; border-radius: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${activity.title}
                    </div>
                `).join('')}
            `;
            
            calendar.appendChild(dayElement);
        }

        // Add empty cells for next month
        const totalCells = calendar.children.length - 7; // Subtract header row
        const remainingCells = 42 - totalCells; // 6 rows * 7 days
        for (let day = 1; day <= remainingCells; day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day other-month';
            dayElement.textContent = day;
            calendar.appendChild(dayElement);
        }
    };

    // Calendar navigation
    document.getElementById('prevMonth')?.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        loadCalendar();
    });

    document.getElementById('nextMonth')?.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        loadCalendar();
    });

    // Educational programs form
    const programForm = document.getElementById('programForm');
    if (programForm) {
        programForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const formData = new FormData(programForm);
            const program = {
                id: Date.now(),
                name: formData.get('name'),
                targetGroup: formData.get('targetGroup'),
                area: formData.get('area'),
                duration: formData.get('duration'),
                objectives: formData.get('objectives'),
                activities: formData.get('activities'),
                resources: formData.get('resources'),
                status: 'active',
                createdDate: new Date().toISOString()
            };

            const programs = storage.get('educationalPrograms') || [];
            programs.push(program);
            storage.set('educationalPrograms', programs);

            programForm.reset();
            loadPrograms();
            utils.showAlert('Programa educativo creado exitosamente', 'success');
        });
    }

    // Load programs
    const loadPrograms = () => {
        const programs = storage.get('educationalPrograms') || [];
        const programsList = document.getElementById('programsList');
        
        if (!programsList) return;

        const groupFilter = document.getElementById('filterProgramGroup')?.value || '';
        const areaFilter = document.getElementById('filterProgramArea')?.value || '';

        let filteredPrograms = programs.filter(program => {
            const matchesGroup = !groupFilter || program.targetGroup === groupFilter;
            const matchesArea = !areaFilter || program.area === areaFilter;
            return matchesGroup && matchesArea;
        });

        programsList.innerHTML = '';

        if (filteredPrograms.length === 0) {
            programsList.innerHTML = '<p class="no-content">No hay programas educativos</p>';
            return;
        }

        filteredPrograms.forEach(program => {
            const programCard = document.createElement('div');
            programCard.className = 'card program-card';
            
            const groupNames = {
                'bandada': '🐦 Bandada',
                'manada': '🐺 Manada',
                'compania': '🍀 Compañía',
                'tropa': '🏕️ Tropa',
                'avanzada': '🌠 Avanzada',
                'clan': '🔥 Clan'
            };

            programCard.innerHTML = `
                <h4>${program.name}</h4>
                <p><strong>Grupo:</strong> ${groupNames[program.targetGroup] || program.targetGroup}</p>
                <p><strong>Área:</strong> ${program.area}</p>
                <p><strong>Duración:</strong> ${program.duration} semanas</p>
                <p><strong>Objetivos:</strong> ${program.objectives.substring(0, 100)}...</p>
                <div class="action-buttons">
                    <button class="btn btn-secondary btn-sm" onclick="editProgram(${program.id})">Editar</button>
                    <button class="btn btn-secondary btn-sm" onclick="deleteProgram(${program.id})">Eliminar</button>
                </div>
            `;
            programsList.appendChild(programCard);
        });
    };

    // Events form
    const eventForm = document.getElementById('eventForm');
    if (eventForm) {
        eventForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const formData = new FormData(eventForm);
            const event = {
                id: Date.now(),
                name: formData.get('name'),
                type: formData.get('type'),
                startDate: formData.get('startDate'),
                endDate: formData.get('endDate'),
                budget: formData.get('budget'),
                location: formData.get('location'),
                description: formData.get('description'),
                expectedParticipants: formData.get('expectedParticipants'),
                coordinator: formData.get('coordinator'),
                requirements: formData.get('requirements'),
                status: 'planning',
                createdDate: new Date().toISOString()
            };

            const events = storage.get('specialEvents') || [];
            events.push(event);
            storage.set('specialEvents', events);

            eventForm.reset();
            loadEvents();
            utils.showAlert('Evento especial creado exitosamente', 'success');
        });
    }

    // Load events
    const loadEvents = () => {
        const events = storage.get('specialEvents') || [];
        const eventsList = document.getElementById('eventsList');
        
        if (!eventsList) return;

        const timeFilter = document.getElementById('eventTimeFilter')?.value || 'upcoming';
        const today = new Date();

        let filteredEvents = events.filter(event => {
            const startDate = new Date(event.startDate);
            const endDate = new Date(event.endDate);
            
            switch (timeFilter) {
                case 'upcoming':
                    return startDate > today;
                case 'current':
                    return startDate <= today && endDate >= today;
                case 'past':
                    return endDate < today;
                default:
                    return true;
            }
        });

        eventsList.innerHTML = '';

        if (filteredEvents.length === 0) {
            eventsList.innerHTML = '<p class="no-content">No hay eventos para mostrar</p>';
            return;
        }

        filteredEvents.forEach(event => {
            const eventCard = document.createElement('div');
            eventCard.className = 'card event-card';
            eventCard.innerHTML = `
                <h4>${event.name}</h4>
                <p><strong>Tipo:</strong> ${event.type}</p>
                <p><strong>Fechas:</strong> ${utils.formatDate(event.startDate)} - ${utils.formatDate(event.endDate)}</p>
                <p><strong>Ubicación:</strong> ${event.location}</p>
                <p><strong>Coordinador:</strong> ${event.coordinator}</p>
                <p><strong>Participantes esperados:</strong> ${event.expectedParticipants}</p>
                <p><strong>Presupuesto:</strong> $${event.budget}</p>
                <p><span class="status-indicator ${event.status}">${event.status}</span></p>
                <div class="action-buttons">
                    <button class="btn btn-secondary btn-sm" onclick="editEvent(${event.id})">Editar</button>
                    <button class="btn btn-secondary btn-sm" onclick="deleteEvent(${event.id})">Eliminar</button>
                </div>
            `;
            eventsList.appendChild(eventCard);
        });
    };

    // Camps form
    const campForm = document.getElementById('campForm');
    if (campForm) {
        campForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const formData = new FormData(campForm);
            const camp = {
                id: Date.now(),
                name: formData.get('name'),
                type: formData.get('type'),
                startDate: formData.get('startDate'),
                endDate: formData.get('endDate'),
                capacity: formData.get('capacity'),
                location: formData.get('location'),
                cost: formData.get('cost'),
                theme: formData.get('theme'),
                objectives: formData.get('objectives'),
                program: formData.get('program'),
                equipment: formData.get('equipment'),
                chief: formData.get('chief'),
                status: 'planning',
                registrations: 0,
                createdDate: new Date().toISOString()
            };

            const camps = storage.get('camps') || [];
            camps.push(camp);
            storage.set('camps', camps);

            campForm.reset();
            loadCamps();
            utils.showAlert('Campamento programado exitosamente', 'success');
        });
    }

    // Load camps
    const loadCamps = () => {
        const camps = storage.get('camps') || [];
        const campsList = document.getElementById('campsList');
        
        if (!campsList) return;

        const statusFilter = document.getElementById('campStatusFilter')?.value || '';
        const typeFilter = document.getElementById('campTypeFilter')?.value || '';

        let filteredCamps = camps.filter(camp => {
            const matchesStatus = !statusFilter || camp.status === statusFilter;
            const matchesType = !typeFilter || camp.type === typeFilter;
            return matchesStatus && matchesType;
        });

        campsList.innerHTML = '';

        if (filteredCamps.length === 0) {
            campsList.innerHTML = '<p class="no-content">No hay campamentos programados</p>';
            return;
        }

        filteredCamps.forEach(camp => {
            const campCard = document.createElement('div');
            campCard.className = 'card camp-card';
            
            const occupancyPercentage = (camp.registrations / camp.capacity) * 100;
            
            campCard.innerHTML = `
                <h4>${camp.name}</h4>
                <p><strong>Tipo:</strong> ${camp.type}</p>
                <p><strong>Tema:</strong> ${camp.theme}</p>
                <p><strong>Fechas:</strong> ${utils.formatDate(camp.startDate)} - ${utils.formatDate(camp.endDate)}</p>
                <p><strong>Ubicación:</strong> ${camp.location}</p>
                <p><strong>Jefe de Campamento:</strong> ${camp.chief}</p>
                <p><strong>Costo:</strong> $${camp.cost}</p>
                <div class="progress-container">
                    <div class="progress-label">
                        <span>Inscripciones: ${camp.registrations}/${camp.capacity}</span>
                        <span>${occupancyPercentage.toFixed(0)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${occupancyPercentage}%"></div>
                    </div>
                </div>
                <p><span class="status-indicator ${camp.status}">${camp.status}</span></p>
                <div class="action-buttons">
                    <button class="btn btn-secondary btn-sm" onclick="editCamp(${camp.id})">Editar</button>
                    <button class="btn btn-secondary btn-sm" onclick="deleteCamp(${camp.id})">Eliminar</button>
                </div>
            `;
            campsList.appendChild(campCard);
        });
    };

    // Event listeners for filters
    document.getElementById('filterProgramGroup')?.addEventListener('change', loadPrograms);
    document.getElementById('filterProgramArea')?.addEventListener('change', loadPrograms);
    document.getElementById('eventTimeFilter')?.addEventListener('change', loadEvents);
    document.getElementById('campStatusFilter')?.addEventListener('change', loadCamps);
    document.getElementById('campTypeFilter')?.addEventListener('change', loadCamps);

    // Delete functions
    window.deleteProgram = (id) => {
        const programs = storage.get('educationalPrograms') || [];
        const updatedPrograms = programs.filter(program => program.id !== id);
        storage.set('educationalPrograms', updatedPrograms);
        loadPrograms();
        utils.showAlert('Programa eliminado exitosamente', 'success');
    };

    window.deleteEvent = (id) => {
        const events = storage.get('specialEvents') || [];
        const updatedEvents = events.filter(event => event.id !== id);
        storage.set('specialEvents', updatedEvents);
        loadEvents();
        utils.showAlert('Evento eliminado exitosamente', 'success');
    };

    window.deleteCamp = (id) => {
        const camps = storage.get('camps') || [];
        const updatedCamps = camps.filter(camp => camp.id !== id);
        storage.set('camps', updatedCamps);
        loadCamps();
        utils.showAlert('Campamento eliminado exitosamente', 'success');
    };

    // Initial load
    loadCalendar();
    loadPrograms();
    loadEvents();
    loadCamps();
});