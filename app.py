# app.py

import os
import face_recognition
import numpy as np
from flask import Flask, request, jsonify, render_template, session, redirect, url_for, flash
import base64
import io
from datetime import datetime
import pandas as pd
from functools import wraps

app = Flask(__name__)

# IMPORTANT: Change this to a long, random string!
app.secret_key = 'a-very-long-and-random-secret-key-for-sessions' 
ADMIN_PASSWORD = 'admin' # Change this password!

# --- Configuration ---
KNOWN_FACES_DIR = "known_faces"
ATTENDANCE_FILE = "attendance.csv"


# --- Global Variables ---
known_encodings = []
known_names = []


# --- Login Decorator ---
def login_required(f):
    """Decorator to protect routes that require an admin login."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'logged_in' not in session:
            flash('Please log in to access this page.', 'danger')
            return redirect(url_for('login_page'))
        return f(*args, **kwargs)
    return decorated_function

# --- Core Functions ---
def load_known_faces():
    """Loads face encodings from the known_faces directory."""
    global known_encodings, known_names
    known_encodings.clear()
    known_names.clear()
    if not os.path.exists(KNOWN_FACES_DIR):
        os.makedirs(KNOWN_FACES_DIR)
    print("Loading known faces...")
    for filename in os.listdir(KNOWN_FACES_DIR):
        if filename.lower().endswith((".jpg", ".png", ".jpeg")):
            try:
                image_path = os.path.join(KNOWN_FACES_DIR, filename)
                image = face_recognition.load_image_file(image_path)
                encodings = face_recognition.face_encodings(image)
                if encodings:
                    known_encodings.append(encodings[0])
                    known_names.append(os.path.splitext(filename)[0])
                else:
                    print(f"Warning: No face found in {filename}.")
            except Exception as e:
                print(f"Error loading {filename}: {e}")
    print(f"Loaded {len(known_names)} known faces.")

def log_attendance(name):
    """Logs the student's attendance to a CSV file."""
    if not os.path.exists(ATTENDANCE_FILE):
        with open(ATTENDANCE_FILE, "w") as f:
            f.write("timestamp,date,name\n")

    now = datetime.now()
    timestamp = now.strftime('%Y-%m-%d %H:%M:%S')
    date = now.strftime('%Y-%m-%d')
    try:
        df = pd.read_csv(ATTENDANCE_FILE)
        if not df[(df['name'] == name) & (df['date'] == date)].empty:
            print(f"{name} already marked present for {date}.")
            return
    except pd.errors.EmptyDataError:
        pass
    with open(ATTENDANCE_FILE, "a") as f:
        f.write(f"{timestamp},{date},{name}\n")
    print(f"Logged attendance for {name}.")

# --- Page Rendering Routes ---
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/admin', methods=['GET', 'POST'])
def login_page():
    """Handles the admin login page."""
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
    """Logs the admin out."""
    session.pop('logged_in', None)
    flash('You have been logged out.', 'info')
    return redirect(url_for('login_page'))

@app.route('/dashboard')
@login_required
def dashboard():
    """Renders the main admin dashboard."""
    return render_template('dashboard.html')

@app.route('/analytics/<name>')
def analytics_page(name):
    return render_template('analytics.html', student_name=name)


# --- API Endpoints ---
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

    # Compare against known faces
    results = face_recognition.compare_faces(known_encodings, unknown_encodings[0], tolerance=0.6)
    face_distances = face_recognition.face_distance(known_encodings, unknown_encodings[0])
    
    if any(results):
        best_match_index = np.argmin(face_distances)
        if results[best_match_index]:
            name = known_names[best_match_index]
            log_attendance(name) # Log the attendance
            return jsonify({'name': name})

    return jsonify({'name': 'Unknown'})

# NEW: API endpoint to get analytics data
@app.route('/api/analytics/<name>', methods=['GET'])
def get_analytics_data(name):
    if not os.path.exists(ATTENDANCE_FILE):
        return jsonify({'error': 'No attendance data found'}), 404
    
    try:
        df = pd.read_csv(ATTENDANCE_FILE)
        student_df = df[df['name'] == name]

        if student_df.empty:
            return jsonify({'total_days': 0, 'records': []})

        total_days = student_df['date'].nunique()
        records = student_df[['date', 'timestamp']].to_dict('records')
        
        # Sort records by date for the chart
        records.sort(key=lambda x: x['date'])

        return jsonify({'total_days': total_days, 'records': records})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# (Admin endpoints: /students, /add_student, etc. remain the same)
@app.route('/students', methods=['GET'])
@login_required
def get_students():
    return jsonify({'students': known_names})

@app.route('/add_student', methods=['POST'])
def add_student():
    """Add a new student."""
    name = request.form.get('name')
    file = request.files.get('file')

    if not name or not file:
        return jsonify({'error': 'Name and file are required'}), 400
    
    filename = f"{name.replace(' ', '_')}.jpg"
    filepath = os.path.join(KNOWN_FACES_DIR, filename)
    file.save(filepath)

    # Reload faces to include the new one
    load_known_faces()
    return jsonify({'success': f"Student '{name}' added successfully."})


@app.route('/delete_student', methods=['POST'])
def delete_student():
    """Delete a student."""
    data = request.get_json()
    name = data.get('name')
    if not name:
        return jsonify({'error': 'Name is required'}), 400

    filename = f"{name.replace(' ', '_')}.jpg"
    filepath = os.path.join(KNOWN_FACES_DIR, filename)

    if os.path.exists(filepath):
        os.remove(filepath)
        load_known_faces() # Reload faces
        return jsonify({'success': f"Student '{name}' deleted."})
    else:
        return jsonify({'error': 'Student not found'}), 404
        
@app.route('/rename_student', methods=['POST'])
def rename_student():
    """Rename a student."""
    data = request.get_json()
    old_name = data.get('old_name')
    new_name = data.get('new_name')

    if not old_name or not new_name:
        return jsonify({'error': 'Old and new names are required'}), 400

    old_filename = f"{old_name.replace(' ', '_')}.jpg"
    new_filename = f"{new_name.replace(' ', '_')}.jpg"
    old_filepath = os.path.join(KNOWN_FACES_DIR, old_filename)
    new_filepath = os.path.join(KNOWN_FACES_DIR, new_filename)

    if os.path.exists(old_filepath):
        os.rename(old_filepath, new_filepath)
        load_known_faces() # Reload faces
        return jsonify({'success': f"Renamed '{old_name}' to '{new_name}'."})
    else:
        return jsonify({'error': 'Student not found'}), 404


if __name__ == '__main__':
    load_known_faces()
    app.run(debug=True, host='0.0.0.0')