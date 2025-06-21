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

    // Inventory form
    const inventoryForm = document.getElementById('inventoryForm');
    if (inventoryForm) {
        inventoryForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const formData = new FormData(inventoryForm);
            const item = {
                id: Date.now(),
                name: formData.get('name'),
                category: formData.get('category'),
                quantity: parseInt(formData.get('quantity')),
                unit: formData.get('unit'),
                condition: formData.get('condition'),
                location: formData.get('location'),
                value: parseFloat(formData.get('value')) || 0,
                purchaseDate: formData.get('purchaseDate'),
                description: formData.get('description'),
                responsible: formData.get('responsible'),
                createdDate: new Date().toISOString()
            };

            const inventory = storage.get('inventory') || [];
            inventory.push(item);
            storage.set('inventory', inventory);

            inventoryForm.reset();
            loadInventory();
            utils.showAlert('Artículo agregado al inventario exitosamente', 'success');
        });
    }

    // Load inventory
    const loadInventory = () => {
        const inventory = storage.get('inventory') || [];
        const inventoryList = document.getElementById('inventoryList');
        
        if (!inventoryList) return;

        const searchTerm = document.getElementById('searchInventory')?.value.toLowerCase() || '';
        const categoryFilter = document.getElementById('filterCategory')?.value || '';
        const conditionFilter = document.getElementById('filterCondition')?.value || '';

        let filteredInventory = inventory.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchTerm);
            const matchesCategory = !categoryFilter || item.category === categoryFilter;
            const matchesCondition = !conditionFilter || item.condition === conditionFilter;
            return matchesSearch && matchesCategory && matchesCondition;
        });

        inventoryList.innerHTML = '';

        if (filteredInventory.length === 0) {
            inventoryList.innerHTML = '<p class="no-content">No hay artículos en el inventario</p>';
            return;
        }

        filteredInventory.forEach(item => {
            const itemCard = document.createElement('div');
            itemCard.className = 'card inventory-card';
            itemCard.innerHTML = `
                <h4>${item.name}</h4>
                <p><strong>Categoría:</strong> ${item.category}</p>
                <p><strong>Cantidad:</strong> ${item.quantity} ${item.unit}</p>
                <p><strong>Estado:</strong> <span class="status-indicator ${item.condition}">${item.condition}</span></p>
                <p><strong>Ubicación:</strong> ${item.location}</p>
                <p><strong>Valor:</strong> $${item.value.toFixed(2)}</p>
                <p><strong>Responsable:</strong> ${item.responsible || 'No asignado'}</p>
                <div class="action-buttons">
                    <button class="btn btn-secondary btn-sm" onclick="editInventoryItem(${item.id})">Editar</button>
                    <button class="btn btn-secondary btn-sm" onclick="deleteInventoryItem(${item.id})">Eliminar</button>
                </div>
            `;
            inventoryList.appendChild(itemCard);
        });
    };

    // Educational materials form
    const educationalForm = document.getElementById('educationalForm');
    if (educationalForm) {
        educationalForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const formData = new FormData(educationalForm);
            const material = {
                id: Date.now(),
                title: formData.get('title'),
                type: formData.get('type'),
                subject: formData.get('subject'),
                ageGroup: formData.get('ageGroup'),
                author: formData.get('author'),
                year: formData.get('year'),
                quantity: parseInt(formData.get('quantity')),
                description: formData.get('description'),
                location: formData.get('location'),
                available: parseInt(formData.get('quantity')),
                createdDate: new Date().toISOString()
            };

            const materials = storage.get('educationalMaterials') || [];
            materials.push(material);
            storage.set('educationalMaterials', materials);

            educationalForm.reset();
            loadMaterials();
            utils.showAlert('Material educativo agregado exitosamente', 'success');
        });
    }

    // Load materials
    const loadMaterials = () => {
        const materials = storage.get('educationalMaterials') || [];
        const materialsList = document.getElementById('materialsList');
        
        if (!materialsList) return;

        const searchTerm = document.getElementById('searchMaterials')?.value.toLowerCase() || '';
        const typeFilter = document.getElementById('filterMaterialType')?.value || '';
        const subjectFilter = document.getElementById('filterMaterialSubject')?.value || '';

        let filteredMaterials = materials.filter(material => {
            const matchesSearch = material.title.toLowerCase().includes(searchTerm);
            const matchesType = !typeFilter || material.type === typeFilter;
            const matchesSubject = !subjectFilter || material.subject === subjectFilter;
            return matchesSearch && matchesType && matchesSubject;
        });

        materialsList.innerHTML = '';

        if (filteredMaterials.length === 0) {
            materialsList.innerHTML = '<p class="no-content">No hay materiales educativos</p>';
            return;
        }

        filteredMaterials.forEach(material => {
            const materialCard = document.createElement('div');
            materialCard.className = 'card material-card';
            
            const groupNames = {
                'bandada': '🐦 Bandada',
                'manada': '🐺 Manada',
                'compania': '🍀 Compañía',
                'tropa': '🏕️ Tropa',
                'avanzada': '🌠 Avanzada',
                'clan': '🔥 Clan',
                'dirigentes': 'Dirigentes',
                'todos': 'Todos los grupos'
            };

            materialCard.innerHTML = `
                <h4>${material.title}</h4>
                <p><strong>Tipo:</strong> ${material.type}</p>
                <p><strong>Tema:</strong> ${material.subject}</p>
                <p><strong>Grupo:</strong> ${groupNames[material.ageGroup] || material.ageGroup}</p>
                <p><strong>Autor:</strong> ${material.author || 'No especificado'}</p>
                <p><strong>Año:</strong> ${material.year || 'No especificado'}</p>
                <p><strong>Disponibles:</strong> ${material.available}/${material.quantity}</p>
                <p><strong>Ubicación:</strong> ${material.location}</p>
                <div class="action-buttons">
                    <button class="btn btn-primary btn-sm" onclick="borrowMaterial(${material.id})">Prestar</button>
                    <button class="btn btn-secondary btn-sm" onclick="editMaterial(${material.id})">Editar</button>
                    <button class="btn btn-secondary btn-sm" onclick="deleteMaterial(${material.id})">Eliminar</button>
                </div>
            `;
            materialsList.appendChild(materialCard);
        });
    };

    // Equipment form
    const equipmentForm = document.getElementById('equipmentForm');
    if (equipmentForm) {
        equipmentForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const formData = new FormData(equipmentForm);
            const equipment = {
                id: Date.now(),
                name: formData.get('name'),
                type: formData.get('type'),
                brand: formData.get('brand'),
                model: formData.get('model'),
                serial: formData.get('serial'),
                condition: formData.get('condition'),
                purchaseDate: formData.get('purchaseDate'),
                value: parseFloat(formData.get('value')) || 0,
                location: formData.get('location'),
                responsible: formData.get('responsible'),
                notes: formData.get('notes'),
                status: 'available',
                createdDate: new Date().toISOString()
            };

            const equipmentList = storage.get('equipment') || [];
            equipmentList.push(equipment);
            storage.set('equipment', equipmentList);

            equipmentForm.reset();
            loadEquipment();
            utils.showAlert('Equipo registrado exitosamente', 'success');
        });
    }

    // Load equipment
    const loadEquipment = () => {
        const equipmentList = storage.get('equipment') || [];
        const equipmentContainer = document.getElementById('equipmentList');
        
        if (!equipmentContainer) return;

        const searchTerm = document.getElementById('searchEquipment')?.value.toLowerCase() || '';
        const typeFilter = document.getElementById('filterEquipmentType')?.value || '';
        const conditionFilter = document.getElementById('filterEquipmentCondition')?.value || '';

        let filteredEquipment = equipmentList.filter(equipment => {
            const matchesSearch = equipment.name.toLowerCase().includes(searchTerm);
            const matchesType = !typeFilter || equipment.type === typeFilter;
            const matchesCondition = !conditionFilter || equipment.condition === conditionFilter;
            return matchesSearch && matchesType && matchesCondition;
        });

        equipmentContainer.innerHTML = '';

        if (filteredEquipment.length === 0) {
            equipmentContainer.innerHTML = '<p class="no-content">No hay equipamiento registrado</p>';
            return;
        }

        filteredEquipment.forEach(equipment => {
            const equipmentCard = document.createElement('div');
            equipmentCard.className = 'card equipment-card';
            equipmentCard.innerHTML = `
                <h4>${equipment.name}</h4>
                <p><strong>Tipo:</strong> ${equipment.type}</p>
                <p><strong>Marca:</strong> ${equipment.brand || 'No especificada'}</p>
                <p><strong>Modelo:</strong> ${equipment.model || 'No especificado'}</p>
                <p><strong>Serie:</strong> ${equipment.serial || 'No especificado'}</p>
                <p><strong>Estado:</strong> <span class="status-indicator ${equipment.condition}">${equipment.condition}</span></p>
                <p><strong>Ubicación:</strong> ${equipment.location}</p>
                <p><strong>Responsable:</strong> ${equipment.responsible || 'No asignado'}</p>
                <p><strong>Valor:</strong> $${equipment.value.toFixed(2)}</p>
                <div class="action-buttons">
                    <button class="btn btn-primary btn-sm" onclick="reserveEquipment(${equipment.id})">Reservar</button>
                    <button class="btn btn-secondary btn-sm" onclick="editEquipment(${equipment.id})">Editar</button>
                    <button class="btn btn-secondary btn-sm" onclick="deleteEquipment(${equipment.id})">Eliminar</button>
                </div>
            `;
            equipmentContainer.appendChild(equipmentCard);
        });
    };

    // Location form
    const locationForm = document.getElementById('locationForm');
    if (locationForm) {
        locationForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const formData = new FormData(locationForm);
            const facilities = formData.getAll('facilities');
            
            const location = {
                id: Date.now(),
                name: formData.get('name'),
                type: formData.get('type'),
                address: formData.get('address'),
                capacity: parseInt(formData.get('capacity')) || 0,
                area: parseFloat(formData.get('area')) || 0,
                status: formData.get('status'),
                facilities: facilities,
                contact: formData.get('contact'),
                phone: formData.get('phone'),
                cost: parseFloat(formData.get('cost')) || 0,
                notes: formData.get('notes'),
                createdDate: new Date().toISOString()
            };

            const locations = storage.get('locations') || [];
            locations.push(location);
            storage.set('locations', locations);

            locationForm.reset();
            loadLocations();
            utils.showAlert('Locación registrada exitosamente', 'success');
        });
    }

    // Load locations
    const loadLocations = () => {
        const locations = storage.get('locations') || [];
        const locationsList = document.getElementById('locationsList');
        
        if (!locationsList) return;

        const searchTerm = document.getElementById('searchLocations')?.value.toLowerCase() || '';
        const typeFilter = document.getElementById('filterLocationType')?.value || '';
        const statusFilter = document.getElementById('filterLocationStatus')?.value || '';

        let filteredLocations = locations.filter(location => {
            const matchesSearch = location.name.toLowerCase().includes(searchTerm);
            const matchesType = !typeFilter || location.type === typeFilter;
            const matchesStatus = !statusFilter || location.status === statusFilter;
            return matchesSearch && matchesType && matchesStatus;
        });

        locationsList.innerHTML = '';

        if (filteredLocations.length === 0) {
            locationsList.innerHTML = '<p class="no-content">No hay locaciones registradas</p>';
            return;
        }

        filteredLocations.forEach(location => {
            const locationCard = document.createElement('div');
            locationCard.className = 'card location-card';
            
            const facilitiesText = location.facilities.length > 0 ? location.facilities.join(', ') : 'Ninguna especificada';
            
            locationCard.innerHTML = `
                <h4>${location.name}</h4>
                <p><strong>Tipo:</strong> ${location.type}</p>
                <p><strong>Dirección:</strong> ${location.address}</p>
                <p><strong>Capacidad:</strong> ${location.capacity} personas</p>
                <p><strong>Área:</strong> ${location.area} m²</p>
                <p><strong>Estado:</strong> <span class="status-indicator ${location.status}">${location.status}</span></p>
                <p><strong>Instalaciones:</strong> ${facilitiesText}</p>
                <p><strong>Contacto:</strong> ${location.contact || 'No especificado'}</p>
                <p><strong>Teléfono:</strong> ${location.phone || 'No especificado'}</p>
                <p><strong>Costo:</strong> $${location.cost.toFixed(2)}</p>
                <div class="action-buttons">
                    <button class="btn btn-primary btn-sm" onclick="reserveLocation(${location.id})">Reservar</button>
                    <button class="btn btn-secondary btn-sm" onclick="editLocation(${location.id})">Editar</button>
                    <button class="btn btn-secondary btn-sm" onclick="deleteLocation(${location.id})">Eliminar</button>
                </div>
            `;
            locationsList.appendChild(locationCard);
        });
    };

    // Event listeners for search and filters
    document.getElementById('searchInventory')?.addEventListener('input', loadInventory);
    document.getElementById('filterCategory')?.addEventListener('change', loadInventory);
    document.getElementById('filterCondition')?.addEventListener('change', loadInventory);

    document.getElementById('searchMaterials')?.addEventListener('input', loadMaterials);
    document.getElementById('filterMaterialType')?.addEventListener('change', loadMaterials);
    document.getElementById('filterMaterialSubject')?.addEventListener('change', loadMaterials);

    document.getElementById('searchEquipment')?.addEventListener('input', loadEquipment);
    document.getElementById('filterEquipmentType')?.addEventListener('change', loadEquipment);
    document.getElementById('filterEquipmentCondition')?.addEventListener('change', loadEquipment);

    document.getElementById('searchLocations')?.addEventListener('input', loadLocations);
    document.getElementById('filterLocationType')?.addEventListener('change', loadLocations);
    document.getElementById('filterLocationStatus')?.addEventListener('change', loadLocations);

    // Delete functions
    window.deleteInventoryItem = (id) => {
        const inventory = storage.get('inventory') || [];
        const updatedInventory = inventory.filter(item => item.id !== id);
        storage.set('inventory', updatedInventory);
        loadInventory();
        utils.showAlert('Artículo eliminado del inventario', 'success');
    };

    window.deleteMaterial = (id) => {
        const materials = storage.get('educationalMaterials') || [];
        const updatedMaterials = materials.filter(material => material.id !== id);
        storage.set('educationalMaterials', updatedMaterials);
        loadMaterials();
        utils.showAlert('Material educativo eliminado', 'success');
    };

    window.deleteEquipment = (id) => {
        const equipmentList = storage.get('equipment') || [];
        const updatedEquipment = equipmentList.filter(equipment => equipment.id !== id);
        storage.set('equipment', updatedEquipment);
        loadEquipment();
        utils.showAlert('Equipo eliminado', 'success');
    };

    window.deleteLocation = (id) => {
        const locations = storage.get('locations') || [];
        const updatedLocations = locations.filter(location => location.id !== id);
        storage.set('locations', updatedLocations);
        loadLocations();
        utils.showAlert('Locación eliminada', 'success');
    };

    // Export functions
    window.exportInventory = () => {
        const inventory = storage.get('inventory') || [];
        
        if (inventory.length === 0) {
            utils.showAlert('No hay datos para exportar', 'error');
            return;
        }

        let csv = 'Nombre,Categoría,Cantidad,Unidad,Estado,Ubicación,Valor,Responsable\n';
        
        inventory.forEach(item => {
            csv += `"${item.name}","${item.category}",${item.quantity},"${item.unit}","${item.condition}","${item.location}",${item.value},"${item.responsible || ''}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventario_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);

        utils.showAlert('Inventario exportado exitosamente', 'success');
    };

    // Initial load
    loadInventory();
    loadMaterials();
    loadEquipment();
    loadLocations();
});