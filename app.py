from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_cors import CORS
import os
import time
import logging
import asyncio
from werkzeug.utils import secure_filename
from concurrent.futures import ThreadPoolExecutor
import threading
from utils.text_analyzer import TextAnalyzer
import shutil
from functools import wraps

# Setup logging FIRST
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)
app.secret_key = os.environ.get('SECRET_KEY', 'fallback-dev-key-12345-change-in-production')

# Configuration
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB max file size
# Use /tmp for uploads on production servers (Render, Heroku, etc.)
app.config['UPLOAD_FOLDER'] = os.environ.get('UPLOAD_FOLDER', '/tmp/temp_uploads' if os.path.exists('/tmp') else 'temp_uploads')
app.config['ALLOWED_EXTENSIONS'] = {'txt', 'docx', 'pdf', 'rtf', 'odt', 'md',
                                     'pptx', 'xlsx','doc', 'xls', 'ppt', 'csv'}

# Ensure upload folder exists
try:
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    logger.info(f"Upload folder created/verified at: {app.config['UPLOAD_FOLDER']}")
except Exception as e:
    logger.error(f"Failed to create upload folder: {str(e)}")

# Thread pool for async processing
executor = ThreadPoolExecutor(max_workers=4)

# Progress tracking
progress_tracker = {}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def cleanup_file(filepath):
    """Delete uploaded file after processing"""
    try:
        time.sleep(5)  # Wait 5 seconds after processing
        if os.path.exists(filepath):
            os.remove(filepath)
            logger.info(f"Successfully deleted file: {filepath}")
    except Exception as e:
        logger.error(f"Error deleting file {filepath}: {str(e)}")

# Login decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'logged_in' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')

        # Accept any credentials - no validation
        if username and password:
            session['logged_in'] = True
            session['username'] = username
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'error': 'Please enter both username and password'})

    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/')
@login_required
def index():
    return render_template('home.html')

@app.route('/analyze-page')
@login_required
def analyze_page():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        logger.info("Starting analysis request...")
        analysis_results = []
        filepaths = []

        # Check if it's a direct text input
        if request.is_json:
            text_data = request.get_json()
            text = text_data.get('text', '')

            if not text:
                logger.warning("No text provided in request")
                return jsonify({'error': 'No text provided'}), 400

            # Create a temporary file for the text
            filename = 'direct_input.txt'
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            logger.info(f"Creating temp file at: {filepath}")

            try:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(text)
                filepaths.append(filepath)
                logger.info("Temp file created successfully")
            except Exception as file_error:
                logger.error(f"Failed to create temp file: {str(file_error)}")
                return jsonify({'error': f'File system error: {str(file_error)}'}), 500
            
        else:
            # Handle file uploads
            if 'files' not in request.files:
                return jsonify({'error': 'No files provided'}), 400
            
            files = request.files.getlist('files')
            
            if len(files) > 3:
                return jsonify({'error': 'Maximum 3 files allowed'}), 400
            
            for file in files:
                if file and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                    file.save(filepath)
                    filepaths.append(filepath)
        
        if not filepaths:
            return jsonify({'error': 'No valid files provided'}), 400
        
        # Initialize analyzer
        logger.info("Initializing TextAnalyzer...")
        try:
            analyzer = TextAnalyzer()
            logger.info("TextAnalyzer initialized successfully")
        except Exception as init_error:
            logger.error(f"Failed to initialize TextAnalyzer: {str(init_error)}")
            return jsonify({'error': f'Initialization error: {str(init_error)}'}), 500

        # Process each file
        for filepath in filepaths:
            session_id = os.path.basename(filepath)
            progress_tracker[session_id] = 0

            logger.info(f"Analyzing file: {filepath}")
            try:
                # Run analysis
                result = analyzer.analyze_file(filepath, session_id, progress_tracker)
                analysis_results.append(result)
                logger.info(f"Analysis completed for: {filepath}")
            except Exception as analysis_error:
                logger.error(f"Analysis failed for {filepath}: {str(analysis_error)}")
                return jsonify({'error': f'Analysis error: {str(analysis_error)}'}), 500

            # Schedule file cleanup
            threading.Thread(target=cleanup_file, args=(filepath,)).start()

        logger.info("All analyses completed successfully")
        return jsonify({
            'success': True,
            'results': analysis_results
        })

    except Exception as e:
        logger.error(f"Unexpected error in analyze route: {str(e)}", exc_info=True)
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/progress/<session_id>')
def get_progress(session_id):
    progress = progress_tracker.get(session_id, 0)
    return jsonify({'progress': progress})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)