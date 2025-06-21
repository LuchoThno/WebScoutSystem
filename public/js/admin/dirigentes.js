import utils from '../utils.js';
import storage from '../storage.js';
import supabaseClient from '../supabase-client.js';

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
    
    // Load dirigentes data
    await loadDirigentes();
    
    // Set up form submission
    const dirigenteForm = document.getElementById('dirigenteForm');
    if (dirigenteForm) {
        dirigenteForm.addEventListener('submit', handleFormSubmit);
    }
    
    // Set up search and filters
    document.getElementById('searchDirigentes')?.addEventListener('input', loadDirigentes);
    document.getElementById('filterGrupo')?.addEventListener('change', loadDirigentes);
    document.getElementById('filterCargo')?.addEventListener('change', loadDirigentes);
    document.getElementById('filterEstado')?.addEventListener('change', loadDirigentes);
    
    // Set up export button
    document.getElementById('exportDirigentes')?.addEventListener('click', exportDirigentes);
    
    // Set up report button
    document.getElementById('reporteDirigentes')?.addEventListener('click', generarReporte);
    
    // Load statistics for reports
    loadStatistics();
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

// Load dirigentes data
async function loadDirigentes() {
    const tableBody = document.getElementById('dirigentesTableBody');
    if (!tableBody) return;
    
    // Show loading state
    tableBody.innerHTML = `
        <tr>
            <td colspan="7" class="text-center">
                <div class="loading-spinner"></div>
                <p>Cargando dirigentes...</p>
            </td>
        </tr>
    `;
    
    try {
        // Get filter values
        const searchTerm = document.getElementById('searchDirigentes')?.value.toLowerCase() || '';
        const grupoFilter = document.getElementById('filterGrupo')?.value || '';
        const cargoFilter = document.getElementById('filterCargo')?.value || '';
        const estadoFilter = document.getElementById('filterEstado')?.value || '';
        
        let dirigentes = [];
        
        // Try to get data from Supabase
        const supabase = await supabaseClient.init();
        
        if (supabase) {
            let query = supabase.from('dirigentes').select('*');
            
            if (grupoFilter) {
                query = query.eq('grupo_asignado', grupoFilter);
            }
            
            if (cargoFilter) {
                query = query.eq('cargo', cargoFilter);
            }
            
            if (estadoFilter) {
                query = query.eq('estado', estadoFilter);
            }
            
            if (searchTerm) {
                query = query.or(`nombre.ilike.%${searchTerm}%,cedula.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
            }
            
            const { data, error } = await query.order('nombre', { ascending: true });
            
            if (error) throw error;
            dirigentes = data;
        } else {
            // Fallback to localStorage
            dirigentes = storage.get('dirigentes') || [];
            
            // Filter dirigentes
            dirigentes = dirigentes.filter(dirigente => {
                const matchesSearch = dirigente.nombre.toLowerCase().includes(searchTerm) ||
                                    dirigente.cedula.includes(searchTerm) ||
                                    (dirigente.email && dirigente.email.toLowerCase().includes(searchTerm));
                const matchesGrupo = !grupoFilter || dirigente.grupo_asignado === grupoFilter;
                const matchesCargo = !cargoFilter || dirigente.cargo === cargoFilter;
                const matchesEstado = !estadoFilter || dirigente.estado === estadoFilter;
                
                return matchesSearch && matchesGrupo && matchesCargo && matchesEstado;
            });
        }
        
        // Render dirigentes
        if (dirigentes.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        <p>No se encontraron dirigentes con los filtros seleccionados</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        tableBody.innerHTML = '';
        
        dirigentes.forEach(dirigente => {
            const row = document.createElement('tr');
            
            // Format cargo and grupo for display
            const cargoDisplay = {
                'jefe-grupo': 'Jefe de Grupo',
                'subjefe-grupo': 'Subjefe de Grupo',
                'dirigente-seccion': 'Dirigente de Sección',
                'asistente': 'Asistente',
                'especialista': 'Especialista',
                'coordinador': 'Coordinador',
                'tesorero': 'Tesorero',
                'secretario': 'Secretario'
            };
            
            const grupoDisplay = {
                'bandada': '🐦 Bandada',
                'manada': '🐺 Manada',
                'compania': '🍀 Compañía',
                'tropa': '🏕️ Tropa',
                'avanzada': '🌠 Avanzada',
                'clan': '🔥 Clan',
                'grupo-general': 'Grupo General'
            };
            
            row.innerHTML = `
                <td>${dirigente.nombre}</td>
                <td>${dirigente.cedula}</td>
                <td>${grupoDisplay[dirigente.grupo_asignado] || dirigente.grupo_asignado || 'No asignado'}</td>
                <td>${cargoDisplay[dirigente.cargo] || dirigente.cargo || 'No asignado'}</td>
                <td><span class="status-indicator ${dirigente.estado}">${dirigente.estado}</span></td>
                <td>
                    <span class="status-indicator ${dirigente.documentacion_completa ? 'complete' : 'incomplete'}">
                        ${dirigente.documentacion_completa ? 'Completa' : 'Incompleta'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="verDirigente('${dirigente.id}')">Ver</button>
                        <button class="btn btn-sm btn-secondary" onclick="editarDirigente('${dirigente.id}')">Editar</button>
                        <button class="btn btn-sm btn-secondary" onclick="eliminarDirigente('${dirigente.id}')">Eliminar</button>
                    </div>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Error loading dirigentes:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    <p class="error-message">Error al cargar dirigentes: ${error.message}</p>
                </td>
            </tr>
        `;
    }
}

// Handle form submission
async function handleFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    // Get form values
    const dirigente = {
        nombre: formData.get('nombre'),
        cedula: formData.get('cedula'),
        fecha_nacimiento: formData.get('fechaNacimiento'),
        genero: formData.get('genero') || null,
        estado_civil: formData.get('estadoCivil') || null,
        direccion: formData.get('direccion') || null,
        telefono: formData.get('telefono') || null,
        email: formData.get('email') || null,
        profesion: formData.get('profesion') || null,
        inicio_scout: formData.get('inicioScout') || null,
        inicio_grupo: formData.get('inicioGrupo') || null,
        anos_experiencia: formData.get('anosExperiencia') ? parseInt(formData.get('anosExperiencia')) : null,
        experiencia_previa: formData.get('experienciaPrevia') || null,
        capacitaciones: Array.from(formData.getAll('capacitaciones')),
        otras_capacitaciones: formData.get('otrasCapacitaciones') || null,
        grupo_asignado: formData.get('grupoAsignado') || null,
        cargo: formData.get('cargo') || null,
        estado: formData.get('estado') || 'activo',
        responsabilidades: formData.get('responsabilidades') || null,
        habilidades: formData.get('habilidades') || null,
        documentos: Array.from(formData.getAll('documentos')),
        notas_documentacion: formData.get('notasDocumentacion') || null,
        fecha_registro: new Date().toISOString(),
        documentacion_completa: formData.getAll('documentos').length >= 5 // Consider complete if at least 5 documents
    };
    
    try {
        // Try to save to Supabase
        const supabase = await supabaseClient.init();
        
        if (supabase) {
            const { data, error } = await supabase
                .from('dirigentes')
                .insert([dirigente])
                .select();
                
            if (error) throw error;
            
            utils.showAlert('Dirigente registrado exitosamente en la base de datos', 'success');
        } else {
            // Fallback to localStorage
            const dirigentes = storage.get('dirigentes') || [];
            dirigente.id = Date.now().toString(); // Generate ID
            dirigentes.push(dirigente);
            storage.set('dirigentes', dirigentes);
            
            utils.showAlert('Dirigente registrado exitosamente (almacenamiento local)', 'success');
        }
        
        // Reset form and reload data
        form.reset();
        await loadDirigentes();
        await loadStatistics();
        
    } catch (error) {
        console.error('Error saving dirigente:', error);
        utils.showAlert(`Error al registrar dirigente: ${error.message}`, 'error');
    }
}

// View dirigente details
window.verDirigente = function(id) {
    // Open print-dirigente.html in a new window
    window.open(`print-dirigente.html?id=${id}`, '_blank');
};

// Edit dirigente
window.editarDirigente = async function(id) {
    try {
        // Get dirigente data
        let dirigente;
        const supabase = await supabaseClient.init();
        
        if (supabase) {
            const { data, error } = await supabase
                .from('dirigentes')
                .select('*')
                .eq('id', id)
                .single();
                
            if (error) throw error;
            dirigente = data;
        } else {
            // Fallback to localStorage
            const dirigentes = storage.get('dirigentes') || [];
            dirigente = dirigentes.find(d => d.id === id);
            
            if (!dirigente) {
                throw new Error('Dirigente no encontrado');
            }
        }
        
        // Populate edit form
        const editForm = document.getElementById('editDirigenteForm');
        
        // Clone the registration form structure for editing
        const originalForm = document.getElementById('dirigenteForm');
        editForm.innerHTML = originalForm.innerHTML;
        
        // Set form values
        editForm.elements.nombre.value = dirigente.nombre || '';
        editForm.elements.cedula.value = dirigente.cedula || '';
        editForm.elements.fechaNacimiento.value = dirigente.fecha_nacimiento || '';
        editForm.elements.genero.value = dirigente.genero || '';
        editForm.elements.estadoCivil.value = dirigente.estado_civil || '';
        editForm.elements.direccion.value = dirigente.direccion || '';
        editForm.elements.telefono.value = dirigente.telefono || '';
        editForm.elements.email.value = dirigente.email || '';
        editForm.elements.profesion.value = dirigente.profesion || '';
        editForm.elements.inicioScout.value = dirigente.inicio_scout || '';
        editForm.elements.inicioGrupo.value = dirigente.inicio_grupo || '';
        editForm.elements.anosExperiencia.value = dirigente.anos_experiencia || '';
        editForm.elements.experienciaPrevia.value = dirigente.experiencia_previa || '';
        editForm.elements.otrasCapacitaciones.value = dirigente.otras_capacitaciones || '';
        editForm.elements.grupoAsignado.value = dirigente.grupo_asignado || '';
        editForm.elements.cargo.value = dirigente.cargo || '';
        editForm.elements.estado.value = dirigente.estado || 'activo';
        editForm.elements.responsabilidades.value = dirigente.responsabilidades || '';
        editForm.elements.habilidades.value = dirigente.habilidades || '';
        editForm.elements.notasDocumentacion.value = dirigente.notas_documentacion || '';
        
        // Set checkboxes
        if (dirigente.capacitaciones && dirigente.capacitaciones.length > 0) {
            const capacitacionesCheckboxes = editForm.querySelectorAll('input[name="capacitaciones"]');
            capacitacionesCheckboxes.forEach(checkbox => {
                checkbox.checked = dirigente.capacitaciones.includes(checkbox.value);
            });
        }
        
        if (dirigente.documentos && dirigente.documentos.length > 0) {
            const documentosCheckboxes = editForm.querySelectorAll('input[name="documentos"]');
            documentosCheckboxes.forEach(checkbox => {
                checkbox.checked = dirigente.documentos.includes(checkbox.value);
            });
        }
        
        // Add dirigente ID to form
        editForm.dataset.dirigenteId = id;
        
        // Show modal
        const modal = document.getElementById('editModal');
        modal.style.display = 'block';
        
        // Set up form submission
        editForm.addEventListener('submit', handleEditFormSubmit);
        
    } catch (error) {
        console.error('Error loading dirigente for edit:', error);
        utils.showAlert(`Error al cargar dirigente: ${error.message}`, 'error');
    }
};

// Handle edit form submission
async function handleEditFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const dirigenteId = form.dataset.dirigenteId;
    
    // Get form values (same as in handleFormSubmit)
    const dirigente = {
        nombre: formData.get('nombre'),
        cedula: formData.get('cedula'),
        fecha_nacimiento: formData.get('fechaNacimiento'),
        genero: formData.get('genero') || null,
        estado_civil: formData.get('estadoCivil') || null,
        direccion: formData.get('direccion') || null,
        telefono: formData.get('telefono') || null,
        email: formData.get('email') || null,
        profesion: formData.get('profesion') || null,
        inicio_scout: formData.get('inicioScout') || null,
        inicio_grupo: formData.get('inicioGrupo') || null,
        anos_experiencia: formData.get('anosExperiencia') ? parseInt(formData.get('anosExperiencia')) : null,
        experiencia_previa: formData.get('experienciaPrevia') || null,
        capacitaciones: Array.from(formData.getAll('capacitaciones')),
        otras_capacitaciones: formData.get('otrasCapacitaciones') || null,
        grupo_asignado: formData.get('grupoAsignado') || null,
        cargo: formData.get('cargo') || null,
        estado: formData.get('estado') || 'activo',
        responsabilidades: formData.get('responsabilidades') || null,
        habilidades: formData.get('habilidades') || null,
        documentos: Array.from(formData.getAll('documentos')),
        notas_documentacion: formData.get('notasDocumentacion') || null,
        documentacion_completa: formData.getAll('documentos').length >= 5 // Consider complete if at least 5 documents
    };
    
    try {
        // Try to update in Supabase
        const supabase = await supabaseClient.init();
        
        if (supabase) {
            const { data, error } = await supabase
                .from('dirigentes')
                .update(dirigente)
                .eq('id', dirigenteId)
                .select();
                
            if (error) throw error;
            
            utils.showAlert('Dirigente actualizado exitosamente en la base de datos', 'success');
        } else {
            // Fallback to localStorage
            const dirigentes = storage.get('dirigentes') || [];
            const index = dirigentes.findIndex(d => d.id === dirigenteId);
            
            if (index === -1) {
                throw new Error('Dirigente no encontrado');
            }
            
            dirigentes[index] = { ...dirigentes[index], ...dirigente };
            storage.set('dirigentes', dirigentes);
            
            utils.showAlert('Dirigente actualizado exitosamente (almacenamiento local)', 'success');
        }
        
        // Close modal and reload data
        closeModal();
        await loadDirigentes();
        await loadStatistics();
        
    } catch (error) {
        console.error('Error updating dirigente:', error);
        utils.showAlert(`Error al actualizar dirigente: ${error.message}`, 'error');
    }
}

// Delete dirigente
window.eliminarDirigente = async function(id) {
    if (!confirm('¿Está seguro de que desea eliminar este dirigente? Esta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        // Try to delete from Supabase
        const supabase = await supabaseClient.init();
        
        if (supabase) {
            const { error } = await supabase
                .from('dirigentes')
                .delete()
                .eq('id', id);
                
            if (error) throw error;
            
            utils.showAlert('Dirigente eliminado exitosamente de la base de datos', 'success');
        } else {
            // Fallback to localStorage
            const dirigentes = storage.get('dirigentes') || [];
            const filteredDirigentes = dirigentes.filter(d => d.id !== id);
            
            if (filteredDirigentes.length === dirigentes.length) {
                throw new Error('Dirigente no encontrado');
            }
            
            storage.set('dirigentes', filteredDirigentes);
            
            utils.showAlert('Dirigente eliminado exitosamente (almacenamiento local)', 'success');
        }
        
        // Reload data
        await loadDirigentes();
        await loadStatistics();
        
    } catch (error) {
        console.error('Error deleting dirigente:', error);
        utils.showAlert(`Error al eliminar dirigente: ${error.message}`, 'error');
    }
};

// Close modal
window.closeModal = function() {
    const modal = document.getElementById('editModal');
    modal.style.display = 'none';
};

// Export dirigentes to CSV
window.exportDirigentes = async function() {
    try {
        // Get dirigentes data
        let dirigentes;
        const supabase = await supabaseClient.init();
        
        if (supabase) {
            const { data, error } = await supabase
                .from('dirigentes')
                .select('*')
                .order('nombre', { ascending: true });
                
            if (error) throw error;
            dirigentes = data;
        } else {
            // Fallback to localStorage
            dirigentes = storage.get('dirigentes') || [];
        }
        
        if (dirigentes.length === 0) {
            utils.showAlert('No hay dirigentes para exportar', 'error');
            return;
        }
        
        // Create CSV content
        let csvContent = 'data:text/csv;charset=utf-8,';
        
        // Add headers
        const headers = [
            'Nombre', 'Cédula', 'Fecha Nacimiento', 'Género', 'Estado Civil',
            'Teléfono', 'Email', 'Profesión', 'Grupo Asignado', 'Cargo',
            'Estado', 'Años Experiencia', 'Documentación Completa'
        ];
        csvContent += headers.join(',') + '\n';
        
        // Add data rows
        dirigentes.forEach(dirigente => {
            const row = [
                `"${dirigente.nombre || ''}"`,
                `"${dirigente.cedula || ''}"`,
                `"${dirigente.fecha_nacimiento || ''}"`,
                `"${dirigente.genero || ''}"`,
                `"${dirigente.estado_civil || ''}"`,
                `"${dirigente.telefono || ''}"`,
                `"${dirigente.email || ''}"`,
                `"${dirigente.profesion || ''}"`,
                `"${dirigente.grupo_asignado || ''}"`,
                `"${dirigente.cargo || ''}"`,
                `"${dirigente.estado || ''}"`,
                `"${dirigente.anos_experiencia || ''}"`,
                `"${dirigente.documentacion_completa ? 'Sí' : 'No'}"`
            ];
            csvContent += row.join(',') + '\n';
        });
        
        // Create download link
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `dirigentes_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        
        // Trigger download
        link.click();
        document.body.removeChild(link);
        
    } catch (error) {
        console.error('Error exporting dirigentes:', error);
        utils.showAlert(`Error al exportar dirigentes: ${error.message}`, 'error');
    }
};

// Generate report
window.generarReporte = async function() {
    try {
        await loadStatistics(true);
        utils.showAlert('Reporte generado exitosamente', 'success');
        
        // Switch to reports tab
        const reportTab = document.querySelector('.tab-btn[data-tab="reportes"]');
        if (reportTab) {
            reportTab.click();
        }
    } catch (error) {
        console.error('Error generating report:', error);
        utils.showAlert(`Error al generar reporte: ${error.message}`, 'error');
    }
};

// Load statistics for reports
async function loadStatistics(forceRefresh = false) {
    try {
        // Get dirigentes data
        let dirigentes;
        const supabase = await supabaseClient.init();
        
        if (supabase) {
            const { data, error } = await supabase
                .from('dirigentes')
                .select('*');
                
            if (error) throw error;
            dirigentes = data;
        } else {
            // Fallback to localStorage
            dirigentes = storage.get('dirigentes') || [];
        }
        
        // Update statistics
        document.getElementById('totalDirigentes').textContent = dirigentes.length;
        document.getElementById('dirigentesActivos').textContent = dirigentes.filter(d => d.estado === 'activo').length;
        document.getElementById('documentacionCompleta').textContent = dirigentes.filter(d => d.documentacion_completa).length;
        
        // Generate group statistics
        const dirigentesPorGrupo = {};
        dirigentes.forEach(dirigente => {
            const grupo = dirigente.grupo_asignado || 'No asignado';
            dirigentesPorGrupo[grupo] = (dirigentesPorGrupo[grupo] || 0) + 1;
        });
        
        // Display group statistics
        const grupoStats = document.getElementById('dirigentesPorGrupo');
        if (grupoStats) {
            let html = '<div class="stats-list">';
            
            const grupoDisplay = {
                'bandada': '🐦 Bandada',
                'manada': '🐺 Manada',
                'compania': '🍀 Compañía',
                'tropa': '🏕️ Tropa',
                'avanzada': '🌠 Avanzada',
                'clan': '🔥 Clan',
                'grupo-general': 'Grupo General',
                'No asignado': 'No asignado'
            };
            
            for (const [grupo, count] of Object.entries(dirigentesPorGrupo)) {
                const displayName = grupoDisplay[grupo] || grupo;
                const percentage = Math.round((count / dirigentes.length) * 100);
                
                html += `
                    <div class="stat-item">
                        <span class="stat-label">${displayName}</span>
                        <span class="stat-value">${count} (${percentage}%)</span>
                    </div>
                `;
            }
            
            html += '</div>';
            grupoStats.innerHTML = html;
        }
        
        // Generate capacitaciones statistics
        const capacitacionesStats = {};
        dirigentes.forEach(dirigente => {
            if (dirigente.capacitaciones && dirigente.capacitaciones.length > 0) {
                dirigente.capacitaciones.forEach(cap => {
                    capacitacionesStats[cap] = (capacitacionesStats[cap] || 0) + 1;
                });
            }
        });
        
        // Display capacitaciones statistics
        const capStats = document.getElementById('capacitacionesStats');
        if (capStats) {
            let html = '<div class="stats-list">';
            
            const capDisplay = {
                'preliminar': 'Curso Preliminar',
                'basico': 'Curso Básico',
                'intermedio': 'Curso Intermedio',
                'avanzado': 'Curso Avanzado',
                'especialista': 'Curso de Especialista',
                'formador': 'Curso de Formador',
                'primeros-auxilios': 'Primeros Auxilios',
                'salvamento': 'Salvamento Acuático',
                'campismo': 'Técnicas de Campismo'
            };
            
            for (const [cap, count] of Object.entries(capacitacionesStats)) {
                const displayName = capDisplay[cap] || cap;
                const percentage = Math.round((count / dirigentes.length) * 100);
                
                html += `
                    <div class="stat-item">
                        <span class="stat-label">${displayName}</span>
                        <span class="stat-value">${count} (${percentage}%)</span>
                    </div>
                `;
            }
            
            html += '</div>';
            capStats.innerHTML = html;
        }
        
    } catch (error) {
        console.error('Error loading statistics:', error);
        utils.showAlert(`Error al cargar estadísticas: ${error.message}`, 'error');
    }
}

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
    const modal = document.getElementById('editModal');
    if (event.target === modal) {
        closeModal();
    }
};

// Make functions available globally
window.verDirigente = verDirigente;
window.editarDirigente = editarDirigente;
window.eliminarDirigente = eliminarDirigente;
window.closeModal = closeModal;
window.exportDirigentes = exportDirigentes;
window.generarReporte = generarReporte;

export default {};