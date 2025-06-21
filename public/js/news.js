import utils from './utils.js';
import storage from './storage.js';

document.addEventListener('DOMContentLoaded', () => {
    const newsForm = document.getElementById('newsForm');
    const newsContainer = document.getElementById('newsContainer');
    const isAdmin = storage.get('adminLoggedIn');

    // Load existing news
    const loadNews = () => {
        const news = storage.get('news') || [];
        newsContainer.innerHTML = '';

        // Show login message if not admin
        if (!isAdmin) {
            const loginMessage = document.createElement('div');
            loginMessage.className = 'alert alert-info';
            loginMessage.innerHTML = `
                <p><strong>Nota:</strong> Inicia sesión como administrador para ver todas las noticias registradas en el sistema.</p>
                <p>Actualmente solo estás viendo las noticias públicas.</p>
                <a href="/pages/admin/login.html" class="btn btn-primary">Iniciar Sesión</a>
            `;
            newsContainer.appendChild(loginMessage);
        }

        // Filter news based on login status
        const filteredNews = isAdmin 
            ? news 
            : news.filter(item => !item.hasOwnProperty('public') || item.public === true);

        filteredNews.sort((a, b) => new Date(b.date) - new Date(a.date))
            .forEach((item, index) => {
                const newsCard = document.createElement('div');
                newsCard.className = 'card news-card';
                newsCard.innerHTML = `
                    <h3>${item.title}</h3>
                    <p class="date">${utils.formatDate(item.date)}</p>
                    <p>${item.content}</p>
                    ${isAdmin ? `
                        <div class="button-group">
                            <button class="btn btn-secondary" onclick="editNews(${index})">Editar</button>
                            <button class="btn btn-secondary" onclick="deleteNews(${index})">Eliminar</button>
                            <button class="btn btn-secondary" onclick="toggleNewsPublic(${index})">${item.public !== false ? 'Hacer Privado' : 'Hacer Público'}</button>
                        </div>
                    ` : ''}
                `;
                newsContainer.appendChild(newsCard);
            });

        // Show message if no news
        if (filteredNews.length === 0) {
            const noNews = document.createElement('p');
            noNews.className = 'no-content';
            noNews.textContent = 'No hay noticias disponibles';
            newsContainer.appendChild(noNews);
        }
    };

    // Hide form if not admin
    if (!isAdmin && newsForm) {
        newsForm.closest('section').style.display = 'none';
    }

    // Delete news
    window.deleteNews = (index) => {
        if (!isAdmin) return;
        const news = storage.get('news') || [];
        news.splice(index, 1);
        storage.set('news', news);
        loadNews();
        utils.showAlert('Noticia eliminada exitosamente', 'success');
    };

    // Toggle news public status
    window.toggleNewsPublic = (index) => {
        if (!isAdmin) return;
        const news = storage.get('news') || [];
        const item = news[index];
        
        // Toggle the public status
        item.public = item.public === false ? true : false;
        
        storage.set('news', news);
        loadNews();
        utils.showAlert(`Noticia marcada como ${item.public ? 'pública' : 'privada'}`, 'success');
    };

    // Edit news
    window.editNews = (index) => {
        if (!isAdmin) return;
        const news = storage.get('news') || [];
        const item = news[index];
        
        document.getElementById('newsTitle').value = item.title;
        document.getElementById('newsContent').value = item.content;
        
        newsForm.dataset.editIndex = index;
        document.querySelector('button[type="submit"]').textContent = 'Actualizar Noticia';
    };

    // Handle form submission
    if (newsForm && isAdmin) {
        newsForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const formData = new FormData(newsForm);
            
            const rules = {
                title: { required: true, minLength: 3 },
                content: { required: true, minLength: 10 }
            };

            const errors = utils.validateForm(formData, rules);
            if (errors) {
                Object.values(errors).forEach(error => {
                    utils.showAlert(error, 'error');
                });
                return;
            }

            const newsItem = {
                title: formData.get('title'),
                content: formData.get('content'),
                date: new Date().toISOString(),
                public: true // Default to public
            };

            const news = storage.get('news') || [];
            const editIndex = newsForm.dataset.editIndex;

            if (editIndex !== undefined) {
                // Preserve the public status when editing
                if (news[editIndex].hasOwnProperty('public')) {
                    newsItem.public = news[editIndex].public;
                }
                news[editIndex] = newsItem;
                delete newsForm.dataset.editIndex;
                document.querySelector('button[type="submit"]').textContent = 'Publicar Noticia';
            } else {
                news.push(newsItem);
            }

            storage.set('news', news);
            newsForm.reset();
            loadNews();
            utils.showAlert('Noticia guardada exitosamente', 'success');
        });
    }

    // Initial load of news
    loadNews();
    
    // Make functions available globally
    window.deleteNews = deleteNews;
    window.toggleNewsPublic = toggleNewsPublic;
    window.editNews = editNews;
});

export default {};