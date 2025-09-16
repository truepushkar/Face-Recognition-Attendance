// static/script.js

document.addEventListener('DOMContentLoaded', () => {
    // Webcam and Recognition Logic
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const captureBtn = document.getElementById('capture-btn');
    const resultName = document.getElementById('result-name');
    const resultContainer = document.getElementById('result-container');
    const scanLine = document.querySelector('.scan-line');

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => { video.srcObject = stream; video.play(); })
            .catch(err => console.error("Error accessing webcam: ", err));
    }

    captureBtn.addEventListener('click', () => {
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg');
        
        resultName.textContent = "Processing...";
        resultContainer.className = 'processing';
        scanLine.style.display = 'block'; // Show scan animation

        fetch('/recognize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: imageData }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.name && data.name !== 'Unknown' && !data.name.includes('No face')) {
                const displayName = data.name.replace(/_/g, " ");
                resultName.innerHTML = `Welcome, ${displayName}! <a href="/analytics/${data.name}" class="analytics-link">(View History)</a>`;
                resultContainer.className = 'success';
            } else {
                resultName.textContent = data.name.includes('No face') ? "No face detected." : "Unknown Person.";
                resultContainer.className = 'error';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            resultName.textContent = "Error during recognition.";
            resultContainer.className = 'error';
        })
        .finally(() => {
            scanLine.style.display = 'none'; // Hide scan animation
        });
    });

    // Analytics Form Logic
    const analyticsForm = document.getElementById('analytics-form');
    const nameInput = document.getElementById('analytics-name-input');
    analyticsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const studentName = nameInput.value.trim().replace(/ /g, "_");
        if (studentName) {
            window.location.href = `/analytics/${studentName}`;
        }
    });
});