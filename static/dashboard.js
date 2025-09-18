// static/dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    const studentList = document.getElementById('student-list');
    const addStudentForm = document.getElementById('add-student-form');
    const newStudentNameInput = document.getElementById('new-student-name');
    const newStudentImageInput = document.getElementById('new-student-image');

    // --- API Helper ---
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

    // --- Render Students in Styled UI ---
    function renderStudents(students) {
        studentList.innerHTML = '';

        if (!students || students.length === 0) {
            studentList.innerHTML = 
              '<li class="text-slate-400">No students found.</li>';
            return;
        }

        students.forEach(student => {
            const displayName = student.replace(/_/g, " ");

            const li = document.createElement('li');
            li.className = "flex items-center justify-between px-4 py-3 rounded-xl glass glass-border";

            li.innerHTML = `
                <span class="font-medium">${displayName}</span>
                <div class="flex gap-2">
                  <button onclick="renameStudent('${student}')"
                    class="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition text-xs shadow-md flex items-center gap-1">
                    <i data-feather="edit-2" class="w-3 h-3"></i> Rename
                  </button>
                  <button onclick="deleteStudent('${student}')"
                    class="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 transition text-xs shadow-md flex items-center gap-1">
                    <i data-feather="trash-2" class="w-3 h-3"></i> Delete
                  </button>
                </div>
            `;
            studentList.appendChild(li);
        });

        feather.replace(); // refresh icons
    }

    // --- Load Students from Backend ---
    const loadStudents = async () => {
        try {
            const response = await fetch('/students');
            const data = await handleApiResponse(response);
            if (!data) return;
            renderStudents(data.students);
        } catch (error) {
            console.error('Error loading students:', error);
            studentList.innerHTML = `<li class="text-rose-400">${error.message}</li>`;
        }
    };

    // --- Add Student ---
    addStudentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('name', newStudentNameInput.value.trim().replace(/ /g, "_"));
        formData.append('file', newStudentImageInput.files[0]);

        try {
            const response = await fetch('/add_student', {
                method: 'POST',
                body: formData
            });
            const result = await handleApiResponse(response);
            if (!result) return;
            alert(result.success);
            addStudentForm.reset();
            loadStudents();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    });

    // --- Delete Student ---
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

    // --- Rename Student ---
    window.renameStudent = async (oldName) => {
        const newName = prompt(`Enter new name for ${oldName}:`, oldName.replace(/_/g, " "));
        if (!newName) return;
        const safeName = newName.trim().replace(/ /g, "_");
        if (safeName === oldName) return;

        try {
            const response = await fetch('/rename_student', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ old_name: oldName, new_name: safeName }),
            });
            const result = await handleApiResponse(response);
            if (!result) return;
            alert(result.success);
            loadStudents();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    // --- Initial Load ---
    loadStudents();
});
