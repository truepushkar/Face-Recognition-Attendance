// static/analytics.js

document.addEventListener('DOMContentLoaded', async () => {
    console.log("Analytics script loaded");

    const totalDaysEl = document.getElementById('total-days');
    const tableBody = document.getElementById('attendance-table'); // fixed selector
    const chartCanvas = document.getElementById('attendanceChart');

    console.log("totalDaysEl:", totalDaysEl);
    console.log("tableBody:", tableBody);
    console.log("chartCanvas:", chartCanvas);

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
                const time = formatTime(record.timestamp);

                const row = `
                    <tr>
                        <td>${record.date}</td>
                        <td>${time}</td>
                    </tr>
                `;
                tableBody.insertAdjacentHTML('beforeend', row);
            });
        }

        // 3. Prepare data and render the chart
        renderChart(data.records, chartCanvas);

    } catch (error) {
        console.error('Failed to load analytics:', error);
        if (totalDaysEl) totalDaysEl.textContent = 'Error';
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="2">Could not load data.</td></tr>`;
    }
});

// --- Helper: format "YYYY-MM-DD HH:MM:SS" into "H:MM AM/PM"
function formatTime(timestamp) {
    if (!timestamp) return "--";

    const parts = timestamp.split(" "); 
    if (parts.length < 2) return timestamp;

    const timePart = parts[1]; // "HH:MM:SS"
    const [hours, minutes] = timePart.split(":");
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;

    return `${h}:${minutes} ${ampm}`;
}

function renderChart(records, canvas) {
  if (!canvas || records.length === 0) return;

  const attendanceByDate = records.reduce((acc, record) => {
    acc[record.date] = (acc[record.date] || 0) + 1;
    return acc;
  }, {});

  const chartLabels = Object.keys(attendanceByDate).sort();
  const chartData = chartLabels.map(label => attendanceByDate[label]);

  new Chart(canvas, {
    type: 'line',
    data: {
      labels: chartLabels,
      datasets: [{
        label: 'Attendance',
        data: chartData,
        fill: true,
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: 'rgb(99, 102, 241)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `Present: ${ctx.formattedValue}`
          }
        }
      }
    }
  });
}
