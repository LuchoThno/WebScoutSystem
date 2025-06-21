import utils from './utils.js';
import storage from './storage.js';
import supabaseClient from './supabase-client.js';

document.addEventListener('DOMContentLoaded', async () => {
    const isAdmin = storage.get('adminLoggedIn');
    const memberForm = document.getElementById('memberForm');
    const groupedMembersContainer = document.getElementById('groupedMembers');
    const groupFilter = document.getElementById('groupFilter');
    
    // Initialize Supabase client
    const supabase = await supabaseClient.init();
    
    // Load members data
    await loadAllMembers();
    
    // Set up group filter
    if (groupFilter) {
        groupFilter.addEventListener('change', loadAllMembers);
    }
    
    // Set up form submission if admin
    if (memberForm && isAdmin) {
        const photoInput = document.getElementById('photo');
        const photoPreview = document.getElementById('photoPreview');
        
        // Set up photo preview
        if (photoInput) {
            photoInput.addEventListener('change', (e) => {
                utils.createImagePreview(e.target.files[0], photoPreview);
            });
        }
        
        // Set up form submission
        memberForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(memberForm);
            const photoFile = photoInput.files[0];
            
            const rules = {
                fullName: { required: true, minLength: 3 },
                role: { required: true },
                group: { required: true }
            };
            
            if (!photoFile && !isAdmin) {
                rules.photo = { required: true };
            }
            
            const errors = utils.validateForm(formData, rules);
            if (errors) {
                Object.values(errors).forEach(error => {
                    utils.showAlert(error, 'error');
                });
                return;
            }
            
            try {
                const member = {
                    name: formData.get('fullName'),
                    role: formData.get('role'),
                    group: formData.get('group')
                };
                
                // Try to save to Supabase
                if (supabase) {
                    // For dirigentes table
                    if (member.role === 'dirigente' || member.role === 'delegado') {
                        const dirigente = {
                            nombre: member.name,
                            cedula: `${Date.now()}`, // Placeholder
                            fecha_nacimiento: new Date().toISOString().split('T')[0], // Placeholder
                            grupo_asignado: member.group,
                            cargo: member.role === 'dirigente' ? 'dirigente-seccion' : 'asistente',
                            estado: 'activo'
                        };
                        
                        const { data, error } = await supabase
                            .from('dirigentes')
                            .insert([dirigente])
                            .select();
                            
                        if (error) throw error;
                        
                        utils.showAlert('Dirigente registrado exitosamente en la base de datos', 'success');
                    } 
                    // For scouts table
                    else {
                        const scout = {
                            name: member.name,
                            birthdate: new Date().toISOString().split('T')[0], // Placeholder
                            group_section: member.group,
                            status: 'activo'
                        };
                        
                        const { data, error } = await supabase
                            .from('scouts')
                            .insert([scout])
                            .select();
                            
                        if (error) throw error;
                        
                        utils.showAlert('Scout registrado exitosamente en la base de datos', 'success');
                    }
                } else {
                    // Fallback to localStorage
                    if (photoFile) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            member.photo = e.target.result;
                            saveToLocalStorage(member);
                        };
                        reader.readAsDataURL(photoFile);
                    } else {
                        // Use default image based on role
                        const defaultImages = {
                            dirigente: 'https://images.pexels.com/photos/6646918/pexels-photo-6646918.jpeg?auto=compress&cs=tinysrgb&w=600',
                            delegado: 'https://images.pexels.com/photos/6646918/pexels-photo-6646918.jpeg?auto=compress&cs=tinysrgb&w=600',
                            guia: 'https://images.pexels.com/photos/1270076/pexels-photo-1270076.jpeg?auto=compress&cs=tinysrgb&w=600'
                        };
                        
                        member.photo = defaultImages[member.role] || 'https://images.pexels.com/photos/1270076/pexels-photo-1270076.jpeg?auto=compress&cs=tinysrgb&w=600';
                        saveToLocalStorage(member);
                    }
                }
                
                // Reset form and reload data
                memberForm.reset();
                if (photoPreview) {
                    photoPreview.style.display = 'none';
                }
                
                await loadAllMembers();
                
            } catch (error) {
                console.error('Error saving member:', error);
                utils.showAlert(`Error al registrar miembro: ${error.message}`, 'error');
            }
        });
    } else if (memberForm && !isAdmin) {
        // Hide form if not admin
        memberForm.closest('section').style.display = 'none';
    }
    
    // Save member to localStorage
    function saveToLocalStorage(member) {
        const members = storage.get('members') || [];
        member.id = Date.now().toString();
        members.push(member);
        storage.set('members', members);
        utils.showAlert('Miembro registrado exitosamente (almacenamiento local)', 'success');
    }
    
    // Load all members from both localStorage and Supabase
    async function loadAllMembers() {
        if (!groupedMembersContainer) return;
        
        // Show loading state
        groupedMembersContainer.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>Cargando miembros...</p>
            </div>
        `;
        
        try {
            const filterValue = groupFilter ? groupFilter.value : '';
            
            // Get members from localStorage
            const members = storage.get('members') || [];
            
            // Create combined array with all members
            let combinedMembers = [];
            
            // If Supabase is available, use it instead of localStorage
            if (supabase) {
                try {
                    // Get scouts from Supabase
                    let scoutsQuery = supabase.from('scouts').select('*');
                    
                    if (filterValue) {
                        scoutsQuery = scoutsQuery.eq('group_section', filterValue);
                    }
                    
                    const { data: scoutsData, error: scoutsError } = await scoutsQuery;
                    
                    if (scoutsError) throw scoutsError;
                    
                    // Get dirigentes from Supabase
                    let dirigentesQuery = supabase.from('dirigentes').select('*');
                    
                    if (filterValue) {
                        dirigentesQuery = dirigentesQuery.eq('grupo_asignado', filterValue);
                    }
                    
                    const { data: dirigentesData, error: dirigentesError } = await dirigentesQuery;
                    
                    if (dirigentesError) throw dirigentesError;
                    
                    // Create combined array with all members
                    combinedMembers = [
                        ...members.filter(member => !filterValue || member.group === filterValue).map(member => ({
                            id: member.id || Date.now() + Math.random(),
                            name: member.fullName || member.name,
                            role: member.role,
                            photo: member.photo,
                            group: member.group || 'grupo-general',
                            source: 'members'
                        })),
                        ...scoutsData.map(scout => ({
                            id: scout.id,
                            name: scout.name,
                            role: 'scout',
                            photo: 'https://images.pexels.com/photos/1270076/pexels-photo-1270076.jpeg?auto=compress&cs=tinysrgb&w=600',
                            group: scout.group_section,
                            source: 'scouts'
                        })),
                        ...dirigentesData.map(dirigente => ({
                            id: dirigente.id,
                            name: dirigente.nombre,
                            role: dirigente.cargo === 'dirigente-seccion' ? 'dirigente' : 
                                  dirigente.cargo === 'asistente' ? 'delegado' : 'dirigente',
                            photo: 'https://images.pexels.com/photos/6646918/pexels-photo-6646918.jpeg?auto=compress&cs=tinysrgb&w=600',
                            group: dirigente.grupo_asignado,
                            source: 'dirigentes'
                        }))
                    ];
                } catch (error) {
                    console.error('Error loading members from Supabase:', error);
                    // Fall back to localStorage data if Supabase fails
                    combinedMembers = members.filter(member => !filterValue || member.group === filterValue).map(member => ({
                        id: member.id || Date.now() + Math.random(),
                        name: member.fullName || member.name,
                        role: member.role,
                        photo: member.photo,
                        group: member.group || 'grupo-general',
                        source: 'members'
                    }));
                }
            } else {
                // Use only localStorage data
                combinedMembers = members.filter(member => !filterValue || member.group === filterValue).map(member => ({
                    id: member.id || Date.now() + Math.random(),
                    name: member.fullName || member.name,
                    role: member.role,
                    photo: member.photo,
                    group: member.group || 'grupo-general',
                    source: 'members'
                }));
            }
            
            // Group members by group
            const groupedMembers = {};
            
            combinedMembers.forEach(member => {
                if (!groupedMembers[member.group]) {
                    groupedMembers[member.group] = {
                        dirigentes: [],
                        delegados: [],
                        guias: [],
                        otros: []
                    };
                }
                
                if (member.role === 'dirigente') {
                    groupedMembers[member.group].dirigentes.push(member);
                } else if (member.role === 'delegado') {
                    groupedMembers[member.group].delegados.push(member);
                } else if (member.role === 'guia') {
                    groupedMembers[member.group].guias.push(member);
                } else {
                    groupedMembers[member.group].otros.push(member);
                }
            });
            
            // Render grouped members
            if (Object.keys(groupedMembers).length === 0) {
                groupedMembersContainer.innerHTML = `
                    <p class="no-content">No hay miembros registrados${filterValue ? ' para el grupo seleccionado' : ''}</p>
                `;
                return;
            }
            
            let html = '';
            
            // Group display names
            const groupNames = {
                'bandada': '🐦 Bandada Misioneras de la Paz y la Naturaleza',
                'manada': '🐺 Manada Francisco de Asís',
                'compania': '🍀 Compañía A.M.T.R',
                'tropa': '🏕️ Tropa Yucatán',
                'avanzada': '🌠 Avanzada Ayekan',
                'clan': '🔥 Clan Peñi Rüpü',
                'grupo-general': 'Grupo General'
            };
            
            // Sort groups in a specific order
            const groupOrder = ['grupo-general', 'bandada', 'manada', 'compania', 'tropa', 'avanzada', 'clan'];
            
            const sortedGroups = Object.keys(groupedMembers).sort((a, b) => {
                return groupOrder.indexOf(a) - groupOrder.indexOf(b);
            });
            
            sortedGroups.forEach(group => {
                const groupData = groupedMembers[group];
                const groupName = groupNames[group] || group;
                
                html += `
                    <div class="group-section">
                        <h3>${groupName}</h3>
                `;
                
                // Render dirigentes
                if (groupData.dirigentes.length > 0) {
                    html += `
                        <div class="role-section">
                            <h4>Dirigentes</h4>
                            <div class="members-grid">
                    `;
                    
                    groupData.dirigentes.forEach(member => {
                        html += createMemberCard(member, 'dirigente');
                    });
                    
                    html += `
                            </div>
                        </div>
                    `;
                }
                
                // Render delegados
                if (groupData.delegados.length > 0) {
                    html += `
                        <div class="role-section">
                            <h4>Delegados</h4>
                            <div class="members-grid">
                    `;
                    
                    groupData.delegados.forEach(member => {
                        html += createMemberCard(member, 'delegado');
                    });
                    
                    html += `
                            </div>
                        </div>
                    `;
                }
                
                // Render guias
                if (groupData.guias.length > 0) {
                    html += `
                        <div class="role-section">
                            <h4>Guías</h4>
                            <div class="members-grid">
                    `;
                    
                    groupData.guias.forEach(member => {
                        html += createMemberCard(member, 'guia');
                    });
                    
                    html += `
                            </div>
                        </div>
                    `;
                }
                
                // Render otros
                if (groupData.otros.length > 0) {
                    html += `
                        <div class="role-section">
                            <h4>Scouts</h4>
                            <div class="members-grid">
                    `;
                    
                    groupData.otros.forEach(member => {
                        html += createMemberCard(member, 'scout');
                    });
                    
                    html += `
                            </div>
                        </div>
                    `;
                }
                
                html += `
                    </div>
                `;
            });
            
            groupedMembersContainer.innerHTML = html;
            
        } catch (error) {
            console.error('Error loading members:', error);
            groupedMembersContainer.innerHTML = `
                <div class="alert alert-error">
                    <p>Error al cargar miembros: ${error.message}</p>
                </div>
            `;
        }
    }
    
    // Create member card HTML
    function createMemberCard(member, className) {
        return `
            <div class="card member-card ${className}">
                <img src="${member.photo}" alt="${member.name}">
                <h3>${member.name}</h3>
                <p>${member.role.charAt(0).toUpperCase() + member.role.slice(1)}</p>
                ${isAdmin ? `
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="verMiembro('${member.id}', '${member.source}')">Ver</button>
                        ${member.source === 'members' ? `<button class="btn btn-sm btn-secondary" onclick="eliminarMiembro('${member.id}')">Eliminar</button>` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    // View member details
    window.verMiembro = function(id, source) {
        if (source === 'dirigentes') {
            // Open print-dirigente.html for dirigentes
            window.open(`admin/print-dirigente.html?id=${id}`, '_blank');
        } else {
            // Show alert for other member types
            utils.showAlert('Funcionalidad en desarrollo', 'info');
        }
    };
    
    // Delete member
    window.eliminarMiembro = function(id) {
        if (!isAdmin) return;
        
        if (confirm('¿Está seguro de que desea eliminar este miembro?')) {
            const members = storage.get('members') || [];
            const updatedMembers = members.filter(member => member.id !== id);
            storage.set('members', updatedMembers);
            loadAllMembers();
            utils.showAlert('Miembro eliminado exitosamente', 'success');
        }
    };
});

export default {};