// static/analytics.js

document.addEventListener('DOMContentLoaded', async () => {
    const totalDaysEl = document.getElementById('total-days');
    const tableBody = document.querySelector('#attendance-table tbody');
    const chartCanvas = document.getElementById('attendanceChart');

    if (!studentName) {
        console.error('Student name not provided.');
        return;
    }

    try {
        const response = await fetch(`/api/analytics/${studentName}`);
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        // 1. Update total days summary
        totalDaysEl.textContent = data.total_days;

        // 2. Populate the attendance table
        tableBody.innerHTML = ''; // Clear existing rows
        if (data.records.length === 0) {
            const row = `<tr><td colspan="2">No attendance records found.</td></tr>`;
            tableBody.innerHTML = row;
        } else {
            data.records.forEach(record => {
                const row = `
                    <tr>
                        <td>${record.date}</td>
                        <td>${new Date(record.timestamp).toLocaleTimeString()}</td>
                    </tr>
                `;
                tableBody.insertAdjacentHTML('beforeend', row);
            });
        }
        
        // 3. Prepare data and render the chart
        renderChart(data.records, chartCanvas);

    } catch (error) {
        console.error('Failed to load analytics:', error);
        totalDaysEl.textContent = 'Error';
        tableBody.innerHTML = `<tr><td colspan="2">Could not load data.</td></tr>`;
    }
});

function renderChart(records, canvas) {
    if (!canvas || records.length === 0) return;

    // Process data for the chart: count attendance per date
    const attendanceByDate = records.reduce((acc, record) => {
        acc[record.date] = (acc[record.date] || 0) + 1;
        return acc;
    }, {});

    const chartLabels = Object.keys(attendanceByDate).sort();
    const chartData = chartLabels.map(label => attendanceByDate[label]);

    new Chart(canvas, {
        type: 'bar', // or 'line'
        data: {
            labels: chartLabels,
            datasets: [{
                label: 'Attendance Count',
                data: chartData,
                backgroundColor: 'rgba(0, 123, 255, 0.5)',
                borderColor: 'rgba(0, 123, 255, 1)',
                borderWidth: 1,
                barThickness: 20,
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1 // Ensure y-axis only shows whole numbers
                    }
                },
                x: {
                   ticks: {
                        maxRotation: 45,
                        minRotation: 45
                   }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Present`;
                        }
                    }
                }
            },
            responsive: true,
            maintainAspectRatio: false
        }
    });
}