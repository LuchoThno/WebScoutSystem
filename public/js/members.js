document.addEventListener('DOMContentLoaded', () => {
    const memberForm = document.getElementById('memberForm');
    const photoInput = document.getElementById('photo');
    const photoPreview = document.getElementById('photoPreview');
    const membersGrid = document.getElementById('membersGrid');
    const isAdmin = storage.get('adminLoggedIn');

    // Load existing members
    const loadMembers = () => {
        const members = storage.get('members') || [];
        membersGrid.innerHTML = '';

        members.forEach((member, index) => {
            const memberCard = document.createElement('div');
            memberCard.className = 'card member-card';
            memberCard.innerHTML = `
                <img src="${member.photo}" alt="${member.fullName}">
                <h3>${member.fullName}</h3>
                <p>${member.role.charAt(0).toUpperCase() + member.role.slice(1)}</p>
                ${isAdmin ? `
                    <button class="btn btn-secondary" onclick="deleteMember(${index})">Eliminar</button>
                ` : ''}
            `;
            membersGrid.appendChild(memberCard);
        });
    };

    // Hide form if not admin
    if (!isAdmin && memberForm) {
        memberForm.closest('section').style.display = 'none';
    }

    // Delete member
    window.deleteMember = (index) => {
        if (!isAdmin) return;
        const members = storage.get('members') || [];
        members.splice(index, 1);
        storage.set('members', members);
        loadMembers();
        utils.showAlert('Miembro eliminado exitosamente', 'success');
    };

    // Handle photo preview
    if (photoInput && isAdmin) {
        photoInput.addEventListener('change', (e) => {
            utils.createImagePreview(e.target.files[0], photoPreview);
        });
    }

    // Handle form submission
    if (memberForm && isAdmin) {
        memberForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const formData = new FormData(memberForm);
            const photoFile = photoInput.files[0];

            const rules = {
                fullName: { required: true, minLength: 3 },
                role: { required: true },
                photo: { required: true }
            };

            const errors = utils.validateForm(formData, rules);
            if (errors) {
                Object.values(errors).forEach(error => {
                    utils.showAlert(error, 'error');
                });
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const member = {
                    fullName: formData.get('fullName'),
                    role: formData.get('role'),
                    photo: e.target.result
                };

                const members = storage.get('members') || [];
                members.push(member);
                storage.set('members', members);

                memberForm.reset();
                photoPreview.style.display = 'none';
                loadMembers();
                utils.showAlert('Miembro registrado exitosamente', 'success');
            };

            reader.readAsDataURL(photoFile);
        });
    }

    // Initial load of members
    loadMembers();
});