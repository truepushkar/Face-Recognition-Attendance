# Face Recognition Attendance System

## Overview
This project is an automated student attendance monitoring and analytics system for colleges, built for the Smart India Hackathon. It leverages face recognition technology to mark attendance, provides analytics, and offers a secure admin dashboard for management.

## Features
- **Face Recognition Attendance:** Students' faces are recognized from images to mark attendance automatically.
- **Admin Dashboard:** Secure login for administrators to manage students and view attendance records.
- **Student Management:** Add, delete, and rename students with face data.
- **Attendance Analytics:** View attendance history and statistics for each student.
- **RESTful APIs:** Endpoints for face recognition, student management, and analytics.
- **MySQL Database:** Stores student data, face encodings, and attendance logs.

## Technologies Used
- Python 3
- Flask (Web Framework)
- face_recognition (Face detection and encoding)
- MySQL (Database)
- HTML, CSS, JavaScript (Frontend)

## Folder Structure
```
├── app.py                # Main Flask application
├── requirements.txt      # Python dependencies
├── static/               # Static files (JS, CSS)
├── templates/            # HTML templates
├── README.md             # Project documentation
```

## Setup Instructions

### 1. Clone the Repository
```powershell
git clone https://github.com/truepushkar/Face-Recognition-Attendance.git
cd Face-Recognition-Attendance
```

### 2. Install Python Dependencies
Ensure you have Python 3 installed. Then run:
```powershell
pip install -r requirements.txt
```

### 3. MySQL Database Setup
1. Install MySQL and create a database named `attendance_system`.
2. Create the required tables:
```sql
CREATE TABLE students (
	id INT AUTO_INCREMENT PRIMARY KEY,
	name VARCHAR(255) NOT NULL,
	image LONGBLOB,
	encoding LONGBLOB
);

CREATE TABLE attendance (
	id INT AUTO_INCREMENT PRIMARY KEY,
	student_id INT,
	timestamp DATETIME,
	date DATE,
	FOREIGN KEY (student_id) REFERENCES students(id)
);
```
3. Update the database credentials in `app.py`:
```python
db_config = {
	'host': 'localhost',
	'user': 'root',
	'password': 'your_mysql_password',
	'database': 'attendance_system'
}
```

### 4. Run the Application
```powershell
python app.py
```
The app will start on `http://0.0.0.0:5000`.

## Usage

### Admin Login
- Go to `/admin` and log in with the admin password (set in `app.py`).

### Dashboard
- Manage students: Add, delete, or rename students.
- View attendance records.

### Mark Attendance
- Use the `/recognize` API endpoint to send a base64-encoded image and mark attendance.

### Analytics
- View analytics for a student at `/analytics/<student_name>`.

## API Endpoints

| Endpoint                | Method | Description                          |
|-------------------------|--------|--------------------------------------|
| `/recognize`            | POST   | Recognize face and mark attendance   |
| `/add_student`          | POST   | Add a new student (admin only)       |
| `/delete_student`       | POST   | Delete a student (admin only)        |
| `/rename_student`       | POST   | Rename a student (admin only)        |
| `/students`             | GET    | List all students (admin only)       |
| `/api/analytics/<name>` | GET    | Get attendance analytics (admin only)|

## Security
- Admin routes are protected by session-based authentication.
- Password is set in `app.py` (`ADMIN_PASSWORD`).

## Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## License
This project is licensed under the GNU GENERAL PUBLIC LICENSE.
