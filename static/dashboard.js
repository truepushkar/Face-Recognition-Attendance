// static/dashboard.js

// ... (The code is almost identical to the old admin.js) ...
// The only change is how errors are handled. If an API call fails with
// a 401 Unauthorized status, we redirect to the login page.

// Helper function to handle API responses
async function handleApiResponse(response) {
    if (response.status === 401) {
        // Session expired or not logged in, redirect to login
        alert('Your session has expired. Please log in again.');
        window.location.href = '/admin';
        return null;
    }
    return response.json();
}

// Then, in every 'fetch' call, use this helper. For example:
const loadStudents = async () => {
        try {
            const response = await fetch('/students');
            const data = await response.json();
            studentList.innerHTML = ''; // Clear current list

            if (data.students.length === 0) {
                studentList.innerHTML = '<li>No students found. Add one above.</li>';
                return;
            }

            data.students.forEach(student => {
                const li = document.createElement('li');
                li.textContent = student.replace(/_/g, " ");

                // Rename Button
                const renameBtn = document.createElement('button');
                renameBtn.textContent = 'Rename';
                renameBtn.className = 'rename-btn';
                renameBtn.onclick = () => renameStudent(student);

                // Delete Button
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Delete';
                deleteBtn.className = 'delete-btn';
                deleteBtn.onclick = () => deleteStudent(student);

                li.appendChild(renameBtn);
                li.appendChild(deleteBtn);
                studentList.appendChild(li);
            });
        } catch (error) {
            console.error('Error loading students:', error);
            studentList.innerHTML = '<li>Error loading students.</li>';
        }
    };

// --- Full dashboard.js code ---
document.addEventListener('DOMContentLoaded', () => {
    const studentList = document.getElementById('student-list');
    const addStudentForm = document.getElementById('add-student-form');
    const newStudentNameInput = document.getElementById('new-student-name');
    const newStudentImageInput = document.getElementById('new-student-image');

    async function handleApiResponse(response) {
        if (response.status === 401) {
            alert('Your session has expired. Please log in again.');
            window.location.href = '/admin';
            return null;
        }
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'An API error occurred.');
        }
        return response.json();
    }

    const loadStudents = async () => {
        try {
            const response = await fetch('/students');
            const data = await handleApiResponse(response);
            if (!data) return;

            studentList.innerHTML = '';
            if (data.students.length === 0) {
                studentList.innerHTML = '<li>No students found.</li>';
                return;
            }
            data.students.forEach(student => {
                const li = document.createElement('li');
                li.textContent = student.replace(/_/g, " ");
                const renameBtn = document.createElement('button');
                renameBtn.textContent = 'Rename';
                renameBtn.className = 'rename-btn';
                renameBtn.onclick = () => renameStudent(student);
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Delete';
                deleteBtn.className = 'delete-btn';
                deleteBtn.onclick = () => deleteStudent(student);
                li.appendChild(renameBtn);
                li.appendChild(deleteBtn);
                studentList.appendChild(li);
            });
        } catch (error) {
            console.error('Error loading students:', error);
            studentList.innerHTML = `<li>${error.message}</li>`;
        }
    };

    addStudentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('name', newStudentNameInput.value.trim().replace(/ /g, "_"));
        formData.append('file', newStudentImageInput.files[0]);
        try {
            const response = await fetch('/add_student', { method: 'POST', body: formData });
            const result = await handleApiResponse(response);
            if (!result) return;
            alert(result.success);
            addStudentForm.reset();
            loadStudents();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    });

    window.deleteStudent = async (name) => {
        if (!confirm(`Are you sure you want to delete ${name}?`)) return;
        try {
            const response = await fetch('/delete_student', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            });
            const result = await handleApiResponse(response);
            if (!result) return;
            alert(result.success);
            loadStudents();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    window.renameStudent = async (oldName) => {
        const newName = prompt(`Enter new name for ${oldName}:`, oldName.replace(/_/g, " ")).trim().replace(/ /g, "_");
        if (!newName || newName === oldName) return;
        try {
            const response = await fetch('/rename_student', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ old_name: oldName, new_name: newName }),
            });
            const result = await handleApiResponse(response);
            if (!result) return;
            alert(result.success);
            loadStudents();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    loadStudents();
});