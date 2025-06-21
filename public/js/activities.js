import utils from './utils.js';
import storage from './storage.js';

document.addEventListener('DOMContentLoaded', () => {
    const activityForm = document.getElementById('activityForm');
    const activitiesContainer = document.getElementById('activitiesContainer');
    const isAdmin = storage.get('adminLoggedIn');

    // Load existing activities
    const loadActivities = () => {
        const activities = storage.get('activities') || [];
        activitiesContainer.innerHTML = '';

        // Show login message if not admin
        if (!isAdmin) {
            const loginMessage = document.createElement('div');
            loginMessage.className = 'alert alert-info';
            loginMessage.innerHTML = `
                <p><strong>Nota:</strong> Inicia sesión como administrador para ver todas las actividades registradas en el sistema.</p>
                <p>Actualmente solo estás viendo las actividades públicas.</p>
                <a href="/pages/admin/login.html" class="btn btn-primary">Iniciar Sesión</a>
            `;
            activitiesContainer.appendChild(loginMessage);
        }

        // Filter activities based on login status
        // If admin, show all activities
        // If not admin, only show activities with public: true or without that property
        const filteredActivities = isAdmin 
            ? activities 
            : activities.filter(activity => !activity.hasOwnProperty('public') || activity.public === true);

        filteredActivities.forEach((activity, index) => {
            const activityCard = document.createElement('div');
            activityCard.className = 'card activity-card';
            activityCard.innerHTML = `
                <h3>${activity.name}</h3>
                <p class="date">${utils.formatDate(activity.date)} - ${activity.time}</p>
                <p>${activity.description}</p>
                <p><strong>Responsable:</strong> ${activity.responsible}</p>
                ${isAdmin ? `
                    <div class="button-group">
                        <button class="btn btn-secondary" onclick="editActivity(${index})">Editar</button>
                        <button class="btn btn-secondary" onclick="deleteActivity(${index})">Eliminar</button>
                        <button class="btn btn-secondary" onclick="togglePublicStatus(${index})">${activity.public !== false ? 'Hacer Privado' : 'Hacer Público'}</button>
                    </div>
                ` : ''}
            `;
            activitiesContainer.appendChild(activityCard);
        });

        // Show message if no activities
        if (filteredActivities.length === 0) {
            const noActivities = document.createElement('p');
            noActivities.className = 'no-content';
            noActivities.textContent = 'No hay actividades disponibles';
            activitiesContainer.appendChild(noActivities);
        }
    };

    // Hide form if not admin
    if (!isAdmin && activityForm) {
        activityForm.closest('section').style.display = 'none';
    }

    // Delete activity
    window.deleteActivity = (index) => {
        if (!isAdmin) return;
        const activities = storage.get('activities') || [];
        activities.splice(index, 1);
        storage.set('activities', activities);
        loadActivities();
        utils.showAlert('Actividad eliminada exitosamente', 'success');
    };

    // Toggle public status
    window.togglePublicStatus = (index) => {
        if (!isAdmin) return;
        const activities = storage.get('activities') || [];
        const activity = activities[index];
        
        // Toggle the public status
        activity.public = activity.public === false ? true : false;
        
        storage.set('activities', activities);
        loadActivities();
        utils.showAlert(`Actividad marcada como ${activity.public ? 'pública' : 'privada'}`, 'success');
    };

    // Edit activity
    window.editActivity = (index) => {
        if (!isAdmin) return;
        const activities = storage.get('activities') || [];
        const activity = activities[index];
        
        document.getElementById('activityName').value = activity.name;
        document.getElementById('activityDate').value = activity.date;
        document.getElementById('activityTime').value = activity.time;
        document.getElementById('activityDescription').value = activity.description;
        document.getElementById('activityResponsible').value = activity.responsible;
        
        activityForm.dataset.editIndex = index;
        document.querySelector('button[type="submit"]').textContent = 'Actualizar Actividad';
    };

    // Handle form submission
    if (activityForm && isAdmin) {
        activityForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const formData = new FormData(activityForm);
            
            const rules = {
                name: { required: true, minLength: 3 },
                date: { required: true },
                time: { required: true },
                description: { required: true },
                responsible: { required: true }
            };

            const errors = utils.validateForm(formData, rules);
            if (errors) {
                Object.values(errors).forEach(error => {
                    utils.showAlert(error, 'error');
                });
                return;
            }

            const activity = {
                name: formData.get('name'),
                date: formData.get('date'),
                time: formData.get('time'),
                description: formData.get('description'),
                responsible: formData.get('responsible'),
                public: true // Default to public
            };

            const activities = storage.get('activities') || [];
            const editIndex = activityForm.dataset.editIndex;

            if (editIndex !== undefined) {
                // Preserve the public status when editing
                if (activities[editIndex].hasOwnProperty('public')) {
                    activity.public = activities[editIndex].public;
                }
                activities[editIndex] = activity;
                delete activityForm.dataset.editIndex;
                document.querySelector('button[type="submit"]').textContent = 'Registrar Actividad';
            } else {
                activities.push(activity);
            }

            storage.set('activities', activities);
            activityForm.reset();
            loadActivities();
            utils.showAlert('Actividad guardada exitosamente', 'success');
        });
    }

    // Initial load of activities
    loadActivities();
    
    // Make functions available globally
    window.deleteActivity = deleteActivity;
    window.togglePublicStatus = togglePublicStatus;
    window.editActivity = editActivity;
});

export default {};