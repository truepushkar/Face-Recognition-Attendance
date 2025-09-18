import os
import face_recognition
import numpy as np
import mysql.connector
from flask import Flask, request, jsonify, render_template, session, redirect, url_for, flash
import base64
import io
from datetime import datetime
import pickle
from functools import wraps

app = Flask(__name__)

# --- Config ---
app.secret_key = 'a-very-long-and-random-secret-key-for-sessions'
ADMIN_PASSWORD = 'admin'

# --- MySQL Configuration ---
db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': 'pushkar',  
    'database': 'attendance_system'
}

# --- Global Variables ---
known_encodings = []
known_names = []
student_ids = []


# --- DB Helper ---
def get_db_connection():
    return mysql.connector.connect(**db_config)


# --- Login Decorator ---
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'logged_in' not in session:
            # If request expects JSON, return 401
            if request.accept_mimetypes.accept_json:
                return jsonify({'error': 'Unauthorized'}), 401
            flash('Please log in to access this page.', 'danger')
            return redirect(url_for('login_page'))
        return f(*args, **kwargs)
    return decorated_function


# --- Load Students from DB ---
def load_known_faces():
    """Load face encodings and names from MySQL DB."""
    global known_encodings, known_names, student_ids
    known_encodings.clear()
    known_names.clear()
    student_ids.clear()

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, name, encoding FROM students")
    rows = cursor.fetchall()
    conn.close()

    for row in rows:
        if row['encoding']:
            encoding = pickle.loads(row['encoding'])
            known_encodings.append(encoding)
            known_names.append(row['name'])
            student_ids.append(row['id'])
    print(f"Loaded {len(known_names)} students from DB.")


# --- Attendance Logging ---
def log_attendance(student_id, name):
    conn = get_db_connection()
    cursor = conn.cursor()

    now = datetime.now()
    timestamp = now.strftime('%Y-%m-%d %H:%M:%S')
    date = now.strftime('%Y-%m-%d')

    cursor.execute(
        "SELECT * FROM attendance WHERE student_id=%s AND date=%s",
        (student_id, date)
    )
    if cursor.fetchone():
        conn.close()
        print(f"{name} already marked present for {date}.")
        return

    cursor.execute(
        "INSERT INTO attendance (student_id, timestamp, date) VALUES (%s, %s, %s)",
        (student_id, timestamp, date)
    )
    conn.commit()
    conn.close()
    print(f"Logged attendance for {name}.")


# --- Page Routes ---
@app.route('/')
def index():
    return render_template('index.html')


@app.route('/admin', methods=['GET', 'POST'])
def login_page():
    if request.method == 'POST':
        password = request.form.get('password')
        if password == ADMIN_PASSWORD:
            session['logged_in'] = True
            flash('Login successful!', 'success')
            return redirect(url_for('dashboard'))
        else:
            flash('Incorrect password. Please try again.', 'danger')
    return render_template('login.html')


@app.route('/logout')
def logout():
    session.pop('logged_in', None)
    flash('You have been logged out.', 'info')
    return redirect(url_for('login_page'))


@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html')


@app.route('/analytics/<name>')
def analytics_page(name):
    return render_template('analytics.html', student_name=name)


# --- API: Recognize Face ---
@app.route('/recognize', methods=['POST'])
def recognize_face():
    data = request.get_json()
    if 'image' not in data:
        return jsonify({'error': 'No image data provided'}), 400

    image_data = data['image'].split(',')[1]
    image_bytes = base64.b64decode(image_data)

    try:
        unknown_image = face_recognition.load_image_file(io.BytesIO(image_bytes))
        unknown_encodings = face_recognition.face_encodings(unknown_image)
    except Exception as e:
        return jsonify({'error': f"Could not process image: {e}"}), 400

    if not unknown_encodings:
        return jsonify({'name': 'Unknown (No face detected)'})

    results = face_recognition.compare_faces(known_encodings, unknown_encodings[0], tolerance=0.6)
    face_distances = face_recognition.face_distance(known_encodings, unknown_encodings[0])

    if any(results):
        best_match_index = np.argmin(face_distances)
        if results[best_match_index]:
            name = known_names[best_match_index]
            student_id = student_ids[best_match_index]
            log_attendance(student_id, name)
            return jsonify({'name': name})

    return jsonify({'name': 'Unknown'})


# --- API: Add Student ---
@app.route('/add_student', methods=['POST'])
@login_required
def add_student():
    name = request.form.get('name')
    file = request.files.get('file')

    if not name or not file:
        return jsonify({'error': 'Name and file are required'}), 400

    image_bytes = file.read()
    image = face_recognition.load_image_file(io.BytesIO(image_bytes))
    encodings = face_recognition.face_encodings(image)

    if not encodings:
        return jsonify({'error': 'No face detected in uploaded image'}), 400

    encoding_blob = pickle.dumps(encodings[0])

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO students (name, image, encoding) VALUES (%s, %s, %s)",
        (name, image_bytes, encoding_blob)
    )
    conn.commit()
    conn.close()

    load_known_faces()
    return jsonify({'success': f"Student '{name}' added successfully."})


# --- API: Delete Student ---
@app.route('/delete_student', methods=['POST'])
@login_required
def delete_student():
    data = request.get_json()
    name = data.get('name')
    if not name:
        return jsonify({'error': 'Name is required'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM students WHERE name=%s", (name,))
    conn.commit()
    conn.close()

    load_known_faces()
    return jsonify({'success': f"Student '{name}' deleted."})


# --- API: Rename Student ---
@app.route('/rename_student', methods=['POST'])
@login_required
def rename_student():
    data = request.get_json()
    old_name = data.get('old_name')
    new_name = data.get('new_name')

    if not old_name or not new_name:
        return jsonify({'error': 'Old and new names are required'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE students SET name=%s WHERE name=%s", (new_name, old_name))
    conn.commit()
    conn.close()

    load_known_faces()
    return jsonify({'success': f"Renamed '{old_name}' to '{new_name}'."})


# --- API: Analytics ---
@app.route('/api/analytics/<name>', methods=['GET'])
@login_required
def get_analytics_data(name):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT id FROM students WHERE name=%s", (name,))
    student = cursor.fetchone()
    if not student:
        conn.close()
        return jsonify({'total_days': 0, 'records': []})

    student_id = student['id']
    cursor.execute("SELECT date, timestamp FROM attendance WHERE student_id=%s", (student_id,))
    records = cursor.fetchall()
    conn.close()

    total_days = len({r['date'] for r in records})
    records.sort(key=lambda x: x['date'])

    return jsonify({'total_days': total_days, 'records': records})


# --- API: List Students (for dashboard.js) ---
@app.route('/students', methods=['GET'])
@login_required
def get_students():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM students")
    rows = cursor.fetchall()
    conn.close()

    students = [row[0] for row in rows]
    return jsonify({'students': students})


if __name__ == '__main__':
    load_known_faces()
    app.run(debug=False, host='0.0.0.0')
