import storage from './storage.js';
import utils from './utils.js';


document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    const isAdmin = storage.get('adminLoggedIn');
    
    // Load and display featured news on homepage
    const newsContainer = document.getElementById('news-container');
    if (newsContainer) {
        const news = storage.get('news') || [];
        
        // Filter news based on login status
        const filteredNews = isAdmin 
            ? news 
            : news.filter(item => !item.hasOwnProperty('public') || item.public === true);
            
        const featuredNews = filteredNews
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 3);
        
        if (featuredNews.length > 0) {
            featuredNews.forEach(item => {
                const newsCard = document.createElement('div');
                newsCard.className = 'card news-card';
                newsCard.innerHTML = `
                    <h3>${item.title}</h3>
                    <p class="date">${utils.formatDate(item.date)}</p>
                    <p>${item.content.substring(0, 150)}...</p>
                    <a href="pages/noticias.html" class="btn btn-primary">Leer más</a>
                `;
                newsContainer.appendChild(newsCard);
            });
        } else {
            newsContainer.innerHTML = '<p class="no-content">No hay noticias disponibles</p>';
        }
        
       }

    // Load and display upcoming activities on homepage
    const activitiesContainer = document.getElementById('activities-container');
    if (activitiesContainer) {
        const activities = storage.get('activities') || [];
        
        // Filter activities based on login status
        const filteredActivities = isAdmin 
            ? activities 
            : activities.filter(activity => !activity.hasOwnProperty('public') || activity.public === true);
            
        const upcomingActivities = filteredActivities
            .filter(activity => new Date(activity.date) >= new Date())
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(0, 3);
        
        if (upcomingActivities.length > 0) {
            upcomingActivities.forEach(activity => {
                const activityCard = document.createElement('div');
                activityCard.className = 'card activity-card';
                activityCard.innerHTML = `
                    <h3>${activity.name}</h3>
                    <p class="date">${utils.formatDate(activity.date)} - ${activity.time}</p>
                    <p>${activity.description}</p>
                    <p><strong>Responsable:</strong> ${activity.responsible}</p>
                    <a href="pages/actividades.html" class="btn btn-primary">Ver todas las actividades</a>
                `;
                activitiesContainer.appendChild(activityCard);
            });
        } else {
            activitiesContainer.innerHTML = '<p class="no-content">No hay actividades próximas</p>';
        }
    }
});