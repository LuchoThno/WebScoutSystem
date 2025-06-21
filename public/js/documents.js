import utils from './utils.js';
import storage from './storage.js';

document.addEventListener('DOMContentLoaded', () => {
    const documentForm = document.getElementById('documentForm');
    const documentsContainer = document.getElementById('documentsContainer');
    const isAdmin = storage.get('adminLoggedIn');

    // Load existing documents
    const loadDocuments = () => {
        const documents = storage.get('documents') || [];
        documentsContainer.innerHTML = '';

        // Show login message if not admin
        if (!isAdmin) {
            const loginMessage = document.createElement('div');
            loginMessage.className = 'alert alert-info';
            loginMessage.innerHTML = `
                <p><strong>Nota:</strong> Inicia sesión como administrador para ver todos los documentos registrados en el sistema.</p>
                <p>Actualmente solo estás viendo los documentos públicos.</p>
                <a href="/pages/admin/login.html" class="btn btn-primary">Iniciar Sesión</a>
            `;
            documentsContainer.appendChild(loginMessage);
        }

        // Filter documents based on login status
        const filteredDocuments = isAdmin 
            ? documents 
            : documents.filter(doc => !doc.hasOwnProperty('public') || doc.public === true);

        filteredDocuments.forEach((doc, index) => {
            const documentCard = document.createElement('div');
            documentCard.className = 'card document-card';
            documentCard.innerHTML = `
                <div class="document-info">
                    <h3>${doc.name}</h3>
                    <p class="date">Subido el ${utils.formatDate(doc.uploadDate)}</p>
                </div>
                <div class="button-group">
                    <a href="${doc.url}" class="btn btn-primary" download="${doc.name}">Descargar</a>
                    ${isAdmin ? `
                        <button class="btn btn-secondary" onclick="toggleDocumentPublic(${index})">${doc.public !== false ? 'Hacer Privado' : 'Hacer Público'}</button>
                        <button class="btn btn-secondary" onclick="deleteDocument(${index})">Eliminar</button>
                    ` : ''}
                </div>
            `;
            documentsContainer.appendChild(documentCard);
        });

        // Show message if no documents
        if (filteredDocuments.length === 0) {
            const noDocuments = document.createElement('p');
            noDocuments.className = 'no-content';
            noDocuments.textContent = 'No hay documentos disponibles';
            documentsContainer.appendChild(noDocuments);
        }
    };

    // Hide form if not admin
    if (!isAdmin && documentForm) {
        documentForm.closest('section').style.display = 'none';
    }

    // Delete document
    window.deleteDocument = (index) => {
        if (!isAdmin) return;
        const documents = storage.get('documents') || [];
        documents.splice(index, 1);
        storage.set('documents', documents);
        loadDocuments();
        utils.showAlert('Documento eliminado exitosamente', 'success');
    };

    // Toggle document public status
    window.toggleDocumentPublic = (index) => {
        if (!isAdmin) return;
        const documents = storage.get('documents') || [];
        const document = documents[index];
        
        // Toggle the public status
        document.public = document.public === false ? true : false;
        
        storage.set('documents', documents);
        loadDocuments();
        utils.showAlert(`Documento marcado como ${document.public ? 'público' : 'privado'}`, 'success');
    };

    // Handle form submission
    if (documentForm && isAdmin) {
        documentForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const fileInput = document.getElementById('documentFile');
            const file = fileInput.files[0];

            if (!file) {
                utils.showAlert('Por favor selecciona un archivo', 'error');
                return;
            }

            const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!allowedTypes.includes(file.type)) {
                utils.showAlert('Solo se permiten archivos PDF o DOCX', 'error');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const document = {
                    name: file.name,
                    url: e.target.result,
                    uploadDate: new Date().toISOString(),
                    type: file.type,
                    public: true // Default to public
                };

                const documents = storage.get('documents') || [];
                documents.push(document);
                storage.set('documents', documents);

                documentForm.reset();
                loadDocuments();
                utils.showAlert('Documento subido exitosamente', 'success');
            };

            reader.readAsDataURL(file);
        });
    }

    // Initial load of documents
    loadDocuments();
    
    // Make functions available globally
    window.deleteDocument = deleteDocument;
    window.toggleDocumentPublic = toggleDocumentPublic;
});

export default {};