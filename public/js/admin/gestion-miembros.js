document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    if (!storage.get('adminLoggedIn')) {
        window.location.href = 'login.html';
        return;
    }

    // Initialize Supabase connection
    const SUPABASE_URL = 'https://swkdhtjpykqdislgqssd.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3a2RodGpweWtxZGlzbGdxc3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQxOTcsImV4cCI6MjA2NTM0MDE5N30.4YeMQVZsPwNUqef54Ww-IFOwjBwHUN0ox49Bu5dQqbs';

    // Initialize Supabase client
    const supabase = window.supabase?.createClient ? 
        window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

    // Pagination state
    let currentPage = 0;
    const pageSize = 20;

    // Populate scout dropdown function - moved to top level
    const populateScoutDropdowns = async () => {
        try {
            let scouts = [];

            if (supabase) {
                const { data, error } = await supabase.from('scouts').select('*');
                if (error) throw error;
                scouts = data || [];
            } else {
                scouts = storage.get('scouts') || [];
            }

            const medicalScoutSelect = document.getElementById('medicalScout');
            const docScoutSelect = document.getElementById('docScout');
            
            [medicalScoutSelect, docScoutSelect].forEach(select => {
                if (select) {
                    select.innerHTML = '<option value="">Seleccionar scout</option>';
                    scouts.forEach(scout => {
                        const option = document.createElement('option');
                        option.value = scout.id;
                        option.textContent = scout.name;
                        select.appendChild(option);
                    });
                }
            });
        } catch (error) {
            console.error('Error loading scouts for dropdowns:', error);
        }
    };

    // Tab functionality with enhanced navigation
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;
            
            // Remove active class from all tabs and contents
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            btn.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
            
            // Load tab-specific content
            loadTabContent(targetTab);
        });
    });

    // Load tab-specific content
    const loadTabContent = (tabId) => {
        switch(tabId) {
            case 'registro':
                loadScouts();
                break;
            case 'asistencia':
                // Initialize attendance date to today
                const attendanceDateInput = document.getElementById('attendanceDate');
                if (attendanceDateInput && !attendanceDateInput.value) {
                    attendanceDateInput.value = new Date().toISOString().split('T')[0];
                }
                break;
            case 'fichas':
                loadMedicalRecords();
                populateScoutDropdowns();
                break;
            case 'documentacion':
                loadDocumentationStatus();
                populateScoutDropdowns();
                break;
        }
    };

    // Scout registration form
    const scoutForm = document.getElementById('scoutForm');
    if (scoutForm) {
        scoutForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(scoutForm);
            
            // Validate form data
            const rules = {
                name: { required: true, minLength: 3 },
                birthdate: { required: true },
                group: { required: true },
                parentName: { required: true },
                parentPhone: { required: true }
            };
            
            const errors = utils.validateForm(formData, rules);
            if (errors) {
                Object.values(errors).forEach(error => {
                    utils.showAlert(error, 'error');
                });
                return;
            }
            
            const scout = {
                name: formData.get('name'),
                birthdate: formData.get('birthdate'),
                group_section: formData.get('group'),
                status: formData.get('status'),
                parent_name: formData.get('parentName'),
                parent_phone: formData.get('parentPhone'),
                address: formData.get('address'),
                registration_date: new Date().toISOString()
            };

            try {
                if (supabase) {
                    // Save to Supabase
                    const { data, error } = await supabase
                        .from('scouts')
                        .insert([scout]);

                    if (error) throw error;
                    
                    utils.showAlert('Scout registrado en Supabase exitosamente', 'success');
                } else {
                    // Fallback to localStorage
                    const scouts = storage.get('scouts') || [];
                    scout.id = Date.now();
                    scouts.push(scout);
                    storage.set('scouts', scouts);
                    
                    utils.showAlert('Scout registrado exitosamente', 'success');
                }

                scoutForm.reset();
                await loadScouts();
                
            } catch (error) {
                console.error('Error saving scout:', error);
                utils.showAlert('Error al guardar el scout', 'error');
            }
        });
    }

    // Load scouts with pagination and search
    const loadScouts = async () => {
        const scoutsList = document.getElementById('scoutsList');
        const searchTerm = document.getElementById('searchScouts')?.value.toLowerCase() || '';
        const groupFilter = document.getElementById('filterGroup')?.value || '';

        let scouts = [];

        try {
            if (supabase) {
                // Load from Supabase with pagination
                let query = supabase.from('scouts').select('*');
                
                if (groupFilter) {
                    query = query.eq('group_section', groupFilter);
                }
                
                // Add search functionality at database level
                if (searchTerm && searchTerm.trim() !== '') {
                    query = query.ilike('name', `%${searchTerm}%`);
                }
                
                // Add pagination
                const from = currentPage * pageSize;
                const to = from + pageSize - 1;
                
                const { data, error, count } = await query
                    .order('created_at', { ascending: false })
                    .range(from, to);
                
                if (error) throw error;
                scouts = data || [];
                
                // Add pagination controls if needed
                if (scoutsList && count > pageSize) {
                    const paginationControls = document.createElement('div');
                    paginationControls.className = 'pagination-controls';
                    paginationControls.innerHTML = `
                        <button class="btn btn-secondary btn-sm" ${currentPage === 0 ? 'disabled' : ''} 
                            onclick="changePage(${currentPage - 1})">Anterior</button>
                        <span>Página ${currentPage + 1}</span>
                        <button class="btn btn-secondary btn-sm" ${(currentPage + 1) * pageSize >= count ? 'disabled' : ''} 
                            onclick="changePage(${currentPage + 1})">Siguiente</button>
                    `;
                    
                    // Add pagination after the list
                    const existingPagination = document.querySelector('.pagination-controls');
                    if (existingPagination) {
                        existingPagination.replaceWith(paginationControls);
                    } else {
                        scoutsList.parentNode.appendChild(paginationControls);
                    }
                }
            } else {
                // Fallback to localStorage
                scouts = storage.get('scouts') || [];
                
                if (groupFilter) {
                    scouts = scouts.filter(scout => scout.group === groupFilter || scout.group_section === groupFilter);
                }
                
                // Apply search filter
                if (searchTerm) {
                    scouts = scouts.filter(scout => 
                        scout.name.toLowerCase().includes(searchTerm)
                    );
                }
                
                // Sort by most recent
                scouts.sort((a, b) => new Date(b.created_at || b.registration_date) - new Date(a.created_at || a.registration_date));
            }

            if (scoutsList) {
                scoutsList.innerHTML = '';
                
                if (scouts.length === 0) {
                    scoutsList.innerHTML = '<p class="no-content">No hay scouts registrados</p>';
                    return;
                }

                const groupNames = {
                    'bandada': '🐦 Bandada',
                    'manada': '🐺 Manada',
                    'compania': '🍀 Compañía',
                    'tropa': '🏕️ Tropa',
                    'avanzada': '🌠 Avanzada',
                    'clan': '🔥 Clan'
                };

                scouts.forEach((scout) => {
                    const scoutCard = document.createElement('div');
                    scoutCard.className = 'card member-card';
                    
                    // Use group_section if available, fallback to group
                    const groupKey = scout.group_section || scout.group;
                    
                    scoutCard.innerHTML = `
                        <h4>${scout.name}</h4>
                        <p><strong>Grupo:</strong> ${groupNames[groupKey] || groupKey}</p>
                        <p><strong>Edad:</strong> ${calculateAge(scout.birthdate)} años</p>
                        <p><strong>Estado:</strong> <span class="status-indicator ${scout.status}">${scout.status}</span></p>
                        <p><strong>Padre/Madre:</strong> ${scout.parent_name}</p>
                        <p><strong>Teléfono:</strong> ${scout.parent_phone}</p>
                        <div class="action-buttons">
                            <button class="btn btn-primary btn-sm" onclick="viewScoutDetails('${scout.id}')">Ver Detalles</button>
                            <button class="btn btn-secondary btn-sm" onclick="editScout('${scout.id}')">Editar</button>
                            <button class="btn btn-secondary btn-sm" onclick="deleteScout('${scout.id}')">Eliminar</button>
                        </div>
                    `;
                    scoutsList.appendChild(scoutCard);
                });
            }
        } catch (error) {
            console.error('Error loading scouts:', error);
            utils.showAlert('Error al cargar los scouts', 'error');
        }
    };

    // Change page function for pagination
    window.changePage = (page) => {
        currentPage = page;
        loadScouts();
    };

    // View scout details
    window.viewScoutDetails = async (id) => {
        try {
            let scout;
            let medicalRecord;
            let documentationRecord;
            
            if (supabase) {
                // Get scout from Supabase
                const { data: scoutData, error: scoutError } = await supabase
                    .from('scouts')
                    .select('*')
                    .eq('id', id)
                    .single();
                
                if (scoutError) throw scoutError;
                scout = scoutData;
                
                // Get medical record
                const { data: medicalData, error: medicalError } = await supabase
                    .from('medical_records')
                    .select('*')
                    .eq('scout_id', id)
                    .maybeSingle();
                
                if (medicalError && medicalError.code !== 'PGRST116') throw medicalError;
                medicalRecord = medicalData;
                
                // Get documentation record
                const { data: docData, error: docError } = await supabase
                    .from('documentation_records')
                    .select('*')
                    .eq('scout_id', id)
                    .maybeSingle();
                
                if (docError && docError.code !== 'PGRST116') throw docError;
                documentationRecord = docData;
            } else {
                // Fallback to localStorage
                const scouts = storage.get('scouts') || [];
                scout = scouts.find(s => s.id == id);
                
                const medicalRecords = storage.get('medicalRecords') || [];
                medicalRecord = medicalRecords.find(r => r.scout_id == id);
                
                const documentationRecords = storage.get('documentationRecords') || [];
                documentationRecord = documentationRecords.find(r => r.scout_id == id);
            }
            
            if (!scout) {
                utils.showAlert('Scout no encontrado', 'error');
                return;
            }
            
            // Create modal with scout details
            const modalHTML = `
                <div class="modal-overlay" style="
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                ">
                    <div class="modal-content" style="
                        background: white;
                        padding: 2rem;
                        border-radius: 8px;
                        max-width: 800px;
                        max-height: 90vh;
                        overflow-y: auto;
                        width: 90%;
                    ">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                            <h2>Detalles del Scout</h2>
                            <button onclick="closeModal()" style="
                                background: none;
                                border: none;
                                font-size: 1.5rem;
                                cursor: pointer;
                            ">&times;</button>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem;">
                            <div>
                                <h3>Datos Personales</h3>
                                <p><strong>Nombre:</strong> ${scout.name}</p>
                                <p><strong>Fecha de Nacimiento:</strong> ${utils.formatDate(scout.birthdate)}</p>
                                <p><strong>Edad:</strong> ${calculateAge(scout.birthdate)} años</p>
                                <p><strong>Grupo:</strong> ${scout.group_section || scout.group}</p>
                                <p><strong>Estado:</strong> ${scout.status}</p>
                                <p><strong>Dirección:</strong> ${scout.address || 'No especificada'}</p>
                                <p><strong>Fecha de Registro:</strong> ${utils.formatDate(scout.registration_date)}</p>
                            </div>
                            
                            <div>
                                <h3>Contacto</h3>
                                <p><strong>Padre/Madre:</strong> ${scout.parent_name}</p>
                                <p><strong>Teléfono:</strong> ${scout.parent_phone}</p>
                            </div>
                            
                            ${medicalRecord ? `
                                <div>
                                    <h3>Ficha Médica</h3>
                                    <p><strong>Tipo de Sangre:</strong> ${medicalRecord.blood_type || 'No especificado'}</p>
                                    <p><strong>Contacto de Emergencia:</strong> ${medicalRecord.emergency_contact || 'No especificado'}</p>
                                    <p><strong>Alergias:</strong> ${medicalRecord.allergies || 'Ninguna'}</p>
                                    <p><strong>Medicamentos:</strong> ${medicalRecord.medications || 'Ninguno'}</p>
                                    <p><strong>Condiciones Médicas:</strong> ${medicalRecord.medical_conditions || 'Ninguna'}</p>
                                    <p><strong>Médico:</strong> ${medicalRecord.doctor_name || 'No especificado'}</p>
                                    <p><strong>Teléfono Médico:</strong> ${medicalRecord.doctor_phone || 'No especificado'}</p>
                                </div>
                            ` : `
                                <div>
                                    <h3>Ficha Médica</h3>
                                    <p>No hay información médica registrada</p>
                                    <button class="btn btn-primary btn-sm" onclick="switchToTab('fichas'); closeModal();">Agregar Ficha Médica</button>
                                </div>
                            `}
                            
                            ${documentationRecord ? `
                                <div>
                                    <h3>Documentación</h3>
                                    <p><strong>Estado:</strong> <span class="status-indicator ${documentationRecord.status}">${documentationRecord.status}</span></p>
                                    <p><strong>Documentos:</strong> ${documentationRecord.documents.length}/6</p>
                                    <p><strong>Notas:</strong> ${documentationRecord.notes || 'Ninguna'}</p>
                                    <p><strong>Última Actualización:</strong> ${utils.formatDate(documentationRecord.last_updated)}</p>
                                </div>
                            ` : `
                                <div>
                                    <h3>Documentación</h3>
                                    <p>No hay documentación registrada</p>
                                    <button class="btn btn-primary btn-sm" onclick="switchToTab('documentacion'); closeModal();">Agregar Documentación</button>
                                </div>
                            `}
                        </div>
                        
                        <div style="margin-top: 2rem; display: flex; gap: 1rem; justify-content: flex-end;">
                            <button class="btn btn-secondary" onclick="editScout('${scout.id}'); closeModal();">Editar Scout</button>
                            <button class="btn btn-primary" onclick="closeModal()">Cerrar</button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        } catch (error) {
            console.error('Error loading scout details:', error);
            utils.showAlert('Error al cargar los detalles del scout', 'error');
        }
    };

    // Close modal
    window.closeModal = () => {
        const modal = document.querySelector('.modal-overlay');
        if (modal) {
            modal.remove();
        }
    };

    // Edit scout
    window.editScout = async (id) => {
        try {
            let scout;
            
            if (supabase) {
                const { data, error } = await supabase
                    .from('scouts')
                    .select('*')
                    .eq('id', id)
                    .single();
                
                if (error) throw error;
                scout = data;
            } else {
                const scouts = storage.get('scouts') || [];
                scout = scouts.find(s => s.id == id);
            }
            
            if (!scout) {
                utils.showAlert('Scout no encontrado', 'error');
                return;
            }
            
            // Fill form with scout data
            document.getElementById('scoutName').value = scout.name;
            document.getElementById('scoutBirthdate').value = scout.birthdate;
            document.getElementById('scoutGroup').value = scout.group_section || scout.group;
            document.getElementById('scoutStatus').value = scout.status;
            document.getElementById('parentName').value = scout.parent_name;
            document.getElementById('parentPhone').value = scout.parent_phone;
            document.getElementById('scoutAddress').value = scout.address || '';
            
            // Set form to edit mode
            scoutForm.dataset.editId = id;
            document.querySelector('#scoutForm button[type="submit"]').textContent = 'Actualizar Scout';
            
            // Scroll to form
            scoutForm.scrollIntoView({ behavior: 'smooth' });
            
            // Switch to registro tab if needed
            switchToTab('registro');
        } catch (error) {
            console.error('Error loading scout for edit:', error);
            utils.showAlert('Error al cargar el scout para editar', 'error');
        }
    };

    // Delete scout
    window.deleteScout = async (id) => {
        if (!confirm('¿Está seguro de que desea eliminar este scout?')) {
            return;
        }

        try {
            if (supabase) {
                const { error } = await supabase
                    .from('scouts')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
            } else {
                const scouts = storage.get('scouts') || [];
                const updatedScouts = scouts.filter(scout => scout.id != id);
                storage.set('scouts', updatedScouts);
            }

            await loadScouts();
            utils.showAlert('Scout eliminado exitosamente', 'success');
        } catch (error) {
            console.error('Error deleting scout:', error);
            utils.showAlert('Error al eliminar el scout', 'error');
        }
    };

    // Attendance functionality
    const loadAttendance = async () => {
        const attendanceDate = document.getElementById('attendanceDate').value;
        const attendanceGroup = document.getElementById('attendanceGroup').value;
        const attendanceActivity = document.getElementById('attendanceActivity').value;

        if (!attendanceDate || !attendanceActivity) {
            utils.showAlert('Por favor complete la fecha y actividad', 'error');
            return;
        }

        try {
            let scouts = [];

            if (supabase) {
                let query = supabase.from('scouts').select('*').eq('status', 'activo');
                
                if (attendanceGroup) {
                    query = query.eq('group_section', attendanceGroup);
                }
                
                const { data, error } = await query;
                if (error) throw error;
                scouts = data || [];
            } else {
                scouts = storage.get('scouts') || [];
                scouts = scouts.filter(scout => scout.status === 'activo');
                
                if (attendanceGroup) {
                    scouts = scouts.filter(scout => scout.group === attendanceGroup || scout.group_section === attendanceGroup);
                }
            }

            const attendanceList = document.getElementById('attendanceList');
            attendanceList.innerHTML = '';

            if (scouts.length === 0) {
                attendanceList.innerHTML = '<p class="no-content">No hay scouts para tomar asistencia</p>';
                return;
            }

            scouts.forEach(scout => {
                const attendanceItem = document.createElement('div');
                attendanceItem.className = 'attendance-item';
                attendanceItem.innerHTML = `
                    <span>${scout.name}</span>
                    <div class="attendance-status">
                        <label>
                            <input type="radio" name="attendance_${scout.id}" value="present">
                            Presente
                        </label>
                        <label>
                            <input type="radio" name="attendance_${scout.id}" value="absent">
                            Ausente
                        </label>
                        <label>
                            <input type="radio" name="attendance_${scout.id}" value="late">
                            Tardanza
                        </label>
                    </div>
                `;
                attendanceList.appendChild(attendanceItem);
            });

            document.getElementById('saveAttendance').style.display = 'block';
        } catch (error) {
            console.error('Error loading attendance:', error);
            utils.showAlert('Error al cargar la asistencia', 'error');
        }
    };

    // Save attendance
    const saveAttendance = async () => {
        const attendanceDate = document.getElementById('attendanceDate').value;
        const attendanceGroup = document.getElementById('attendanceGroup').value;
        const attendanceActivity = document.getElementById('attendanceActivity').value;
        
        const attendanceData = {
            date: attendanceDate,
            group: attendanceGroup,
            activity: attendanceActivity,
            records: []
        };

        try {
            let scouts = [];

            if (supabase) {
                const { data, error } = await supabase.from('scouts').select('*');
                if (error) throw error;
                scouts = data || [];
            } else {
                scouts = storage.get('scouts') || [];
            }

            scouts.forEach(scout => {
                const radioButtons = document.querySelectorAll(`input[name="attendance_${scout.id}"]:checked`);
                if (radioButtons.length > 0) {
                    attendanceData.records.push({
                        scout_id: scout.id,
                        scout_name: scout.name,
                        status: radioButtons[0].value
                    });
                }
            });

            if (supabase) {
                // Save attendance to Supabase
                const { error } = await supabase
                    .from('attendance')
                    .insert([attendanceData]);

                if (error) throw error;
            } else {
                // Fallback to localStorage
                const attendanceRecords = storage.get('attendance') || [];
                attendanceRecords.push(attendanceData);
                storage.set('attendance', attendanceRecords);
            }
            
            utils.showAlert('Asistencia guardada exitosamente', 'success');
            document.getElementById('attendanceList').innerHTML = '';
            document.getElementById('saveAttendance').style.display = 'none';
        } catch (error) {
            console.error('Error saving attendance:', error);
            utils.showAlert('Error al guardar la asistencia', 'error');
        }
    };

    // Medical form functionality
    const medicalForm = document.getElementById('medicalForm');
    if (medicalForm) {
        medicalForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(medicalForm);
            
            // Validate form data
            const rules = {
                scoutId: { required: true },
                bloodType: { required: true },
                emergencyContact: { required: true }
            };
            
            const errors = utils.validateForm(formData, rules);
            if (errors) {
                Object.values(errors).forEach(error => {
                    utils.showAlert(error, 'error');
                });
                return;
            }
            
            const medicalRecord = {
                scout_id: formData.get('scoutId'),
                blood_type: formData.get('bloodType'),
                emergency_contact: formData.get('emergencyContact'),
                allergies: formData.get('allergies'),
                medications: formData.get('medications'),
                medical_conditions: formData.get('medicalConditions'),
                doctor_name: formData.get('doctorName'),
                doctor_phone: formData.get('doctorPhone'),
                created_date: new Date().toISOString()
            };

            try {
                if (supabase) {
                    // Check if record exists
                    const { data: existing, error: checkError } = await supabase
                        .from('medical_records')
                        .select('*')
                        .eq('scout_id', formData.get('scoutId'))
                        .maybeSingle();
                    
                    if (checkError && checkError.code !== 'PGRST116') throw checkError;
                    
                    if (existing) {
                        // Update existing record
                        const { error } = await supabase
                            .from('medical_records')
                            .update(medicalRecord)
                            .eq('scout_id', formData.get('scoutId'));
                        
                        if (error) throw error;
                    } else {
                        // Insert new record
                        const { data, error } = await supabase
                            .from('medical_records')
                            .insert([medicalRecord]);

                        if (error) throw error;
                    }
                } else {
                    const medicalRecords = storage.get('medicalRecords') || [];
                    
                    // Check if record exists
                    const existingIndex = medicalRecords.findIndex(r => r.scout_id == medicalRecord.scout_id);
                    
                    if (existingIndex >= 0) {
                        // Update existing record
                        medicalRecords[existingIndex] = {
                            ...medicalRecords[existingIndex],
                            ...medicalRecord
                        };
                    } else {
                        // Add new record
                        medicalRecord.id = Date.now();
                        medicalRecords.push(medicalRecord);
                    }
                    
                    storage.set('medicalRecords', medicalRecords);
                }

                medicalForm.reset();
                await loadMedicalRecords();
                utils.showAlert('Ficha médica guardada exitosamente', 'success');
            } catch (error) {
                console.error('Error saving medical record:', error);
                utils.showAlert('Error al guardar la ficha médica', 'error');
            }
        });
    }

    // Load medical records
    const loadMedicalRecords = async () => {
        const medicalRecordsList = document.getElementById('medicalRecords');

        try {
            let medicalRecords = [];
            let scouts = [];

            if (supabase) {
                const { data: recordsData, error: recordsError } = await supabase
                    .from('medical_records')
                    .select('*');
                
                const { data: scoutsData, error: scoutsError } = await supabase
                    .from('scouts')
                    .select('*');
                
                if (recordsError) throw recordsError;
                if (scoutsError) throw scoutsError;
                
                medicalRecords = recordsData || [];
                scouts = scoutsData || [];
            } else {
                medicalRecords = storage.get('medicalRecords') || [];
                scouts = storage.get('scouts') || [];
            }

            if (medicalRecordsList) {
                medicalRecordsList.innerHTML = '';
                
                if (medicalRecords.length === 0) {
                    medicalRecordsList.innerHTML = '<p class="no-content">No hay fichas médicas registradas</p>';
                    return;
                }

                medicalRecords.forEach(record => {
                    const scout = scouts.find(s => s.id == record.scout_id);
                    if (!scout) return; // Skip if scout not found
                    
                    const recordCard = document.createElement('div');
                    recordCard.className = 'card medical-record-card';
                    recordCard.innerHTML = `
                        <h4>${scout ? scout.name : 'Scout no encontrado'}</h4>
                        <p><strong>Tipo de Sangre:</strong> ${record.blood_type}</p>
                        <p><strong>Contacto de Emergencia:</strong> ${record.emergency_contact}</p>
                        <p><strong>Alergias:</strong> ${record.allergies || 'Ninguna'}</p>
                        <p><strong>Medicamentos:</strong> ${record.medications || 'Ninguno'}</p>
                        <div class="action-buttons">
                            <button class="btn btn-primary btn-sm" onclick="viewMedicalRecord('${record.id}')">Ver Detalles</button>
                            <button class="btn btn-secondary btn-sm" onclick="editMedicalRecord('${record.scout_id}')">Editar</button>
                            <button class="btn btn-secondary btn-sm" onclick="deleteMedicalRecord('${record.id}')">Eliminar</button>
                        </div>
                    `;
                    medicalRecordsList.appendChild(recordCard);
                });
            }
        } catch (error) {
            console.error('Error loading medical records:', error);
            utils.showAlert('Error al cargar las fichas médicas', 'error');
        }
    };

    // View medical record details
    window.viewMedicalRecord = async (id) => {
        try {
            let record;
            let scout;
            
            if (supabase) {
                const { data: recordData, error: recordError } = await supabase
                    .from('medical_records')
                    .select('*')
                    .eq('id', id)
                    .single();
                
                if (recordError) throw recordError;
                record = recordData;
                
                const { data: scoutData, error: scoutError } = await supabase
                    .from('scouts')
                    .select('*')
                    .eq('id', record.scout_id)
                    .single();
                
                if (scoutError) throw scoutError;
                scout = scoutData;
            } else {
                const medicalRecords = storage.get('medicalRecords') || [];
                record = medicalRecords.find(r => r.id == id);
                
                const scouts = storage.get('scouts') || [];
                scout = scouts.find(s => s.id == record.scout_id);
            }
            
            if (!record || !scout) {
                utils.showAlert('Registro médico no encontrado', 'error');
                return;
            }
            
            // Create modal with medical record details
            const modalHTML = `
                <div class="modal-overlay">
                    <div class="modal-content">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                            <h2>Ficha Médica</h2>
                            <button onclick="closeModal()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem;">
                            <div>
                                <h3>Información del Scout</h3>
                                <p><strong>Nombre:</strong> ${scout.name}</p>
                                <p><strong>Edad:</strong> ${calculateAge(scout.birthdate)} años</p>
                                <p><strong>Grupo:</strong> ${scout.group_section || scout.group}</p>
                            </div>
                            
                            <div>
                                <h3>Información Médica</h3>
                                <p><strong>Tipo de Sangre:</strong> ${record.blood_type}</p>
                                <p><strong>Contacto de Emergencia:</strong> ${record.emergency_contact}</p>
                                <p><strong>Alergias:</strong> ${record.allergies || 'Ninguna'}</p>
                                <p><strong>Medicamentos:</strong> ${record.medications || 'Ninguno'}</p>
                                <p><strong>Condiciones Médicas:</strong> ${record.medical_conditions || 'Ninguna'}</p>
                            </div>
                            
                            <div>
                                <h3>Información del Médico</h3>
                                <p><strong>Nombre del Médico:</strong> ${record.doctor_name || 'No especificado'}</p>
                                <p><strong>Teléfono del Médico:</strong> ${record.doctor_phone || 'No especificado'}</p>
                                <p><strong>Fecha de Creación:</strong> ${utils.formatDate(record.created_date)}</p>
                            </div>
                        </div>
                        
                        <div style="margin-top: 2rem; display: flex; gap: 1rem; justify-content: flex-end;">
                            <button class="btn btn-secondary" onclick="editMedicalRecord('${record.scout_id}'); closeModal();">Editar</button>
                            <button class="btn btn-primary" onclick="closeModal()">Cerrar</button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        } catch (error) {
            console.error('Error loading medical record details:', error);
            utils.showAlert('Error al cargar los detalles de la ficha médica', 'error');
        }
    };

    // Edit medical record
    window.editMedicalRecord = async (scoutId) => {
        try {
            let record;
            
            if (supabase) {
                const { data, error } = await supabase
                    .from('medical_records')
                    .select('*')
                    .eq('scout_id', scoutId)
                    .maybeSingle();
                
                if (error && error.code !== 'PGRST116') throw error;
                record = data;
            } else {
                const medicalRecords = storage.get('medicalRecords') || [];
                record = medicalRecords.find(r => r.scout_id == scoutId);
            }
            
            if (!record) {
                // No existing record, just select the scout
                document.getElementById('medicalScout').value = scoutId;
                
                // Switch to fichas tab
                switchToTab('fichas');
                return;
            }
            
            // Fill form with record data
            document.getElementById('medicalScout').value = record.scout_id;
            document.getElementById('bloodType').value = record.blood_type || '';
            document.getElementById('emergencyContact').value = record.emergency_contact || '';
            document.getElementById('allergies').value = record.allergies || '';
            document.getElementById('medications').value = record.medications || '';
            document.getElementById('medicalConditions').value = record.medical_conditions || '';
            document.getElementById('doctorName').value = record.doctor_name || '';
            document.getElementById('doctorPhone').value = record.doctor_phone || '';
            
            // Switch to fichas tab
            switchToTab('fichas');
            
            // Scroll to form
            medicalForm.scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            console.error('Error loading medical record for edit:', error);
            utils.showAlert('Error al cargar la ficha médica para editar', 'error');
        }
    };

    // Delete medical record
    window.deleteMedicalRecord = async (id) => {
        if (!confirm('¿Está seguro de que desea eliminar esta ficha médica?')) {
            return;
        }

        try {
            if (supabase) {
                const { error } = await supabase
                    .from('medical_records')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
            } else {
                const medicalRecords = storage.get('medicalRecords') || [];
                const updatedRecords = medicalRecords.filter(record => record.id != id);
                storage.set('medicalRecords', updatedRecords);
            }

            await loadMedicalRecords();
            utils.showAlert('Ficha médica eliminada exitosamente', 'success');
        } catch (error) {
            console.error('Error deleting medical record:', error);
            utils.showAlert('Error al eliminar la ficha médica', 'error');
        }
    };

    // Documentation form functionality
    const documentationForm = document.getElementById('documentationForm');
    if (documentationForm) {
        documentationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(documentationForm);
            const scoutId = formData.get('scoutId');
            
            if (!scoutId) {
                utils.showAlert('Por favor seleccione un scout', 'error');
                return;
            }
            
            const documents = formData.getAll('documents');
            
            const documentationRecord = {
                scout_id: scoutId,
                documents: documents,
                notes: formData.get('notes'),
                status: documents.length >= 4 ? 'complete' : 'incomplete',
                last_updated: new Date().toISOString()
            };

            try {
                if (supabase) {
                    // Check if record exists
                    const { data: existing, error: checkError } = await supabase
                        .from('documentation_records')
                        .select('*')
                        .eq('scout_id', scoutId)
                        .maybeSingle();

                    if (checkError && checkError.code !== 'PGRST116') {
                        throw checkError;
                    }

                    if (existing) {
                        // Update existing record
                        const { error } = await supabase
                            .from('documentation_records')
                            .update(documentationRecord)
                            .eq('scout_id', scoutId);

                        if (error) throw error;
                    } else {
                        // Insert new record
                        const { error } = await supabase
                            .from('documentation_records')
                            .insert([documentationRecord]);

                        if (error) throw error;
                    }
                } else {
                    // Fallback to localStorage
                    const documentationRecords = storage.get('documentationRecords') || [];
                    const filteredRecords = documentationRecords.filter(record => record.scout_id !== scoutId);
                    documentationRecord.id = Date.now();
                    filteredRecords.push(documentationRecord);
                    storage.set('documentationRecords', filteredRecords);
                }
                
                documentationForm.reset();
                await loadDocumentationStatus();
                utils.showAlert('Documentación actualizada exitosamente', 'success');
            } catch (error) {
                console.error('Error saving documentation:', error);
                utils.showAlert('Error al guardar la documentación', 'error');
            }
        });
    }

    // Load documentation status
    const loadDocumentationStatus = async () => {
        const documentationStatus = document.getElementById('documentationStatus');
        const statusFilter = document.getElementById('docStatusFilter')?.value || '';
        const groupFilter = document.getElementById('docGroupFilter')?.value || '';

        try {
            let documentationRecords = [];
            let scouts = [];

            if (supabase) {
                // Get documentation records
                let recordsQuery = supabase.from('documentation_records').select('*');
                
                if (statusFilter) {
                    recordsQuery = recordsQuery.eq('status', statusFilter);
                }
                
                const { data: recordsData, error: recordsError } = await recordsQuery;
                
                if (recordsError) throw recordsError;
                documentationRecords = recordsData || [];
                
                // Get scouts
                let scoutsQuery = supabase.from('scouts').select('*');
                
                if (groupFilter) {
                    scoutsQuery = scoutsQuery.eq('group_section', groupFilter);
                }
                
                const { data: scoutsData, error: scoutsError } = await scoutsQuery;
                
                if (scoutsError) throw scoutsError;
                scouts = scoutsData || [];
            } else {
                documentationRecords = storage.get('documentationRecords') || [];
                scouts = storage.get('scouts') || [];
                
                if (statusFilter) {
                    documentationRecords = documentationRecords.filter(r => r.status === statusFilter);
                }
                
                if (groupFilter) {
                    scouts = scouts.filter(s => s.group === groupFilter || s.group_section === groupFilter);
                }
            }

            if (documentationStatus) {
                documentationStatus.innerHTML = '';
                
                if (scouts.length === 0) {
                    documentationStatus.innerHTML = '<p class="no-content">No hay scouts registrados</p>';
                    return;
                }
                
                scouts.forEach(scout => {
                    const record = documentationRecords.find(r => r.scout_id == scout.id);
                    const statusCard = document.createElement('div');
                    statusCard.className = 'card documentation-card';
                    
                    const status = record ? record.status : 'pending';
                    const documentsCount = record ? record.documents.length : 0;
                    
                    statusCard.innerHTML = `
                        <h4>${scout.name}</h4>
                        <p><strong>Grupo:</strong> ${scout.group_section || scout.group}</p>
                        <p><strong>Estado:</strong> <span class="status-indicator ${status}">${status}</span></p>
                        <p><strong>Documentos:</strong> ${documentsCount}/6</p>
                        <div class="progress-container">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${(documentsCount/6)*100}%"></div>
                            </div>
                        </div>
                        ${record ? `<p><strong>Última actualización:</strong> ${utils.formatDate(record.last_updated)}</p>` : ''}
                        <div class="action-buttons">
                            <button class="btn btn-primary btn-sm" onclick="editDocumentation('${scout.id}')">
                                ${record ? 'Editar' : 'Agregar'} Documentación
                            </button>
                        </div>
                    `;
                    documentationStatus.appendChild(statusCard);
                });
            }
        } catch (error) {
            console.error('Error loading documentation status:', error);
            utils.showAlert('Error al cargar el estado de documentación', 'error');
        }
    };

    // Edit documentation
    window.editDocumentation = async (scoutId) => {
        try {
            let record;
            
            if (supabase) {
                const { data, error } = await supabase
                    .from('documentation_records')
                    .select('*')
                    .eq('scout_id', scoutId)
                    .maybeSingle();
                
                if (error && error.code !== 'PGRST116') throw error;
                record = data;
            } else {
                const documentationRecords = storage.get('documentationRecords') || [];
                record = documentationRecords.find(r => r.scout_id == scoutId);
            }
            
            // Select the scout
            document.getElementById('docScout').value = scoutId;
            
            // Check documents if record exists
            if (record) {
                const checkboxes = document.querySelectorAll('input[name="documents"]');
                checkboxes.forEach(checkbox => {
                    checkbox.checked = record.documents.includes(checkbox.value);
                });
                
                document.getElementById('docNotes').value = record.notes || '';
            } else {
                // Clear form
                document.querySelectorAll('input[name="documents"]').forEach(checkbox => {
                    checkbox.checked = false;
                });
                document.getElementById('docNotes').value = '';
            }
            
            // Switch to documentation tab
            switchToTab('documentacion');
            
            // Scroll to form
            documentationForm.scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            console.error('Error loading documentation for edit:', error);
            utils.showAlert('Error al cargar la documentación para editar', 'error');
        }
    };

    // Calculate age
    const calculateAge = (birthdate) => {
        const today = new Date();
        const birth = new Date(birthdate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        
        return age;
    };

    // Check for inactive members
    window.checkInactiveMembers = async () => {
        try {
            if (supabase) {
                const { data, error } = await supabase
                    .from('inactive_members')
                    .select('*');
                    
                if (error) throw error;
                
                if (data && data.length > 0) {
                    utils.showAlert(`Se encontraron ${data.length} miembros inactivos por más de 3 meses`, 'warning');
                    
                    // Show inactive members in a modal
                    const modalHTML = `
                        <div class="modal-overlay">
                            <div class="modal-content">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                                    <h2>Miembros Inactivos</h2>
                                    <button onclick="closeModal()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
                                </div>
                                
                                <p>Los siguientes miembros no han asistido en los últimos 3 meses:</p>
                                
                                <div style="max-height: 400px; overflow-y: auto; margin: 1rem 0;">
                                    <table style="width: 100%; border-collapse: collapse;">
                                        <thead>
                                            <tr>
                                                <th style="text-align: left; padding: 0.5rem; border-bottom: 1px solid #ddd;">Nombre</th>
                                                <th style="text-align: left; padding: 0.5rem; border-bottom: 1px solid #ddd;">Grupo</th>
                                                <th style="text-align: left; padding: 0.5rem; border-bottom: 1px solid #ddd;">Última Asistencia</th>
                                                <th style="text-align: left; padding: 0.5rem; border-bottom: 1px solid #ddd;">Días Inactivo</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${data.map(member => `
                                                <tr>
                                                    <td style="padding: 0.5rem; border-bottom: 1px solid #eee;">${member.name}</td>
                                                    <td style="padding: 0.5rem; border-bottom: 1px solid #eee;">${member.group_section}</td>
                                                    <td style="padding: 0.5rem; border-bottom: 1px solid #eee;">${member.last_attendance ? utils.formatDate(member.last_attendance) : 'Nunca'}</td>
                                                    <td style="padding: 0.5rem; border-bottom: 1px solid #eee;">${member.days_since_last_attendance || 'N/A'}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                                
                                <div style="margin-top: 1rem; display: flex; gap: 1rem; justify-content: flex-end;">
                                    <button class="btn btn-primary" onclick="closeModal()">Cerrar</button>
                                </div>
                            </div>
                        </div>
                    `;
                    
                    document.body.insertAdjacentHTML('beforeend', modalHTML);
                } else {
                    utils.showAlert('No se encontraron miembros inactivos', 'success');
                }
                
                return data;
            } else {
                utils.showAlert('Esta función requiere conexión a Supabase', 'warning');
                return [];
            }
        } catch (error) {
            console.error('Error checking inactive members:', error);
            utils.showAlert('Error al verificar miembros inactivos', 'error');
            return [];
        }
    };

    // Switch to tab function
    window.switchToTab = (tabId) => {
        const tabBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
        if (tabBtn) {
            tabBtn.click();
        }
    };

    // Event listeners
    document.getElementById('loadAttendance')?.addEventListener('click', loadAttendance);
    document.getElementById('saveAttendance')?.addEventListener('click', saveAttendance);
    document.getElementById('searchScouts')?.addEventListener('input', loadScouts);
    document.getElementById('filterGroup')?.addEventListener('change', loadScouts);
    document.getElementById('docStatusFilter')?.addEventListener('change', loadDocumentationStatus);
    document.getElementById('docGroupFilter')?.addEventListener('change', loadDocumentationStatus);

    // Add check inactive members button
    const addInactiveMembersButton = () => {
        const controlsContainer = document.querySelector('.search-filter');
        if (controlsContainer && supabase) {
            const button = document.createElement('button');
            button.className = 'btn btn-secondary';
            button.textContent = 'Verificar Inactivos';
            button.onclick = checkInactiveMembers;
            controlsContainer.appendChild(button);
        }
    };

    // Set today's date for attendance
    const attendanceDateInput = document.getElementById('attendanceDate');
    if (attendanceDateInput) {
        attendanceDateInput.value = new Date().toISOString().split('T')[0];
    }

    // Initial load
    loadScouts();
    loadMedicalRecords();
    loadDocumentationStatus();
    populateScoutDropdowns();
    addInactiveMembersButton();
});