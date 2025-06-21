import supabaseClient from './supabase-client.js';
import utils from './utils.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOMContentLoaded event fired in visit.js');
    const contactForm = document.getElementById('contactForm');
    const messagesContainer = document.getElementById('messagesContainer');

    // Renderizar mensajes desde localStorage
    renderMessages();

    // Initialize Supabase client
    const supabase = await supabaseClient.init();

    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            try {
                e.preventDefault();

                const formData = new FormData(contactForm);

                const rules = {
                    name: { required: true, minLength: 3 },
                    email: { required: true },
                    phone: { required: true },
                    message: { required: true, minLength: 10 }
                };

                const errors = utils.validateForm(formData, rules);
                if (errors) {
                    Object.values(errors).forEach(error => {
                        utils.showAlert(error, 'error');
                    });
                    return;
                }

                const contact = {
                    name: formData.get('name'),
                    email: formData.get('email'),
                    phone: formData.get('phone'),
                    message: formData.get('message'),
                    date: new Date().toISOString(),
                    status: 'pending'
                };

                // Guardar en localStorage
                saveToLocalStorage(contact);

                // Guardar en Supabase
                try {
                    const { data, error } = await supabase.from('contacts').insert([contact]);
                    if (error) {
                        throw error;
                    }
                    utils.showAlert('Mensaje enviado exitosamente. Nos pondremos en contacto contigo pronto.', 'success');
                    contactForm.reset();
                    renderMessages();
                } catch (error) {
                    utils.showAlert('Error al enviar el formulario a la base de datos. Por favor, inténtalo de nuevo.', 'error');
                    console.error(error);
                }
            } catch (err) {
                console.error('Error en el manejador de envío del formulario:', err);
            }
        });
    }

    function saveToLocalStorage(contact) {
        const contacts = JSON.parse(localStorage.getItem('contacts') || '[]');
        contacts.push(contact);
        localStorage.setItem('contacts', JSON.stringify(contacts));
    }

    function renderMessages() {
        if (!messagesContainer) return;
        const contacts = JSON.parse(localStorage.getItem('contacts') || '[]');
        messagesContainer.innerHTML = contacts.map(contact => `
            <div class="message-card ${contact.status === 'read' ? 'read' : ''}">
                <p><strong>${contact.name}</strong> (${contact.email})</p>
                <p>${contact.message}</p>
                <small>${new Date(contact.date).toLocaleString()}</small><br>
            </div>
        `).join('');
    }
});

export default {};
