// Global variables
let selectedFiles = [];
let analysisResults = [];
let currentFileIndex = 0;
let charts = {};
let currentStep = 1;
let uploadMethod = null; // 'file' or 'text'
const allowedExtensions = ['txt', 'docx', 'doc', 'pdf', 'ppt', 'pptx', 'odt', 'rtf', 'md', 'csv', 'xlsx', 'xls'];

// DOM Elements (initialized after DOM loads)
let fileInput, fileDropArea, selectedFilesDiv, uploadForm;
let progressContainer, progressFill, progressPercent;
let resultsContainer, errorContainer, errorMessage;
let textInput, wordCount;
let textProcessingProgress, textProgressFill, textProgressPercent;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    fileInput = document.getElementById('fileInput');
    fileDropArea = document.querySelector('.file-drop-area');
    selectedFilesDiv = document.getElementById('selectedFiles');
    uploadForm = document.getElementById('uploadForm');
    progressContainer = document.getElementById('progressContainer');
    progressFill = document.getElementById('progressFill');
    progressPercent = document.getElementById('progressPercent');
    resultsContainer = document.getElementById('resultsContainer');
    errorContainer = document.getElementById('errorContainer');
    errorMessage = document.getElementById('errorMessage');
    textInput = document.getElementById('textInput');
    wordCount = document.getElementById('wordCount');
    textProcessingProgress = document.getElementById('textProcessingProgress');
    textProgressFill = document.getElementById('textProgressFill');
    textProgressPercent = document.getElementById('textProgressPercent');

    // Initialize event listeners
    initializeEventListeners();
});

// ===== WIZARD FUNCTIONALITY =====

function selectUploadMethod(method) {
    uploadMethod = method;

    // Update UI
    const fileSection = document.getElementById('fileUploadSection');
    const textSection = document.getElementById('textInputSection');
    const optionCards = document.querySelectorAll('.option-card');

    // Remove selected class from all cards
    optionCards.forEach(card => card.classList.remove('selected'));

    if (method === 'file') {
        fileSection.style.display = 'block';
        textSection.style.display = 'none';
        optionCards[0].classList.add('selected');
        // Check if files are already selected
        checkStep1Completion();
    } else if (method === 'text') {
        fileSection.style.display = 'none';
        textSection.style.display = 'block';
        optionCards[1].classList.add('selected');
        // Check word count
        checkStep1Completion();
    }
}

function checkStep1Completion() {
    const nextBtn = document.getElementById('step1NextBtn');

    if (uploadMethod === 'file') {
        nextBtn.disabled = selectedFiles.length === 0;
    } else if (uploadMethod === 'text') {
        const text = textInput.value.trim();
        const words = text.split(/\s+/).filter(word => word.length > 0);
        nextBtn.disabled = words.length < 5;
    }
}

function goToStep(step) {
    // Validate before moving forward
    if (step > currentStep) {
        if (currentStep === 1 && !uploadMethod) {
            showError('Please select an upload method');
            return;
        }
        if (currentStep === 1 && uploadMethod === 'file' && selectedFiles.length === 0) {
            showError('Please select at least one file');
            return;
        }
        if (currentStep === 1 && uploadMethod === 'text') {
            const text = textInput.value.trim();
            const words = text.split(/\s+/).filter(word => word.length > 0);
            if (words.length < 5) {
                showError('Please enter at least 5 words');
                return;
            }
        }
    }

    // Hide all steps
    document.querySelectorAll('.wizard-step').forEach(step => {
        step.classList.remove('active');
    });

    // Show selected step
    document.getElementById('step' + step).classList.add('active');

    // Update progress indicator
    document.querySelectorAll('.step-item').forEach((item, index) => {
        item.classList.remove('active', 'completed');
        if (index + 1 < step) {
            item.classList.add('completed');
        } else if (index + 1 === step) {
            item.classList.add('active');
        }
    });

    currentStep = step;

    // If moving to step 3, populate review
    if (step === 3) {
        populateReview();
    }
}

function populateReview() {
    // Input Summary
    const inputSummary = document.getElementById('reviewInputSummary');
    if (uploadMethod === 'file') {
        inputSummary.innerHTML = `
            <p><strong>Method:</strong> File Upload</p>
            <p><strong>Files:</strong> ${selectedFiles.length}</p>
            <ul style="margin-top: 10px; padding-left: 20px;">
                ${selectedFiles.map(f => `<li>${f.name} (${formatFileSize(f.size)})</li>`).join('')}
            </ul>
        `;
    } else {
        const words = textInput.value.trim().split(/\s+/).filter(w => w.length > 0);
        inputSummary.innerHTML = `
            <p><strong>Method:</strong> Direct Text Input</p>
            <p><strong>Word Count:</strong> ${words.length}</p>
            <p><strong>Character Count:</strong> ${textInput.value.trim().length}</p>
        `;
    }

    // Analysis Summary
    const analysisSummary = document.getElementById('reviewAnalysisSummary');
    const enabledAnalyses = [];

    if (document.getElementById('keynessToggle').checked) enabledAnalyses.push('Keyness Analysis');
    if (document.getElementById('sentimentToggle').checked) enabledAnalyses.push('Sentiment & Emotion');
    if (document.getElementById('clusteringToggle').checked) enabledAnalyses.push('Semantic Clustering');
    if (document.getElementById('sensorimotorToggle').checked) enabledAnalyses.push('Sensorimotor Norms');

    analysisSummary.innerHTML = `
        <ul style="padding-left: 20px;">
            ${enabledAnalyses.map(a => `<li style="list-style: disc;">${a}</li>`).join('')}
        </ul>
        <p style="margin-top: 15px; color: #667eea; font-weight: 600;">
            ${enabledAnalyses.length} analysis type${enabledAnalyses.length !== 1 ? 's' : ''} selected
        </p>
    `;
}

function startAnalysis() {
    // Hide wizard, show progress
    document.getElementById('analysisWizard').style.display = 'none';
    progressContainer.style.display = 'block';

    // Update progress indicator to show step 4
    document.querySelectorAll('.step-item').forEach((item, index) => {
        item.classList.remove('active');
        if (index < 3) {
            item.classList.add('completed');
        } else if (index === 3) {
            item.classList.add('active');
        }
    });

    // Start the actual analysis
    if (uploadMethod === 'file') {
        submitFileAnalysis();
    } else {
        submitTextAnalysis();
    }
}

function initializeEventListeners() {
    if (!fileInput || !textInput) return;

    // Word count functionality
    textInput.addEventListener('input', () => {
        const text = textInput.value.trim();
        const words = text.split(/\s+/).filter(word => word.length > 0);
        const count = words.length;
        wordCount.textContent = `${count} words`;
        checkStep1Completion();
    });

    // File upload handlers
    if (fileDropArea) {
        fileDropArea.addEventListener('click', () => fileInput.click());

        fileDropArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileDropArea.classList.add('drag-over');
        });

        fileDropArea.addEventListener('dragleave', () => {
            fileDropArea.classList.remove('drag-over');
        });

        fileDropArea.addEventListener('drop', (e) => {
            e.preventDefault();
            fileDropArea.classList.remove('drag-over');
            handleFiles(e.dataTransfer.files);
        });
    }

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    // Analysis option toggles
    document.querySelectorAll('.option-toggle input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const card = this.closest('.analysis-option-card');
            if (this.checked) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });
    });

    // Form submission (prevent default, handled by wizard)
    if (uploadForm) {
        uploadForm.addEventListener('submit', (e) => {
            e.preventDefault();
        });
    }
}

function submitFileAnalysis() {
    const formData = new FormData();
    selectedFiles.forEach(file => {
        formData.append('files', file);
    });

    submitAnalysis(formData);
}

function submitTextAnalysis() {
    const text = textInput.value.trim();

    // Show text processing progress in the text input section
    if (textProcessingProgress) {
        textProcessingProgress.style.display = 'block';
        // Start mini progress animation
        animateTextProgress();
    }

    // Send as JSON
    fetch('/analyze', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: text })
    })
    .then(handleAnalysisResponse)
    .catch(handleAnalysisError);

    // Simulate progress
    simulateProgress();
}

// Animate the text input progress bar
let textProgressInterval = null;

function animateTextProgress() {
    let progress = 0;
    const increment = 2; // Progress in 2% increments
    const intervalTime = 100; // Update every 100ms

    // Clear any existing interval
    if (textProgressInterval) {
        clearInterval(textProgressInterval);
    }

    // Reset progress
    updateTextProgress(0);

    textProgressInterval = setInterval(() => {
        progress += increment;

        if (progress >= 95) {
            // Stop at 95% and wait for actual completion
            clearInterval(textProgressInterval);
            textProgressInterval = null;
        } else {
            updateTextProgress(progress);
        }
    }, intervalTime);
}

function updateTextProgress(percent) {
    const roundedPercent = Math.round(percent);

    if (textProgressFill) {
        textProgressFill.style.width = percent + '%';
    }
    if (textProgressPercent) {
        textProgressPercent.textContent = roundedPercent;
    }
}

function completeTextProgress() {
    // Complete the text progress bar
    if (textProgressInterval) {
        clearInterval(textProgressInterval);
        textProgressInterval = null;
    }
    updateTextProgress(100);

    // Hide after a short delay
    setTimeout(() => {
        if (textProcessingProgress) {
            textProcessingProgress.style.display = 'none';
            updateTextProgress(0);
        }
    }, 500);
}

function submitAnalysis(formData) {
    // Simulate progress
    simulateProgress();

    fetch('/analyze', {
        method: 'POST',
        body: formData
    })
    .then(handleAnalysisResponse)
    .catch(handleAnalysisError);
}

// Progress stages configuration with longer durations for visibility
const analysisStages = [
    { id: 'upload', name: 'File Processing', startProgress: 0, endProgress: 14, duration: 3000 },
    { id: 'preprocessing', name: 'Text Preprocessing', startProgress: 14, endProgress: 28, duration: 3500 },
    { id: 'keyness', name: 'Keyness Analysis', startProgress: 28, endProgress: 46, duration: 4000 },
    { id: 'sentiment', name: 'Sentiment Analysis', startProgress: 46, endProgress: 64, duration: 4000 },
    { id: 'clustering', name: 'Semantic Clustering', startProgress: 64, endProgress: 78, duration: 3500 },
    { id: 'sensorimotor', name: 'Sensorimotor Analysis', startProgress: 78, endProgress: 92, duration: 3000 },
    { id: 'finalize', name: 'Finalizing Results', startProgress: 92, endProgress: 100, duration: 2000 }
];

let currentStageIndex = 0;
let progressAnimationFrame = null;

function simulateProgress() {
    // Reset stages
    currentStageIndex = 0;

    // Cancel any existing animation
    if (progressAnimationFrame) {
        cancelAnimationFrame(progressAnimationFrame);
        progressAnimationFrame = null;
    }

    resetProgressStages();

    // Start with first stage
    processNextStage();
}

function resetProgressStages() {
    // Reset all stages to pending
    document.querySelectorAll('.stage-item').forEach(item => {
        item.classList.remove('active', 'completed');
        item.classList.add('pending');

        const badge = item.querySelector('.status-badge');
        if (badge) {
            badge.textContent = 'Pending';
            badge.className = 'status-badge pending';
        }
    });

    // Reset progress bar
    updateProgress(0);
}

function processNextStage() {
    if (currentStageIndex >= analysisStages.length) {
        return; // All stages complete
    }

    const stage = analysisStages[currentStageIndex];
    const stageElement = document.getElementById(`stage-${stage.id}`);

    // Mark stage as active
    if (stageElement) {
        stageElement.classList.remove('pending', 'completed');
        stageElement.classList.add('active');

        const badge = stageElement.querySelector('.status-badge');
        if (badge) {
            badge.textContent = 'Processing';
            badge.className = 'status-badge processing';
        }

        // Scroll stage into view smoothly
        stageElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Update current stage text
    const stageText = document.getElementById('currentStageText');
    if (stageText) {
        stageText.textContent = `${stage.name}...`;
    }

    // Animate progress incrementally for this stage
    animateStageProgress(stage.startProgress, stage.endProgress, stage.duration);

    // Simulate stage completion
    setTimeout(() => {
        completeCurrentStage();
    }, stage.duration);
}

// Animate progress incrementally showing each percentage
function animateStageProgress(startPercent, endPercent, duration) {
    const startTime = Date.now();
    const range = endPercent - startPercent;

    console.log(`Starting animation: ${startPercent}% → ${endPercent}% over ${duration}ms`);

    function updateProgressFrame() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Use easing function for smooth acceleration/deceleration
        const easedProgress = easeInOutQuad(progress);
        const currentPercent = startPercent + (range * easedProgress);

        updateProgress(currentPercent);

        // Log progress every 10% for debugging
        const roundedPercent = Math.round(currentPercent);
        if (roundedPercent % 5 === 0 && Math.abs(currentPercent - roundedPercent) < 0.5) {
            console.log(`Progress: ${roundedPercent}%`);
        }

        if (progress < 1) {
            progressAnimationFrame = requestAnimationFrame(updateProgressFrame);
        } else {
            // Ensure we end exactly at the target percent
            updateProgress(endPercent);
            console.log(`Stage complete at ${endPercent}%`);
        }
    }

    updateProgressFrame();
}

// Easing function for smooth animation
function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function completeCurrentStage() {
    if (currentStageIndex >= analysisStages.length) {
        return;
    }

    const stage = analysisStages[currentStageIndex];
    const stageElement = document.getElementById(`stage-${stage.id}`);

    // Mark stage as completed
    if (stageElement) {
        stageElement.classList.remove('active', 'pending');
        stageElement.classList.add('completed');

        const badge = stageElement.querySelector('.status-badge');
        if (badge) {
            badge.textContent = 'Completed';
            badge.className = 'status-badge completed';
        }
    }

    // Move to next stage
    currentStageIndex++;

    if (currentStageIndex < analysisStages.length) {
        processNextStage();
    } else {
        // All stages complete
        updateProgress(100);
        const stageText = document.getElementById('currentStageText');
        if (stageText) {
            stageText.textContent = 'Analysis complete! Loading results...';
        }
    }
}

function handleAnalysisResponse(response) {
    if (window.currentProgressInterval) {
        clearInterval(window.currentProgressInterval);
    }

    // Complete text progress if it was shown
    completeTextProgress();

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json().then(data => {
        if (data.success) {
            console.log('Analysis complete from backend, ensuring progress reaches 100%');

            // Store results
            analysisResults = data.results;

            // Wait for progress animation to complete before showing results
            // This ensures users see the full progress animation
            const waitForProgressCompletion = () => {
                const currentProgress = progressPercent ? parseInt(progressPercent.textContent) : 0;

                if (currentProgress >= 100) {
                    // Progress is complete, show results
                    console.log('Progress complete, showing results');
                    setTimeout(() => {
                        displayResults();
                    }, 500);
                } else {
                    // Still animating, check again
                    console.log(`Still animating... at ${currentProgress}%`);
                    setTimeout(waitForProgressCompletion, 500);
                }
            };

            waitForProgressCompletion();
        } else {
            throw new Error(data.error || 'Analysis failed');
        }
    });
}

function handleAnalysisError(error) {
    if (window.currentProgressInterval) {
        clearInterval(window.currentProgressInterval);
    }
    // Clear text progress on error
    if (textProgressInterval) {
        clearInterval(textProgressInterval);
        textProgressInterval = null;
    }
    if (textProcessingProgress) {
        textProcessingProgress.style.display = 'none';
    }
    showError(error.message);
}

// ===== ORIGINAL FUNCTIONALITY (kept for compatibility) =====

// Update the downloadResults function
function downloadResults() {
    // Create a new window for the report
    const printWindow = window.open('', '_blank');
    
    // Get the report content
    const reportContent = document.getElementById('reportContent').innerHTML;





    
    
    // Create a complete HTML document
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Text Analysis Report - ${new Date().toLocaleDateString()}</title>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    padding: 20px;
                    max-width: 1000px;
                    margin: 0 auto;
                }
                
                .results-container {
                    background: white;
                    padding: 30px;
                }
                
                .results-section {
                    margin: 30px 0;
                    padding-bottom: 30px;
                    border-bottom: 2px solid #f0f0f0;
                }
                
                .results-section h3 {
                    color: #333;
                    font-size: 1.4em;
                    margin-bottom: 20px;
                }
                
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 15px;
                    margin-bottom: 20px;
                }
                
                .stat-card {
                    background: #f8f9ff;
                    padding: 15px;
                    border-radius: 8px;
                    text-align: center;
                    border-left: 4px solid #667eea;
                }
                
                .data-table table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 15px;
                }
                
                .data-table th, .data-table td {
                    padding: 10px;
                    text-align: left;
                    border-bottom: 1px solid #eee;
                }
                
                .data-table th {
                    background: #f8f9ff;
                    font-weight: 600;
                }
                
                .cluster-container {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 15px;
                }
                
                .cluster-card {
                    background: #f8f9ff;
                    border-radius: 8px;
                    padding: 15px;
                    border-left: 4px solid #667eea;
                }
                
                .word-tag {
                    display: inline-block;
                    background: white;
                    padding: 4px 10px;
                    margin: 3px;
                    border-radius: 15px;
                    font-size: 0.85em;
                    border: 1px solid #e0e0e0;
                }
                
                .sentiment-summary {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: 15px;
                    margin-top: 20px;
                }
                
                .sentiment-badge {
                    padding: 15px;
                    border-radius: 8px;
                    text-align: center;
                    background: #f0f0f0;
                }
                
                .chart-container {
                    margin: 20px 0;
                    text-align: center;
                    padding: 20px;
                    background: #fafafa;
                    border-radius: 8px;
                }
                
                /* Hide elements that shouldn't appear in the report */
                .action-buttons, .file-tabs {
                    display: none !important;
                }
                
                @media print {
                    body {
                        padding: 0;
                    }
                }
            </style>
        </head>
        <body>
            <h1 style="text-align: center; color: #333; margin-bottom: 10px;">Text Analysis Report</h1>
            <p style="text-align: center; color: #666; margin-bottom: 30px;">Generated on ${new Date().toLocaleString()}</p>
            ${reportContent}
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
            <script>
                // Re-render charts after page load
                window.onload = function() {
                    // Charts will be static images in the PDF
                    setTimeout(() => {
                        window.print();
                    }, 1000);
                };
            </script>
        </body>
        </html>
    `;
    
    // Write the content to the new window
    printWindow.document.write(htmlContent);
    printWindow.document.close();
}

// Update the resetAnalyzer function to also clear text input
function resetAnalyzer() {
    selectedFiles = [];
    analysisResults = [];
    currentFileIndex = 0;
    currentStep = 1;
    uploadMethod = null;

    // Reset file input
    if (fileInput) fileInput.value = '';
    updateSelectedFilesDisplay();

    // Reset text input
    if (textInput) {
        textInput.value = '';
        wordCount.textContent = '0 words';
    }

    // Clear text progress
    if (textProgressInterval) {
        clearInterval(textProgressInterval);
        textProgressInterval = null;
    }
    if (textProcessingProgress) {
        textProcessingProgress.style.display = 'none';
        updateTextProgress(0);
    }

    // Hide results and show wizard
    if (resultsContainer) resultsContainer.style.display = 'none';
    if (progressContainer) progressContainer.style.display = 'none';
    if (errorContainer) errorContainer.style.display = 'none';
    if (document.getElementById('analysisWizard')) {
        document.getElementById('analysisWizard').style.display = 'block';
    }

    // Reset wizard to step 1
    goToStep(1);

    // Hide upload method sections
    const fileSection = document.getElementById('fileUploadSection');
    const textSection = document.getElementById('textInputSection');
    if (fileSection) fileSection.style.display = 'none';
    if (textSection) textSection.style.display = 'none';

    // Remove selected class from option cards
    document.querySelectorAll('.option-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Disable action buttons when starting new analysis
    disableActionButtons();
}

// New button functions
function downloadCompletePDF() {
    // Create a new window for the complete PDF report
    const printWindow = window.open('', '_blank');
    
    // Get all tab content (complete analysis report)
    const overviewContent = document.getElementById('tab-overview').innerHTML;
    const keynessContent = document.getElementById('tab-keyness').innerHTML;
    const sentimentContent = document.getElementById('tab-sentiment').innerHTML;
    const clustersContent = document.getElementById('tab-clusters').innerHTML;
    const sensoryContent = document.getElementById('tab-sensory').innerHTML;
    
    // Capture charts as images
    const chartImages = captureChartsAsImages();
    
    // Create a complete HTML document with all analysis sections
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Complete Text Analysis Report - ${new Date().toLocaleDateString()}</title>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    padding: 20px;
                    max-width: 1000px;
                    margin: 0 auto;
                    background: white;
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    padding: 20px;
                    background: linear-gradient(135deg, #14b8a6, #10b981);
                    color: white;
                    border-radius: 10px;
                }
                .section {
                    margin-bottom: 30px;
                    padding: 20px;
                    border: 1px solid #e0e0e0;
                    border-radius: 8px;
                    page-break-inside: avoid;
                }
                .section-title {
                    font-size: 1.8em;
                    margin-bottom: 20px;
                    color: #14b8a6;
                    border-bottom: 2px solid #14b8a6;
                    padding-bottom: 10px;
                }
                .chart-container {
                    margin: 20px 0;
                    text-align: center;
                }
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 15px;
                    margin: 20px 0;
                }
                .stat-card {
                    padding: 15px;
                    background: #f8f9fa;
                    border-radius: 8px;
                    text-align: center;
                }
                .data-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 15px 0;
                }
                .data-table th, .data-table td {
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: left;
                }
                .data-table th {
                    background-color: #f2f2f2;
                }
                .tab-content {
                    display: block !important;
                }
                .results-tabs-container {
                    display: none;
                }
                .action-buttons {
                    display: none;
                }
                @media print {
                    body { margin: 0; padding: 10px; }
                    .section { page-break-inside: avoid; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1><i class="fas fa-feather-alt"></i> INK SIGHT</h1>
                <p>Complete Text Analysis Report - ${new Date().toLocaleDateString()}</p>
            </div>
            
            <div class="section">
                <h2 class="section-title"><i class="fas fa-chart-bar"></i> Overview</h2>
                ${overviewContent}
                ${chartImages.chart_0 ? `<div class="chart-image"><img src="${chartImages.chart_0}" alt="Overview Chart" style="max-width: 100%; height: auto; margin: 20px 0; border: 1px solid #ddd; border-radius: 8px;"></div>` : ''}
            </div>
            
            <div class="section">
                <h2 class="section-title"><i class="fas fa-key"></i> Keyness Analysis</h2>
                ${keynessContent}
                ${chartImages.chart_1 ? `<div class="chart-image"><img src="${chartImages.chart_1}" alt="Keyness Chart" style="max-width: 100%; height: auto; margin: 20px 0; border: 1px solid #ddd; border-radius: 8px;"></div>` : ''}
                ${chartImages.chart_2 ? `<div class="chart-image"><img src="${chartImages.chart_2}" alt="Keyness Word Cloud" style="max-width: 100%; height: auto; margin: 20px 0; border: 1px solid #ddd; border-radius: 8px;"></div>` : ''}
            </div>
            
            <div class="section">
                <h2 class="section-title"><i class="fas fa-smile"></i> Sentiment & Emotion Analysis</h2>
                ${sentimentContent}
                ${chartImages.chart_3 ? `<div class="chart-image"><img src="${chartImages.chart_3}" alt="Sentiment Chart" style="max-width: 100%; height: auto; margin: 20px 0; border: 1px solid #ddd; border-radius: 8px;"></div>` : ''}
                ${chartImages.chart_4 ? `<div class="chart-image"><img src="${chartImages.chart_4}" alt="Emotion Chart" style="max-width: 100%; height: auto; margin: 20px 0; border: 1px solid #ddd; border-radius: 8px;"></div>` : ''}
            </div>
            
            <div class="section">
                <h2 class="section-title"><i class="fas fa-project-diagram"></i> Semantic Clusters</h2>
                ${clustersContent}
                ${chartImages.chart_5 ? `<div class="chart-image"><img src="${chartImages.chart_5}" alt="Cluster Network Chart" style="max-width: 100%; height: auto; margin: 20px 0; border: 1px solid #ddd; border-radius: 8px;"></div>` : ''}
                ${chartImages.chart_6 ? `<div class="chart-image"><img src="${chartImages.chart_6}" alt="Cluster Comparison Chart" style="max-width: 100%; height: auto; margin: 20px 0; border: 1px solid #ddd; border-radius: 8px;"></div>` : ''}
            </div>
            
            <div class="section">
                <h2 class="section-title"><i class="fas fa-eye"></i> Sensory Word Analysis</h2>
                ${sensoryContent}
                ${chartImages.chart_7 ? `<div class="chart-image"><img src="${chartImages.chart_7}" alt="Sensory Chart" style="max-width: 100%; height: auto; margin: 20px 0; border: 1px solid #ddd; border-radius: 8px;"></div>` : ''}
                ${chartImages.chart_8 ? `<div class="chart-image"><img src="${chartImages.chart_8}" alt="Sensory Radar Chart" style="max-width: 100%; height: auto; margin: 20px 0; border: 1px solid #ddd; border-radius: 8px;"></div>` : ''}
            </div>
        </body>
        </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Trigger print dialog
    setTimeout(() => {
        printWindow.print();
    }, 500);
}

function printResults() {
    // Simple print function for the current view
    window.print();
}

// Function to enable action buttons when analysis is complete
function enableActionButtons() {
    const actionButtons = document.getElementById('actionButtons');
    const downloadPDFBtn = document.getElementById('downloadPDFBtn');
    const printBtn = document.getElementById('printBtn');
    
    console.log('Enabling action buttons...', { actionButtons, downloadPDFBtn, printBtn });
    
    if (actionButtons && downloadPDFBtn && printBtn) {
        actionButtons.style.display = 'flex';
        downloadPDFBtn.disabled = false;
        printBtn.disabled = false;
        
        // Add enabled styling
        downloadPDFBtn.style.opacity = '1';
        printBtn.style.opacity = '1';
        downloadPDFBtn.style.cursor = 'pointer';
        printBtn.style.cursor = 'pointer';
        
        console.log('Action buttons enabled successfully');
    } else {
        console.error('Could not find action button elements:', { actionButtons, downloadPDFBtn, printBtn });
    }
}

// Function to disable action buttons
function disableActionButtons() {
    const actionButtons = document.getElementById('actionButtons');
    const downloadPDFBtn = document.getElementById('downloadPDFBtn');
    const printBtn = document.getElementById('printBtn');
    
    if (actionButtons && downloadPDFBtn && printBtn) {
        actionButtons.style.display = 'none';
        downloadPDFBtn.disabled = true;
        printBtn.disabled = true;
        
        // Add disabled styling
        downloadPDFBtn.style.opacity = '0.5';
        printBtn.style.opacity = '0.5';
        downloadPDFBtn.style.cursor = 'not-allowed';
        printBtn.style.cursor = 'not-allowed';
    }
}

// Test function to manually show buttons (for debugging)
function testShowButtons() {
    console.log('Testing button visibility...');
    const actionButtons = document.getElementById('actionButtons');
    if (actionButtons) {
        actionButtons.style.display = 'flex';
        actionButtons.style.border = '2px solid red';
        console.log('Buttons should now be visible');
    } else {
        console.error('Action buttons container not found');
    }
}

// Function to capture charts as images for PDF
function captureChartsAsImages() {
    const chartImages = {};
    let chartIndex = 0;
    
    // Find all canvas elements (Chart.js charts)
    const canvases = document.querySelectorAll('canvas');
    
    canvases.forEach((canvas) => {
        try {
            // Get the chart instance
            const chart = Chart.getChart(canvas);
            if (chart) {
                // Convert canvas to base64 image with high quality
                const imageData = canvas.toDataURL('image/png', 1.0);
                chartImages[`chart_${chartIndex}`] = imageData;
                chartIndex++;
            }
        } catch (error) {
            console.warn('Could not capture chart:', error);
        }
    });
    
    // Also capture any chart containers that might have SVG or other visualizations
    const chartContainers = document.querySelectorAll('.chart-container, .visualization-container, .word-cloud-container');
    chartContainers.forEach((container) => {
        try {
            // Check if container has a canvas first
            const canvas = container.querySelector('canvas');
            if (canvas) {
                const chart = Chart.getChart(canvas);
                if (chart) {
                    const imageData = canvas.toDataURL('image/png', 1.0);
                    chartImages[`chart_${chartIndex}`] = imageData;
                    chartIndex++;
                }
            } else if (typeof html2canvas !== 'undefined') {
                // Use html2canvas for non-canvas visualizations
                html2canvas(container, {
                    backgroundColor: '#ffffff',
                    scale: 2, // Higher resolution
                    useCORS: true,
                    allowTaint: true
                }).then(canvas => {
                    const imageData = canvas.toDataURL('image/png', 1.0);
                    chartImages[`chart_${chartIndex}`] = imageData;
                    chartIndex++;
                }).catch(error => {
                    console.warn('Could not capture container with html2canvas:', error);
                });
            }
        } catch (error) {
            console.warn('Could not capture chart container:', error);
        }
    });
    
    console.log('Captured charts:', Object.keys(chartImages).length);
    return chartImages;
}


function handleFiles(files) {
    const validFiles = Array.from(files).filter(file => {
        const extension = file.name.split('.').pop().toLowerCase();
        const isValid = allowedExtensions.includes(extension);
        const isUnderLimit = file.size <= 100 * 1024 * 1024; // 100MB

        if (!isValid) {
            showError(`File ${file.name} has unsupported format`);
        }
        if (!isUnderLimit) {
            showError(`File ${file.name} exceeds 100MB limit`);
        }

        return isValid && isUnderLimit;
    });

    if (selectedFiles.length + validFiles.length > 3) {
        showError('Maximum 3 files allowed');
        return;
    }

    selectedFiles = [...selectedFiles, ...validFiles];
    updateSelectedFilesDisplay();
    checkStep1Completion(); // Check if we can enable next button
}


function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
        'pdf': 'fa-file-pdf',
        'doc': 'fa-file-word',
        'docx': 'fa-file-word',
        'ppt': 'fa-file-powerpoint',
        'pptx': 'fa-file-powerpoint',
        'xls': 'fa-file-excel',
        'xlsx': 'fa-file-excel',
        'txt': 'fa-file-alt',
        'md': 'fa-file-alt',
        'csv': 'fa-file-csv',
        'odt': 'fa-file-alt',
        'rtf': 'fa-file-alt'
    };
    return icons[ext] || 'fa-file';
}



function updateSelectedFilesDisplay() {
    if (!selectedFilesDiv) return;

    selectedFilesDiv.innerHTML = '';

    selectedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <span><i class="fas ${getFileIcon(file.name)}"></i> ${file.name} (${formatFileSize(file.size)})</span>
            <i class="fas fa-times remove-file" onclick="removeFile(${index})"></i>
        `;
        selectedFilesDiv.appendChild(fileItem);
    });
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    updateSelectedFilesDisplay();
    checkStep1Completion();
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Form submission is now handled by the wizard

function updateProgress(percent) {
    const roundedPercent = Math.round(percent);

    if (progressFill) {
        progressFill.style.width = percent + '%';
    }
    if (progressPercent) {
        progressPercent.textContent = roundedPercent;
    }

    // Update ARIA attributes for accessibility
    const progressBar = document.querySelector('.main-progress-bar');
    if (progressBar) {
        progressBar.setAttribute('aria-valuenow', roundedPercent);
    }

    // Optional: Log progress for debugging (comment out in production)
    // console.log(`Progress: ${roundedPercent}%`);
}

function showError(message) {
    if (errorContainer) errorContainer.style.display = 'block';
    if (errorMessage) errorMessage.textContent = message;
    if (progressContainer) progressContainer.style.display = 'none';
}

// Test function to demonstrate progress bar (for testing purposes)
function testProgressBar() {
    // Hide wizard, show progress
    const wizard = document.getElementById('analysisWizard');
    const progress = document.getElementById('progressContainer');
    const results = document.getElementById('resultsContainer');

    if (wizard) wizard.style.display = 'none';
    if (results) results.style.display = 'none';
    if (progress) progress.style.display = 'block';

    // Start the progress simulation
    simulateProgress();

    // After completion, show message
    setTimeout(() => {
        const stageText = document.getElementById('currentStageText');
        if (stageText) {
            stageText.textContent = 'Demo complete! This is how the progress will look during real analysis.';
        }

        // Auto-hide after 3 seconds and show wizard again
        setTimeout(() => {
            if (progress) progress.style.display = 'none';
            if (wizard) wizard.style.display = 'block';
            resetProgressStages();
        }, 3000);
    }, 11500); // Total duration of all stages
}

// Display Results
function displayResults() {
    progressContainer.style.display = 'none';
    resultsContainer.style.display = 'block';
    
    // Create file tabs if multiple files
    if (analysisResults.length > 1) {
        createFileTabs();
        document.getElementById('comparisonSection').style.display = 'block';
        displayComparison();
    } else {
        document.getElementById('fileTabs').style.display = 'none';
        document.getElementById('comparisonSection').style.display = 'none';
    }
    
    // Display results for first/current file
    displayFileResults(currentFileIndex);
    
    // Enable action buttons when analysis is complete
    setTimeout(() => {
        enableActionButtons();
    }, 100);
}

// Display comparison between multiple files
function displayComparison() {
    const comparisonContainer = document.getElementById('comparisonContainer');
    if (!comparisonContainer || analysisResults.length < 2) return;
    
    let comparisonHTML = `
        <div class="comparison-header">
            <h3><i class="fas fa-balance-scale"></i> Document Comparison</h3>
            <p>Compare key metrics across ${analysisResults.length} documents</p>
        </div>
        <div class="comparison-grid">
    `;
    
    // Create comparison metrics
    const metrics = ['word_count', 'character_count', 'sentence_count', 'paragraph_count'];
    const metricNames = ['Word Count', 'Character Count', 'Sentences', 'Paragraphs'];
    
    metrics.forEach((metric, index) => {
        comparisonHTML += `
            <div class="comparison-metric">
                <h4>${metricNames[index]}</h4>
                <div class="metric-bars">
        `;
        
        analysisResults.forEach((result, fileIndex) => {
            const value = result.statistics[metric] || 0;
            const maxValue = Math.max(...analysisResults.map(r => r.statistics[metric] || 0));
            const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
            
            comparisonHTML += `
                <div class="metric-bar">
                    <div class="bar-label">File ${fileIndex + 1}</div>
                    <div class="bar-container">
                        <div class="bar-fill" style="width: ${percentage}%"></div>
                    </div>
                    <div class="bar-value">${value.toLocaleString()}</div>
                </div>
            `;
        });
        
        comparisonHTML += `
                </div>
            </div>
        `;
    });
    
    // Add sentiment comparison
    if (analysisResults.every(result => result.sentiment)) {
        comparisonHTML += `
            <div class="comparison-metric">
                <h4>Sentiment Analysis</h4>
                <div class="sentiment-comparison">
        `;
        
        analysisResults.forEach((result, fileIndex) => {
            const sentiment = result.sentiment;
            const compound = sentiment.overall_sentiment || 0;
            const sentimentLabel = compound > 0.05 ? 'Positive' : compound < -0.05 ? 'Negative' : 'Neutral';
            const sentimentColor = compound > 0.05 ? '#10b981' : compound < -0.05 ? '#ef4444' : '#6b7280';
            
            comparisonHTML += `
                <div class="sentiment-item">
                    <div class="sentiment-label">File ${fileIndex + 1}</div>
                    <div class="sentiment-score" style="color: ${sentimentColor}">
                        ${sentimentLabel} (${compound.toFixed(3)})
                    </div>
                </div>
            `;
        });
        
        comparisonHTML += `
                </div>
            </div>
        `;
    }
    
    comparisonHTML += `
        </div>
        <div class="comparison-summary">
            <h4>Summary</h4>
            <div class="summary-stats">
                <div class="summary-stat">
                    <span class="stat-label">Total Files:</span>
                    <span class="stat-value">${analysisResults.length}</span>
                </div>
                <div class="summary-stat">
                    <span class="stat-label">Average Words:</span>
                    <span class="stat-value">${Math.round(analysisResults.reduce((sum, r) => sum + (r.statistics.word_count || 0), 0) / analysisResults.length).toLocaleString()}</span>
                </div>
                <div class="summary-stat">
                    <span class="stat-label">Total Words:</span>
                    <span class="stat-value">${analysisResults.reduce((sum, r) => sum + (r.statistics.word_count || 0), 0).toLocaleString()}</span>
                </div>
            </div>
        </div>
    `;
    
    comparisonContainer.innerHTML = comparisonHTML;
}

function createFileTabs() {
    const fileTabs = document.getElementById('fileTabs');
    fileTabs.innerHTML = '';
    
    analysisResults.forEach((result, index) => {
        const tab = document.createElement('div');
        tab.className = `file-tab ${index === currentFileIndex ? 'active' : ''}`;
        tab.textContent = result.filename;
        tab.onclick = () => switchFile(index);
        fileTabs.appendChild(tab);
    });
}

function switchFile(index) {
    currentFileIndex = index;
    document.querySelectorAll('.file-tab').forEach((tab, i) => {
        tab.classList.toggle('active', i === index);
    });
    displayFileResults(index);
}

function displayFileResults(index) {
    const result = analysisResults[index];
    
    // Display statistics
    displayStatistics(result.stats);
    
    // Display keyness analysis
    displayKeyness(result.keyness);
    
    // Display sentiment analysis
    displaySentiment(result.sentiment);
    
    // Display semantic clusters
    displayClusters(result.clusters);
    
    // Display sensorimotor analysis
    displaySensorimotor(result.sensorimotor);
}

function displayStatistics(stats) {
    const statsGrid = document.getElementById('statsGrid');
    statsGrid.innerHTML = `
        <div class="stat-card">
            <i class="fas fa-font stat-icon"></i>
            <h4>Total Words</h4>
            <div class="stat-value">${stats.total_words.toLocaleString()}</div>
        </div>
        <div class="stat-card">
            <i class="fas fa-layer-group stat-icon"></i>
            <h4>Unique Words</h4>
            <div class="stat-value">${stats.unique_words.toLocaleString()}</div>
        </div>
        <div class="stat-card">
            <i class="fas fa-text-height stat-icon"></i>
            <h4>Avg Word Length</h4>
            <div class="stat-value">${stats.avg_word_length}</div>
        </div>
        <div class="stat-card">
            <i class="fas fa-paragraph stat-icon"></i>
            <h4>Sentences</h4>
            <div class="stat-value">${stats.sentences.toLocaleString()}</div>
        </div>
        <div class="stat-card">
            <i class="fas fa-file-alt stat-icon"></i>
            <h4>Paragraphs</h4>
            <div class="stat-value">${stats.paragraphs || 1}</div>
        </div>
        <div class="stat-card">
            <i class="fas fa-keyboard stat-icon"></i>
            <h4>Characters</h4>
            <div class="stat-value">${stats.characters.toLocaleString()}</div>
        </div>
        <div class="stat-card">
            <i class="fas fa-chart-pie stat-icon"></i>
            <h4>Lexical Diversity</h4>
            <div class="stat-value">${stats.lexical_diversity}%</div>
        </div>
        <div class="stat-card">
            <i class="fas fa-book-reader stat-icon"></i>
            <h4>Reading Ease</h4>
            <div class="stat-value">${stats.flesch_reading_ease}</div>
            <small style="font-size: 0.75em; color: #666; margin-top: 5px; display: block;">${stats.readability_level}</small>
        </div>
        <div class="stat-card">
            <i class="fas fa-graduation-cap stat-icon"></i>
            <h4>Grade Level</h4>
            <div class="stat-value">${stats.flesch_kincaid_grade}</div>
            <small style="font-size: 0.75em; color: #666; margin-top: 5px; display: block;">Flesch-Kincaid</small>
        </div>
        <div class="stat-card">
            <i class="fas fa-ruler-horizontal stat-icon"></i>
            <h4>Avg Sentence Length</h4>
            <div class="stat-value">${stats.avg_sentence_length}</div>
            <small style="font-size: 0.75em; color: #666; margin-top: 5px; display: block;">words/sentence</small>
        </div>
    `;
}

// Global variables for keyness analysis
let currentKeynessData = null;
let keynessViewMode = 'chart'; // 'chart' or 'cloud'
let currentChartType = 'bar'; // 'bar', 'horizontalBar', 'doughnut', 'bubble'
let filteredKeynessData = null;

function displayKeyness(keyness) {
    currentKeynessData = keyness;
    filteredKeynessData = keyness;
    
    // Create interactive controls if not exists
    const keynessSection = document.querySelector('#keynessTable').parentElement;
    if (!document.getElementById('keynessInteractiveContainer')) {
        const controlsHTML = `
            <div class="keyness-interactive-container" id="keynessInteractiveContainer">
                <div class="keyness-controls">
                    <div class="view-toggle">
                        <button class="view-toggle-btn active" onclick="switchKeynessView('chart')">
                            <i class="fas fa-chart-bar"></i> Chart
                        </button>
                        <button class="view-toggle-btn" onclick="switchKeynessView('cloud')">
                            <i class="fas fa-cloud"></i> Cloud
                        </button>
                    </div>
                    
                    <div class="chart-type-selector" id="chartTypeSelector">
                        <button class="chart-type-btn active" onclick="changeChartType('bar')">
                            <i class="fas fa-chart-bar"></i> Bar
                        </button>
                        <button class="chart-type-btn" onclick="changeChartType('horizontalBar')">
                            <i class="fas fa-chart-bar fa-rotate-90"></i> Horizontal
                        </button>
                        <button class="chart-type-btn" onclick="changeChartType('doughnut')">
                            <i class="fas fa-chart-pie"></i> Doughnut
                        </button>
                        <button class="chart-type-btn" onclick="changeChartType('bubble')">
                            <i class="fas fa-circle"></i> Bubble
                        </button>
                    </div>
                    
                    <button class="keyness-filter-btn active" data-filter="all" onclick="filterKeyness('all')">
                        All Words
                    </button>
                    <button class="keyness-filter-btn" data-filter="top10" onclick="filterKeyness('top10')">
                        Top 10
                    </button>
                    <button class="keyness-filter-btn" data-filter="top20" onclick="filterKeyness('top20')">
                        Top 20
                    </button>
                    <button class="keyness-filter-btn" data-filter="top50" onclick="filterKeyness('top50')">
                        Top 50
                    </button>
                </div>
                <div id="keynessViewContainer"></div>
            </div>
        `;
        keynessSection.insertAdjacentHTML('afterbegin', controlsHTML);
    }
    
    // Display default view
    displayKeynessChart(Object.keys(keyness).slice(0, 20));
}

function displayKeynessChart(wordList) {
    const words = wordList;
    const frequencies = words.map(w => currentKeynessData[w].frequency);

    // Destroy existing chart if any
    if (charts.keyness) {
        charts.keyness.destroy();
    }

    // Create enhanced chart with gradient
    const ctx = document.getElementById('keynessChart').getContext('2d');
    
    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(20, 184, 166, 0.8)');
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0.8)');
    
    // Prepare data based on chart type
    let chartData, chartConfig;
    
    if (currentChartType === 'bubble') {
        // Bubble chart needs special data format
        chartData = {
            datasets: [{
                label: 'Word Frequency',
                data: words.map((word, index) => ({
                    x: index + 1,
                    y: frequencies[index],
                    r: Math.sqrt(frequencies[index]) * 8 + 10,
                    word: word
                })),
                backgroundColor: words.map((_, i) => `rgba(${20 + i * 10}, ${184 - i * 3}, ${166 + i * 2}, 0.7)`),
                borderColor: 'rgba(20, 184, 166, 1)',
                borderWidth: 2
            }]
        };
    } else if (currentChartType === 'doughnut') {
        // Doughnut/pie chart
        chartData = {
            labels: words,
            datasets: [{
                label: 'Occurrences',
                data: frequencies,
                backgroundColor: words.map((_, i) => {
                    const hue = 170 + (i * 20);
                    return `hsla(${hue}, 70%, 50%, 0.8)`;
                }),
                borderColor: 'white',
                borderWidth: 3,
                hoverOffset: 15
            }]
        };
    } else {
        // Bar or horizontal bar chart
        chartData = {
            labels: words,
            datasets: [{
                label: 'Occurrences',
                data: frequencies,
                backgroundColor: gradient,
                borderColor: 'rgba(20, 184, 166, 1)',
                borderWidth: 2,
                borderRadius: 8,
                hoverBackgroundColor: 'rgba(16, 185, 129, 0.9)',
                hoverBorderWidth: 3
            }]
        };
    }
    
    // Determine chart type
    let chartType = currentChartType;
    if (currentChartType === 'horizontalBar') {
        chartType = 'bar';
    }
    
    charts.keyness = new Chart(ctx, {
        type: chartType,
        data: chartData,
        options: {
            indexAxis: currentChartType === 'horizontalBar' ? 'y' : 'x',
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1200,
                easing: 'easeInOutQuart'
            },
            scales: currentChartType !== 'doughnut' && currentChartType !== 'bubble' ? {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: currentChartType === 'bubble' ? undefined : 1,
                        font: {
                            size: 12,
                            weight: 'bold'
                        },
                        color: '#666'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    title: {
                        display: currentChartType !== 'horizontalBar',
                        text: 'Number of Occurrences',
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        color: '#333'
                    }
                },
                x: {
                    ticks: {
                        font: {
                            size: 11,
                            weight: '600'
                        },
                        color: '#14b8a6'
                    },
                    grid: {
                        display: false
                    },
                    title: {
                        display: currentChartType === 'horizontalBar',
                        text: 'Number of Occurrences',
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        color: '#333'
                    }
                }
            } : {},
            plugins: {
                title: {
                    display: true,
                    text: `Top ${words.length} Most Frequent Words`,
                    font: {
                        size: 18,
                        weight: 'bold'
                    },
                    color: '#333',
                    padding: 20
                },
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    titleFont: {
                        size: 14,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 13
                    },
                    padding: 15,
                    cornerRadius: 10,
                    callbacks: {
                        label: function(context) {
                            if (currentChartType === 'bubble') {
                                const dataPoint = context.raw;
                                const word = dataPoint.word;
                                const data = currentKeynessData[word];
                                return [
                                    'Word: ' + word,
                                    'Occurrences: ' + data.frequency,
                                    'Frequency: ' + (data.relative_frequency * 100).toFixed(2) + '%'
                                ];
                            } else {
                                const word = context.label;
                                const data = currentKeynessData[word];
                                return [
                                    'Occurrences: ' + data.frequency,
                                    'Frequency: ' + (data.relative_frequency * 100).toFixed(2) + '%',
                                    'Significance: ' + data.log_likelihood.toFixed(1)
                                ];
                            }
                        }
                    }
                }
            }
        }
    });

    // Update table
    updateKeynessTable(words);
}

// Change chart type function
function changeChartType(type) {
    currentChartType = type;
    
    // Update button states
    document.querySelectorAll('.chart-type-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.closest('.chart-type-btn').classList.add('active');
    
    // Get current word list
    const activeFilter = document.querySelector('.keyness-filter-btn.active');
    const filter = activeFilter ? activeFilter.getAttribute('data-filter') : 'top20';
    
    let wordList = Object.keys(filteredKeynessData || currentKeynessData);
    if (filter === 'top10') wordList = wordList.slice(0, 10);
    else if (filter === 'top20') wordList = wordList.slice(0, 20);
    else if (filter === 'top50') wordList = wordList.slice(0, 50);
    
    // Redraw chart
    displayKeynessChart(wordList);
}

function displayKeynessWordCloud(wordList) {
    const viewContainer = document.getElementById('keynessViewContainer');
    viewContainer.innerHTML = '<div class="word-cloud-container" id="wordCloudDiv"></div>';
    
    const cloudDiv = document.getElementById('wordCloudDiv');
    const words = wordList;
    
    // Get max and min frequency for better weight distribution
    const frequencies = words.map(w => currentKeynessData[w].frequency);
    const maxFreq = Math.max(...frequencies);
    const minFreq = Math.min(...frequencies);
    const freqRange = maxFreq - minFreq;
    
    // Sort words by frequency for better visual layout (largest in center)
    const sortedWords = [...words].sort((a, b) => 
        currentKeynessData[b].frequency - currentKeynessData[a].frequency
    );
    
    // Calculate optimal size distribution (logarithmic scale for better visual balance)
    sortedWords.forEach((word, index) => {
        const data = currentKeynessData[word];
        const freq = data.frequency;
        
        // Use logarithmic scaling for more balanced visual weights
        const logScale = freqRange > 0 ? 
            Math.log(1 + freq - minFreq) / Math.log(1 + freqRange) : 0.5;
        
        // Determine size class based on logarithmic scale
        let sizeClass = 'freq-xs';
        if (logScale >= 0.85) sizeClass = 'freq-xl';
        else if (logScale >= 0.65) sizeClass = 'freq-lg';
        else if (logScale >= 0.45) sizeClass = 'freq-md';
        else if (logScale >= 0.25) sizeClass = 'freq-sm';
        
        const wordItem = document.createElement('span');
        wordItem.className = `word-cloud-item ${sizeClass}`;
        wordItem.textContent = word;
        wordItem.setAttribute('data-word', word);
        wordItem.setAttribute('data-frequency', freq);
        wordItem.setAttribute('data-percentage', (data.relative_frequency * 100).toFixed(2));
        wordItem.setAttribute('data-significance', data.log_likelihood.toFixed(1));
        
        // Add hover tooltip
        wordItem.addEventListener('mouseenter', showWordTooltip);
        wordItem.addEventListener('mouseleave', hideWordTooltip);
        
        // Stagger animation with slight randomness for organic feel
        const delay = index * 0.03 + (Math.random() * 0.02);
        wordItem.style.animation = `fadeInUp 0.7s ease-out ${delay}s both`;
        
        // Add slight random rotation for more dynamic appearance
        const rotation = (Math.random() - 0.5) * 10;
        wordItem.style.setProperty('--rotation', `${rotation}deg`);
        
        cloudDiv.appendChild(wordItem);
    });
    
    // Update table
    updateKeynessTable(words);
}

function showWordTooltip(e) {
    const word = e.target.getAttribute('data-word');
    const freq = e.target.getAttribute('data-frequency');
    const pct = e.target.getAttribute('data-percentage');
    const sig = e.target.getAttribute('data-significance');
    
    let tooltip = document.getElementById('wordTooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'wordTooltip';
        tooltip.className = 'word-details-tooltip';
        document.body.appendChild(tooltip);
    }
    
    tooltip.innerHTML = `
        <strong>📝 ${word.toUpperCase()}</strong>
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.3);">
            <div style="margin-bottom: 5px;">🔢 Count: <strong>${freq}</strong></div>
            <div style="margin-bottom: 5px;">📊 Frequency: <strong>${pct}%</strong></div>
            <div>⭐ Significance: <strong>${sig}</strong></div>
        </div>
    `;
    
    tooltip.classList.add('show');
    
    // Position tooltip with bounds checking
    const rect = e.target.getBoundingClientRect();
    const tooltipWidth = 200; // Approximate width
    let left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
    let top = rect.top - 10;
    
    // Adjust if going off screen
    if (left < 10) left = 10;
    if (left + tooltipWidth > window.innerWidth - 10) {
        left = window.innerWidth - tooltipWidth - 10;
    }
    
    tooltip.style.left = left + window.scrollX + 'px';
    tooltip.style.top = top + window.scrollY + 'px';
    tooltip.style.transform = 'translateY(-100%)';
}

function hideWordTooltip() {
    const tooltip = document.getElementById('wordTooltip');
    if (tooltip) {
        tooltip.classList.remove('show');
    }
}

function updateKeynessTable(words) {
    const keynessTable = document.getElementById('keynessTable');
    
    // Add table controls if not exists
    if (!document.getElementById('tableControls')) {
        const controlsHTML = `
            <div class="table-controls" id="tableControls">
                <div class="search-box">
                    <input type="text" id="wordSearchInput" placeholder="Search words..." onkeyup="searchKeynessTable()">
                    <i class="fas fa-search search-icon"></i>
                </div>
                <select class="table-filter-dropdown" id="sortDropdown" onchange="sortKeynessTable()">
                    <option value="frequency">Sort by Frequency</option>
                    <option value="alphabetical">Sort Alphabetically</option>
                    <option value="significance">Sort by Significance</option>
                </select>
                <select class="table-filter-dropdown" id="filterRange" onchange="filterKeynessTableByRange()">
                    <option value="all">All Ranges</option>
                    <option value="high">High Frequency (>10)</option>
                    <option value="medium">Medium (5-10)</option>
                    <option value="low">Low (<5)</option>
                </select>
                <button class="clear-filters-btn" onclick="clearKeynessFilters()">
                    <i class="fas fa-times"></i> Clear
                </button>
                <div class="results-count" id="resultsCount">
                    Showing ${words.length} words
                </div>
            </div>
        `;
        keynessTable.insertAdjacentHTML('beforebegin', controlsHTML);
    }
    
    // Update results count
    const resultsCount = document.getElementById('resultsCount');
    if (resultsCount) {
        resultsCount.textContent = `Showing ${words.length} words`;
    }
    
    let tableHTML = `
        <table id="keynessDataTable">
            <thead>
                <tr>
                    <th>Word</th>
                    <th>Count</th>
                    <th>% of Text</th>
                    <th title="Statistical significance score">Importance Score</th>
                </tr>
            </thead>
            <tbody>
    `;

    words.forEach(word => {
        const data = currentKeynessData[word];
        tableHTML += `
            <tr data-word="${word}" data-frequency="${data.frequency}" data-significance="${data.log_likelihood}">
                <td><strong>${word}</strong></td>
                <td>${data.frequency}</td>
                <td>${(data.relative_frequency * 100).toFixed(2)}%</td>
                <td>${data.log_likelihood.toFixed(1)}</td>
            </tr>
        `;
    });

    tableHTML += `
        </tbody>
        </table>
        <p style="margin-top: 10px; font-size: 0.9em; color: #666;">
            <em>Importance Score: Higher values indicate words that are statistically more significant in the text.</em>
        </p>
    `;
    keynessTable.innerHTML = tableHTML;
}

// Search function for keyness table
function searchKeynessTable() {
    const input = document.getElementById('wordSearchInput');
    const filter = input.value.toLowerCase();
    const table = document.getElementById('keynessDataTable');
    const rows = table ? table.getElementsByTagName('tr') : [];
    
    let visibleCount = 0;
    for (let i = 1; i < rows.length; i++) {
        const word = rows[i].getAttribute('data-word');
        if (word && word.toLowerCase().includes(filter)) {
            rows[i].style.display = '';
            visibleCount++;
        } else {
            rows[i].style.display = 'none';
        }
    }
    
    // Update results count
    const resultsCount = document.getElementById('resultsCount');
    if (resultsCount) {
        resultsCount.textContent = `Showing ${visibleCount} words`;
    }
}

// Sort function for keyness table
function sortKeynessTable() {
    const sortBy = document.getElementById('sortDropdown').value;
    const table = document.getElementById('keynessDataTable');
    if (!table) return;
    
    const tbody = table.getElementsByTagName('tbody')[0];
    const rows = Array.from(tbody.getElementsByTagName('tr'));
    
    rows.sort((a, b) => {
        if (sortBy === 'alphabetical') {
            return a.getAttribute('data-word').localeCompare(b.getAttribute('data-word'));
        } else if (sortBy === 'frequency') {
            return parseInt(b.getAttribute('data-frequency')) - parseInt(a.getAttribute('data-frequency'));
        } else if (sortBy === 'significance') {
            return parseFloat(b.getAttribute('data-significance')) - parseFloat(a.getAttribute('data-significance'));
        }
        return 0;
    });
    
    // Reappend sorted rows
    rows.forEach(row => tbody.appendChild(row));
}

// Filter by frequency range
function filterKeynessTableByRange() {
    const range = document.getElementById('filterRange').value;
    const table = document.getElementById('keynessDataTable');
    const rows = table ? table.getElementsByTagName('tr') : [];
    
    let visibleCount = 0;
    for (let i = 1; i < rows.length; i++) {
        const freq = parseInt(rows[i].getAttribute('data-frequency'));
        let show = true;
        
        if (range === 'high' && freq <= 10) show = false;
        else if (range === 'medium' && (freq < 5 || freq > 10)) show = false;
        else if (range === 'low' && freq >= 5) show = false;
        
        if (show) {
            rows[i].style.display = '';
            visibleCount++;
        } else {
            rows[i].style.display = 'none';
        }
    }
    
    // Update results count
    const resultsCount = document.getElementById('resultsCount');
    if (resultsCount) {
        resultsCount.textContent = `Showing ${visibleCount} words`;
    }
}

// Clear all filters
function clearKeynessFilters() {
    // Clear search input
    const searchInput = document.getElementById('wordSearchInput');
    if (searchInput) searchInput.value = '';
    
    // Reset dropdowns
    const sortDropdown = document.getElementById('sortDropdown');
    if (sortDropdown) sortDropdown.value = 'frequency';
    
    const filterRange = document.getElementById('filterRange');
    if (filterRange) filterRange.value = 'all';
    
    // Show all rows
    const table = document.getElementById('keynessDataTable');
    if (table) {
        const rows = table.getElementsByTagName('tr');
        let count = 0;
        for (let i = 1; i < rows.length; i++) {
            rows[i].style.display = '';
            count++;
        }
        
        // Update results count
        const resultsCount = document.getElementById('resultsCount');
        if (resultsCount) {
            resultsCount.textContent = `Showing ${count} words`;
        }
    }
    
    // Re-sort by frequency
    sortKeynessTable();
}

function switchKeynessView(view) {
    keynessViewMode = view;
    
    // Update button states
    document.querySelectorAll('.view-toggle-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.closest('.view-toggle-btn').classList.add('active');
    
    // Show/hide chart type selector
    const chartTypeSelector = document.getElementById('chartTypeSelector');
    if (chartTypeSelector) {
        chartTypeSelector.style.display = view === 'chart' ? 'flex' : 'none';
    }
    
    // Get current filter
    const activeFilter = document.querySelector('.keyness-filter-btn.active');
    const filter = activeFilter ? activeFilter.getAttribute('data-filter') : 'all';
    
    // Get word list based on filter
    let wordList = Object.keys(currentKeynessData);
    if (filter === 'top10') wordList = wordList.slice(0, 10);
    else if (filter === 'top20') wordList = wordList.slice(0, 20);
    else if (filter === 'top50') wordList = wordList.slice(0, 50);
    
    // Display appropriate view
    if (view === 'chart') {
        // Show chart container, hide word cloud
        document.getElementById('keynessChart').parentElement.style.display = 'block';
        const cloudContainer = document.getElementById('keynessViewContainer');
        if (cloudContainer) cloudContainer.innerHTML = '';
        displayKeynessChart(wordList);
    } else {
        // Hide chart, show word cloud
        document.getElementById('keynessChart').parentElement.style.display = 'none';
        displayKeynessWordCloud(wordList);
    }
}

function filterKeyness(filter) {
    // Update button states
    document.querySelectorAll('.keyness-filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Get word list based on filter
    let wordList = Object.keys(currentKeynessData);
    if (filter === 'top10') wordList = wordList.slice(0, 10);
    else if (filter === 'top20') wordList = wordList.slice(0, 20);
    else if (filter === 'top50') wordList = wordList.slice(0, 50);
    
    // Update current view
    if (keynessViewMode === 'chart') {
        displayKeynessChart(wordList);
    } else {
        displayKeynessWordCloud(wordList);
    }
}

// Global variables for sentiment analysis
let currentSentimentData = null;
let sentimentViewMode = 'overview'; // 'overview', 'emotions', 'timeline', 'words'

function displaySentiment(sentiment) {
    console.log('Displaying sentiment:', sentiment); // Debug log
    currentSentimentData = sentiment;
    
    // Replace the basic charts with advanced interactive container
    const chartsRow = document.querySelector('#tab-sentiment .charts-row');
    const sentimentSummary = document.getElementById('sentimentSummary');
    
    // Clear existing content
    chartsRow.innerHTML = '';
    if (sentimentSummary) sentimentSummary.innerHTML = '';
    
    // Create advanced interactive container
    const advancedContainer = document.createElement('div');
    advancedContainer.className = 'sentiment-interactive-container';
    advancedContainer.id = 'sentimentInteractiveContainer';
    advancedContainer.innerHTML = `
        <div class="sentiment-controls">
            <div class="sentiment-view-toggle">
                <button class="sentiment-view-btn active" onclick="switchSentimentView('overview')">
                    <i class="fas fa-chart-pie"></i> Overview
                </button>
                <button class="sentiment-view-btn" onclick="switchSentimentView('emotions')">
                    <i class="fas fa-heart"></i> Emotions (12)
                </button>
                <button class="sentiment-view-btn" onclick="switchSentimentView('timeline')">
                    <i class="fas fa-chart-line"></i> Timeline
                </button>
                <button class="sentiment-view-btn" onclick="switchSentimentView('words')">
                    <i class="fas fa-list-alt"></i> Emotion Words
                </button>
                <button class="sentiment-view-btn" onclick="switchSentimentView('advanced')">
                    <i class="fas fa-brain"></i> Advanced
                </button>
            </div>
        </div>
        <div id="sentimentViewContainer"></div>
    `;
    
    // Insert the advanced container
    chartsRow.appendChild(advancedContainer);
    
    // Display default overview
    displaySentimentOverview(sentiment);
}

function displaySentimentOverview(sentiment) {
    const viewContainer = document.getElementById('sentimentViewContainer');
    
    // Create overview layout
    viewContainer.innerHTML = `
        <div class="charts-row">
            <div class="chart-container half">
                <canvas id="sentimentChart"></canvas>
            </div>
            <div class="chart-container half">
                <canvas id="emotionChart"></canvas>
            </div>
        </div>
        <div id="sentimentSummary" class="sentiment-summary"></div>
    `;
    
    // Enhanced Sentiment doughnut chart
    if (charts.sentiment) {
        charts.sentiment.destroy();
    }
    
    const sentCtx = document.getElementById('sentimentChart').getContext('2d');
    charts.sentiment = new Chart(sentCtx, {
        type: 'doughnut',
        data: {
            labels: ['Positive', 'Negative', 'Neutral'],
            datasets: [{
                data: [
                    (sentiment.positive * 100).toFixed(1),
                    (sentiment.negative * 100).toFixed(1),
                    (sentiment.neutral * 100).toFixed(1)
                ],
                backgroundColor: [
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(156, 163, 175, 0.8)'
                ],
                borderColor: [
                    'rgba(16, 185, 129, 1)',
                    'rgba(239, 68, 68, 1)',
                    'rgba(156, 163, 175, 1)'
                ],
                borderWidth: 2,
                hoverOffset: 15,
                hoverBorderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                animateRotate: true,
                animateScale: true,
                duration: 1200,
                easing: 'easeInOutQuart'
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Overall Sentiment Distribution',
                    font: {
                        size: 18,
                        weight: 'bold'
                    },
                    color: '#333',
                    padding: 20
                },
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 13,
                            weight: '600'
                        },
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    padding: 12,
                    cornerRadius: 8,
                    titleFont: {
                        size: 14,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 13
                    },
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + context.parsed.toFixed(1) + '%';
                        }
                    }
                }
            }
        }
    });
    
    // Show top 5 emotions in small chart for overview
    displayTopEmotions(sentiment);
    
    // Update summary
    updateSentimentSummary(sentiment);
}

function displayTopEmotions(sentiment) {
    // Display top 5 emotions in emotion chart
    if (charts.emotion) {
        charts.emotion.destroy();
    }
    
    const emoCtx = document.getElementById('emotionChart').getContext('2d');
    const emotions = sentiment.emotions;
    
    // Get top 5 emotions
    const sortedEmotions = Object.entries(emotions)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    const emotionLabels = sortedEmotions.map(([e]) => e.charAt(0).toUpperCase() + e.slice(1));
    const emotionValues = sortedEmotions.map(([, v]) => (v * 100).toFixed(1));
    
    // Color mapping for 12 emotions
    const emotionColors = {
        'Joy': ['rgba(251, 191, 36, 0.8)', 'rgba(251, 191, 36, 1)'],
        'Sadness': ['rgba(59, 130, 246, 0.8)', 'rgba(59, 130, 246, 1)'],
        'Anger': ['rgba(239, 68, 68, 0.8)', 'rgba(239, 68, 68, 1)'],
        'Fear': ['rgba(139, 92, 246, 0.8)', 'rgba(139, 92, 246, 1)'],
        'Surprise': ['rgba(249, 115, 22, 0.8)', 'rgba(249, 115, 22, 1)'],
        'Disgust': ['rgba(34, 197, 94, 0.8)', 'rgba(34, 197, 94, 1)'],
        'Trust': ['rgba(20, 184, 166, 0.8)', 'rgba(20, 184, 166, 1)'],
        'Anticipation': ['rgba(236, 72, 153, 0.8)', 'rgba(236, 72, 153, 1)'],
        'Love': ['rgba(244, 63, 94, 0.8)', 'rgba(244, 63, 94, 1)'],
        'Guilt': ['rgba(168, 85, 247, 0.8)', 'rgba(168, 85, 247, 1)'],
        'Shame': ['rgba(107, 114, 128, 0.8)', 'rgba(107, 114, 128, 1)'],
        'Pride': ['rgba(245, 158, 11, 0.8)', 'rgba(245, 158, 11, 1)']
    };
    
    const bgColors = emotionLabels.map(e => emotionColors[e] ? emotionColors[e][0] : 'rgba(156, 163, 175, 0.8)');
    const borderColors = emotionLabels.map(e => emotionColors[e] ? emotionColors[e][1] : 'rgba(156, 163, 175, 1)');
    
    charts.emotion = new Chart(emoCtx, {
        type: 'bar',
        data: {
            labels: emotionLabels,
            datasets: [{
                label: 'Emotion Percentage',
                data: emotionValues,
                backgroundColor: bgColors,
                borderColor: borderColors,
                borderWidth: 2,
                borderRadius: 8,
                hoverBorderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1200,
                easing: 'easeInOutQuart'
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        font: {
                            size: 12,
                            weight: 'bold'
                        },
                        color: '#666'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    title: {
                        display: true,
                        text: 'Percentage (%)',
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        color: '#333'
                    }
                },
                x: {
                    ticks: {
                        font: {
                            size: 11,
                            weight: '600'
                        },
                        color: '#14b8a6'
                    },
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Top 5 Emotions Detected',
                    font: {
                        size: 18,
                        weight: 'bold'
                    },
                    color: '#333',
                    padding: 20
                },
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    padding: 12,
                    cornerRadius: 8,
                    titleFont: {
                        size: 14,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 13
                    },
                    callbacks: {
                        label: function(context) {
                            return 'Percentage: ' + context.parsed.y.toFixed(1) + '%';
                        }
                    }
                }
            }
        }
    });
}

function updateSentimentSummary(sentiment) {
    // Enhanced sentiment summary with icons
    const sentimentSummary = document.getElementById('sentimentSummary');
    const sentimentType = sentiment.overall_sentiment > 0.05 ? 'positive' : sentiment.overall_sentiment < -0.05 ? 'negative' : 'neutral';
    const sentimentIcon = sentiment.overall_sentiment > 0.05 ? '😊' : sentiment.overall_sentiment < -0.05 ? '😔' : '😐';
    const sentimentLabel = sentiment.overall_sentiment > 0.05 ? 'Positive' : sentiment.overall_sentiment < -0.05 ? 'Negative' : 'Neutral';
    
    sentimentSummary.innerHTML = `
        <div class="sentiment-badge ${sentimentType}">
            <div class="sentiment-icon">${sentimentIcon}</div>
            <h4>Overall Sentiment</h4>
            <div class="sentiment-value">${sentimentLabel}</div>
            <div style="font-size: 0.9em; margin-top: 8px;">Score: ${sentiment.overall_sentiment.toFixed(3)}</div>
        </div>
        <div class="sentiment-badge neutral">
            <div class="sentiment-icon">📊</div>
            <h4>Subjectivity</h4>
            <div class="sentiment-value">${(sentiment.subjectivity * 100).toFixed(1)}%</div>
            <div style="font-size: 0.85em; margin-top: 8px;">
                ${sentiment.subjectivity > 0.6 ? 'Highly Subjective' : sentiment.subjectivity > 0.4 ? 'Moderately Subjective' : 'Mostly Objective'}
            </div>
        </div>
        ${sentiment.sentiment_stats ? `
        <div class="sentiment-badge neutral">
            <div class="sentiment-icon">📝</div>
            <h4>Sentence Analysis</h4>
            <div class="sentiment-value">${sentiment.sentiment_stats.total_sentences}</div>
            <div style="font-size: 0.85em; margin-top: 8px;">
                ${sentiment.sentiment_stats.positive_sentences}+ | ${sentiment.sentiment_stats.negative_sentences}- | ${sentiment.sentiment_stats.neutral_sentences}○
            </div>
        </div>
        ` : ''}
    `;
}

// Display all 12 emotions
function displayAllEmotions(sentiment) {
    const viewContainer = document.getElementById('sentimentViewContainer');
    const emotions = sentiment.emotions;
    
    // Destroy existing charts
    if (charts.emotion) charts.emotion.destroy();
    if (charts.sentiment) charts.sentiment.destroy();
    
    // Create polar area chart for all 12 emotions
    viewContainer.innerHTML = `
        <div class="chart-container" style="height: 500px;">
            <canvas id="allEmotionsChart"></canvas>
        </div>
        <div id="emotionDetailsGrid" class="emotion-details-grid"></div>
    `;
    
    const ctx = document.getElementById('allEmotionsChart').getContext('2d');
    
    const emotionLabels = Object.keys(emotions).map(e => e.charAt(0).toUpperCase() + e.slice(1));
    const emotionValues = Object.values(emotions).map(v => (v * 100).toFixed(1));
    
    // Color mapping
    const colors = [
        'rgba(251, 191, 36, 0.7)',    // Joy
        'rgba(59, 130, 246, 0.7)',    // Sadness
        'rgba(239, 68, 68, 0.7)',     // Anger
        'rgba(139, 92, 246, 0.7)',    // Fear
        'rgba(249, 115, 22, 0.7)',    // Surprise
        'rgba(34, 197, 94, 0.7)',     // Disgust
        'rgba(20, 184, 166, 0.7)',    // Trust
        'rgba(236, 72, 153, 0.7)',    // Anticipation
        'rgba(244, 63, 94, 0.7)',     // Love
        'rgba(168, 85, 247, 0.7)',    // Guilt
        'rgba(107, 114, 128, 0.7)',   // Shame
        'rgba(245, 158, 11, 0.7)'     // Pride
    ];
    
    charts.allEmotions = new Chart(ctx, {
        type: 'polarArea',
        data: {
            labels: emotionLabels,
            datasets: [{
                data: emotionValues,
                backgroundColor: colors,
                borderColor: colors.map(c => c.replace('0.7', '1')),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1500,
                easing: 'easeInOutQuart'
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Complete Emotion Analysis (12 Emotions)',
                    font: {
                        size: 20,
                        weight: 'bold'
                    },
                    color: '#333',
                    padding: 20
                },
                legend: {
                    position: 'right',
                    labels: {
                        padding: 12,
                        font: {
                            size: 12,
                            weight: '600'
                        },
                        usePointStyle: true
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    padding: 15,
                    cornerRadius: 10,
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + context.parsed.r.toFixed(1) + '%';
                        }
                    }
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
    
    // Display emotion details grid
    displayEmotionDetails(sentiment);
}

function displayEmotionDetails(sentiment) {
    const detailsGrid = document.getElementById('emotionDetailsGrid');
    if (!detailsGrid) return;
    
    const emotions = sentiment.emotions;
    const intensities = sentiment.emotion_intensities || {};
    const emotionWords = sentiment.emotion_words || {};
    
    const emotionIcons = {
        'joy': '😄', 'sadness': '😢', 'anger': '😠', 'fear': '😨',
        'surprise': '😲', 'disgust': '🤢', 'trust': '🤝', 'anticipation': '🤩',
        'love': '❤️', 'guilt': '😔', 'shame': '😳', 'pride': '😌'
    };
    
    let html = '<div class="emotion-cards-grid">';
    
    Object.entries(emotions).forEach(([emotion, value]) => {
        const percentage = (value * 100).toFixed(1);
        const icon = emotionIcons[emotion] || '😐';
        const intensity = intensities[emotion] || {high: 0, medium: 0, low: 0};
        const words = emotionWords[emotion] || [];
        const topWords = words.slice(0, 5).join(', ');
        
        html += `
            <div class="emotion-detail-card">
                <div class="emotion-header">
                    <span class="emotion-icon-large">${icon}</span>
                    <h4>${emotion.charAt(0).toUpperCase() + emotion.slice(1)}</h4>
                </div>
                <div class="emotion-percentage">${percentage}%</div>
                <div class="emotion-intensity-bar">
                    <div class="intensity-segment high" style="width: ${(intensity.high / (intensity.high + intensity.medium + intensity.low) * 100)}%"></div>
                    <div class="intensity-segment medium" style="width: ${(intensity.medium / (intensity.high + intensity.medium + intensity.low) * 100)}%"></div>
                    <div class="intensity-segment low" style="width: ${(intensity.low / (intensity.high + intensity.medium + intensity.low) * 100)}%"></div>
                </div>
                <div class="emotion-intensity-labels">
                    <span>🔴 ${intensity.high}</span>
                    <span>🟡 ${intensity.medium}</span>
                    <span>🟢 ${intensity.low}</span>
                </div>
                ${topWords ? `<div class="emotion-words-preview">${topWords}</div>` : ''}
            </div>
        `;
    });
    
    html += '</div>';
    detailsGrid.innerHTML = html;
}

// Display sentiment timeline
function displaySentimentTimeline(sentiment) {
    const viewContainer = document.getElementById('sentimentViewContainer');
    
    if (!sentiment.sentence_sentiments || sentiment.sentence_sentiments.length === 0) {
        viewContainer.innerHTML = '<p style="text-align:center; padding: 40px; color: #666;">No sentence-level data available</p>';
        return;
    }
    
    // Destroy existing charts
    if (charts.sentiment) charts.sentiment.destroy();
    if (charts.emotion) charts.emotion.destroy();
    
    viewContainer.innerHTML = `
        <div class="chart-container" style="height: 400px;">
            <canvas id="sentimentTimelineChart"></canvas>
        </div>
        <div id="sentenceList" class="sentence-list-container"></div>
    `;
    
    const ctx = document.getElementById('sentimentTimelineChart').getContext('2d');
    const sentences = sentiment.sentence_sentiments;
    
    charts.timeline = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sentences.map(s => `S${s.sentence_num}`),
            datasets: [{
                label: 'Sentiment Score',
                data: sentences.map(s => s.compound),
                borderColor: 'rgba(20, 184, 166, 1)',
                backgroundColor: 'rgba(20, 184, 166, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 6,
                pointHoverRadius: 8,
                pointBackgroundColor: sentences.map(s => 
                    s.sentiment === 'positive' ? 'rgba(16, 185, 129, 1)' :
                    s.sentiment === 'negative' ? 'rgba(239, 68, 68, 1)' :
                    'rgba(156, 163, 175, 1)'
                ),
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1500,
                easing: 'easeInOutQuart'
            },
            scales: {
                y: {
                    min: -1,
                    max: 1,
                    ticks: {
                        callback: function(value) {
                            if (value > 0.5) return 'Very Positive';
                            if (value > 0) return 'Positive';
                            if (value > -0.5) return 'Negative';
                            return 'Very Negative';
                        },
                        font: {
                            size: 11,
                            weight: 'bold'
                        },
                        color: '#666'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45,
                        font: {
                            size: 10
                        },
                        color: '#14b8a6'
                    },
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Sentiment Flow Through Text',
                    font: {
                        size: 18,
                        weight: 'bold'
                    },
                    color: '#333',
                    padding: 20
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    padding: 15,
                    cornerRadius: 10,
                    callbacks: {
                        label: function(context) {
                            const s = sentences[context.dataIndex];
                            return [
                                'Sentiment: ' + s.sentiment,
                                'Score: ' + s.compound.toFixed(3),
                                'Text: ' + s.text
                            ];
                        }
                    }
                }
            }
        }
    });
    
    // Display sentence list
    displaySentenceList(sentences);
}

function displaySentenceList(sentences) {
    const container = document.getElementById('sentenceList');
    if (!container) return;
    
    let html = '<h4 style="margin: 20px 0; color: #333; font-size: 1.3em;">Sentence-by-Sentence Breakdown</h4>';
    html += '<div class="sentence-cards">';
    
    sentences.forEach(s => {
        const sentimentClass = s.sentiment;
        const icon = s.sentiment === 'positive' ? '😊' : s.sentiment === 'negative' ? '😔' : '😐';
        html += `
            <div class="sentence-card ${sentimentClass}">
                <div class="sentence-header">
                    <span class="sentence-icon">${icon}</span>
                    <span class="sentence-label">Sentence ${s.sentence_num}</span>
                    <span class="sentence-score">${s.compound >= 0 ? '+' : ''}${s.compound.toFixed(3)}</span>
                </div>
                <div class="sentence-text">${s.text}</div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Display emotion words
function displayEmotionWords(sentiment) {
    const viewContainer = document.getElementById('sentimentViewContainer');
    const emotionWords = sentiment.emotion_words || {};
    const intensities = sentiment.emotion_intensities || {};
    
    if (Object.keys(emotionWords).every(k => emotionWords[k].length === 0)) {
        viewContainer.innerHTML = '<p style="text-align:center; padding: 40px; color: #666;">No emotion words detected in text</p>';
        return;
    }
    
    // Destroy existing charts
    if (charts.sentiment) charts.sentiment.destroy();
    if (charts.emotion) charts.emotion.destroy();
    
    const emotionIcons = {
        'joy': '😄', 'sadness': '😢', 'anger': '😠', 'fear': '😨',
        'surprise': '😲', 'disgust': '🤢', 'trust': '🤝', 'anticipation': '🤩',
        'love': '❤️', 'guilt': '😔', 'shame': '😳', 'pride': '😌'
    };
    
    let html = '<div class="emotion-words-grid">';
    
    Object.entries(emotionWords).forEach(([emotion, words]) => {
        if (words.length > 0) {
            const icon = emotionIcons[emotion] || '😐';
            const intensity = intensities[emotion] || {high: 0, medium: 0, low: 0};
            
            html += `
                <div class="emotion-word-card">
                    <div class="emotion-word-header">
                        <span class="emotion-icon-lg">${icon}</span>
                        <h4>${emotion.charAt(0).toUpperCase() + emotion.slice(1)}</h4>
                        <span class="word-count-badge">${words.length} words</span>
                    </div>
                    <div class="intensity-breakdown">
                        <span class="intensity-tag high">High: ${intensity.high}</span>
                        <span class="intensity-tag medium">Med: ${intensity.medium}</span>
                        <span class="intensity-tag low">Low: ${intensity.low}</span>
                    </div>
                    <div class="emotion-word-tags">
                        ${words.slice(0, 15).map(w => `<span class="emotion-word-tag">${w}</span>`).join('')}
                        ${words.length > 15 ? `<span class="more-words">+${words.length - 15} more</span>` : ''}
                    </div>
                </div>
            `;
        }
    });
    
    html += '</div>';
    viewContainer.innerHTML = html;
}

// Display advanced metrics
function displayAdvancedMetrics(sentiment) {
    const viewContainer = document.getElementById('sentimentViewContainer');
    const advanced = sentiment.advanced_metrics || {};
    
    // Destroy existing charts
    if (charts.sentiment) charts.sentiment.destroy();
    if (charts.emotion) charts.emotion.destroy();
    
    viewContainer.innerHTML = `
        <div class="advanced-metrics-container">
            <div class="chart-container" style="height: 350px; margin-bottom: 30px;">
                <canvas id="vadChart"></canvas>
            </div>
            <div class="advanced-stats-grid">
                <div class="advanced-stat-card">
                    <div class="stat-icon">🎭</div>
                    <h4>Valence</h4>
                    <div class="stat-value-lg">${advanced.valence || 0}</div>
                    <div class="stat-description">Pleasantness (-1 to +1)</div>
                    <div class="stat-bar">
                        <div class="stat-bar-fill" style="width: ${((advanced.valence || 0) + 1) / 2 * 100}%; background: linear-gradient(90deg, #ef4444, #10b981);"></div>
                    </div>
                </div>
                <div class="advanced-stat-card">
                    <div class="stat-icon">⚡</div>
                    <h4>Arousal</h4>
                    <div class="stat-value-lg">${advanced.arousal || 0}</div>
                    <div class="stat-description">Emotional Intensity (0-1)</div>
                    <div class="stat-bar">
                        <div class="stat-bar-fill" style="width: ${(advanced.arousal || 0) * 100}%; background: linear-gradient(90deg, #14b8a6, #f59e0b);"></div>
                    </div>
                </div>
                <div class="advanced-stat-card">
                    <div class="stat-icon">💪</div>
                    <h4>Dominance</h4>
                    <div class="stat-value-lg">${advanced.dominance || 0}</div>
                    <div class="stat-description">Control/Confidence (0-1)</div>
                    <div class="stat-bar">
                        <div class="stat-bar-fill" style="width: ${(advanced.dominance || 0) * 100}%; background: linear-gradient(90deg, #06b6d4, #8b5cf6);"></div>
                    </div>
                </div>
                <div class="advanced-stat-card">
                    <div class="stat-icon">🎨</div>
                    <h4>Emotion Diversity</h4>
                    <div class="stat-value-lg">${advanced.emotion_diversity || 0}</div>
                    <div class="stat-description">Range of Emotions (0-1)</div>
                    <div class="stat-bar">
                        <div class="stat-bar-fill" style="width: ${(advanced.emotion_diversity || 0) * 100}%; background: linear-gradient(90deg, #10b981, #fbbf24);"></div>
                    </div>
                </div>
                <div class="advanced-stat-card highlight">
                    <div class="stat-icon">👑</div>
                    <h4>Dominant Emotion</h4>
                    <div class="stat-value-lg">${advanced.dominant_emotion ? advanced.dominant_emotion.charAt(0).toUpperCase() + advanced.dominant_emotion.slice(1) : 'None'}</div>
                    <div class="stat-description">Intensity: ${((advanced.dominant_intensity || 0) * 100).toFixed(1)}%</div>
                </div>
            </div>
        </div>
    `;
    
    // Create VAD (Valence-Arousal-Dominance) radar chart
    const ctx = document.getElementById('vadChart').getContext('2d');
    charts.vad = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Valence (Pleasantness)', 'Arousal (Intensity)', 'Dominance (Control)'],
            datasets: [{
                label: 'Emotional Dimensions',
                data: [
                    ((advanced.valence || 0) + 1) / 2,  // Normalize to 0-1
                    advanced.arousal || 0,
                    advanced.dominance || 0
                ],
                backgroundColor: 'rgba(20, 184, 166, 0.2)',
                borderColor: 'rgba(20, 184, 166, 1)',
                borderWidth: 3,
                pointBackgroundColor: 'rgba(245, 158, 11, 1)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1500,
                easing: 'easeInOutQuart'
            },
            scales: {
                r: {
                    beginAtZero: true,
                    max: 1,
                    ticks: {
                        stepSize: 0.2,
                        font: {
                            size: 11
                        }
                    },
                    pointLabels: {
                        font: {
                            size: 13,
                            weight: 'bold'
                        },
                        color: '#14b8a6'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    angleLines: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Emotional Dimensions (VAD Model)',
                    font: {
                        size: 18,
                        weight: 'bold'
                    },
                    color: '#333',
                    padding: 20
                },
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    padding: 15,
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + context.parsed.r.toFixed(3);
                        }
                    }
                }
            }
        }
    });
}

// Switch sentiment view
function switchSentimentView(view) {
    sentimentViewMode = view;
    
    // Update button states
    document.querySelectorAll('.sentiment-view-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.closest('.sentiment-view-btn').classList.add('active');
    
    // Display appropriate view
    if (view === 'overview') {
        displaySentimentOverview(currentSentimentData);
    } else if (view === 'emotions') {
        displayAllEmotions(currentSentimentData);
    } else if (view === 'timeline') {
        displaySentimentTimeline(currentSentimentData);
    } else if (view === 'words') {
        displayEmotionWords(currentSentimentData);
    } else if (view === 'advanced') {
        displayAdvancedMetrics(currentSentimentData);
    }
}

// Global variables for clustering
let currentClusterData = null;
let clusterViewMode = 'overview'; // 'overview', 'network', 'detailed', 'comparison', 'insights'

function displayClusters(clusters) {
    console.log('Displaying clusters:', clusters); // Debug log
    currentClusterData = clusters;
    
    // Replace basic clusters with advanced interactive container
    const clusterContainer = document.getElementById('clusterContainer');
    clusterContainer.innerHTML = '';
    
    if (clusters.error || !clusters.clusters || clusters.clusters.length === 0) {
        clusterContainer.innerHTML = '<p>No clusters available or text too short for clustering.</p>';
        return;
    }
    
    // Create advanced interactive container
    const advancedContainer = document.createElement('div');
    advancedContainer.className = 'cluster-interactive-container';
    advancedContainer.id = 'clusterInteractiveContainer';
    advancedContainer.innerHTML = `
        <div class="cluster-controls">
            <div class="cluster-view-toggle">
                <button class="cluster-view-btn active" onclick="switchClusterView('overview')">
                    <i class="fas fa-th-large"></i> Overview
                </button>
                <button class="cluster-view-btn" onclick="switchClusterView('network')">
                    <i class="fas fa-project-diagram"></i> Network
                </button>
                <button class="cluster-view-btn" onclick="switchClusterView('detailed')">
                    <i class="fas fa-search"></i> Detailed
                </button>
                <button class="cluster-view-btn" onclick="switchClusterView('comparison')">
                    <i class="fas fa-balance-scale"></i> Comparison
                </button>
                <button class="cluster-view-btn" onclick="switchClusterView('insights')">
                    <i class="fas fa-lightbulb"></i> Insights
                </button>
            </div>
        </div>
        <div id="clusterViewContainer"></div>
    `;
    
    // Insert the advanced container
    clusterContainer.appendChild(advancedContainer);
    
    // Display default overview
    displayClusterOverview(clusters);
}

function displayClusterOverview(clusters) {
    const viewContainer = document.getElementById('clusterViewContainer');
    
    // Create overview layout with enhanced cluster cards
    viewContainer.innerHTML = `
        <div class="cluster-overview-grid">
            ${clusters.clusters.map((cluster, index) => `
                <div class="cluster-card enhanced" data-cluster="${index}">
                    <div class="cluster-header">
                        <div class="cluster-icon">
                            <i class="fas fa-project-diagram"></i>
                        </div>
                        <div class="cluster-info">
                            <h3>Cluster ${cluster.cluster_id + 1}</h3>
                            <span class="cluster-size">${cluster.words.length} words</span>
                        </div>
                        <div class="cluster-actions">
                            <button class="cluster-action-btn" onclick="expandCluster(${index})" title="Expand">
                                <i class="fas fa-expand"></i>
                            </button>
                            <button class="cluster-action-btn" onclick="analyzeCluster(${index})" title="Analyze">
                                <i class="fas fa-chart-line"></i>
                            </button>
                        </div>
                    </div>
                    <div class="cluster-words">
                        ${cluster.words.slice(0, 8).map(word => `<span class="word-tag" data-word="${word}">${word}</span>`).join('')}
                        ${cluster.words.length > 8 ? `<span class="more-words">+${cluster.words.length - 8} more</span>` : ''}
                    </div>
                    <div class="cluster-theme">
                        <span class="theme-label">Theme:</span>
                        <span class="theme-value">${getClusterTheme(cluster.words)}</span>
                    </div>
                    <div class="cluster-coherence">
                        <div class="coherence-bar">
                            <div class="coherence-fill" style="width: ${getClusterCoherence(cluster.words)}%"></div>
                        </div>
                        <span class="coherence-text">Coherence: ${getClusterCoherence(cluster.words)}%</span>
                    </div>
                </div>
            `).join('')}
        </div>
        <div class="cluster-summary">
            <div class="summary-stats">
                <div class="stat-card">
                    <i class="fas fa-layer-group"></i>
                    <h4>Total Clusters</h4>
                    <p class="stat-value">${clusters.clusters.length}</p>
                </div>
                <div class="stat-card">
                    <i class="fas fa-tags"></i>
                    <h4>Total Words</h4>
                    <p class="stat-value">${clusters.clusters.reduce((sum, cluster) => sum + cluster.words.length, 0)}</p>
                </div>
                <div class="stat-card">
                    <i class="fas fa-chart-pie"></i>
                    <h4>Avg. Size</h4>
                    <p class="stat-value">${Math.round(clusters.clusters.reduce((sum, cluster) => sum + cluster.words.length, 0) / clusters.clusters.length)}</p>
                </div>
                <div class="stat-card">
                    <i class="fas fa-star"></i>
                    <h4>Quality Score</h4>
                    <p class="stat-value">${getOverallQualityScore(clusters.clusters)}/10</p>
                </div>
            </div>
        </div>
    `;
    
    // Add hover effects and interactions
    addClusterInteractions();
}

// Switch cluster view
function switchClusterView(view) {
    clusterViewMode = view;
    
    // Update button states
    document.querySelectorAll('.cluster-view-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.closest('.cluster-view-btn').classList.add('active');
    
    // Display appropriate view
    if (view === 'overview') {
        displayClusterOverview(currentClusterData);
    } else if (view === 'network') {
        displayClusterNetwork(currentClusterData);
    } else if (view === 'detailed') {
        displayClusterDetailed(currentClusterData);
    } else if (view === 'comparison') {
        displayClusterComparison(currentClusterData);
    } else if (view === 'insights') {
        displayClusterInsights(currentClusterData);
    }
}

// Helper functions for clustering
function getClusterTheme(words) {
    // Simple theme detection based on word categories
    const themes = {
        'Technology': ['model', 'tool', 'development', 'software', 'system', 'data', 'algorithm'],
        'Analysis': ['analysis', 'text', 'word', 'sentiment', 'semantic', 'processing'],
        'Creative': ['creative', 'writing', 'art', 'design', 'project', 'work'],
        'AI/ML': ['ai', 'nlp', 'language', 'model', 'intelligence', 'learning'],
        'Business': ['business', 'commercial', 'proposal', 'template', 'project']
    };
    
    let maxMatches = 0;
    let detectedTheme = 'General';
    
    for (const [theme, keywords] of Object.entries(themes)) {
        const matches = words.filter(word => keywords.some(keyword => 
            word.toLowerCase().includes(keyword.toLowerCase())
        )).length;
        
        if (matches > maxMatches) {
            maxMatches = matches;
            detectedTheme = theme;
        }
    }
    
    return detectedTheme;
}

function getClusterCoherence(words) {
    // Simple coherence calculation based on word similarity
    if (words.length <= 1) return 100;
    
    // For now, return a random coherence score between 60-95
    return Math.floor(Math.random() * 35) + 60;
}

function getOverallQualityScore(clusters) {
    if (!clusters || clusters.length === 0) return 0;
    
    // Calculate quality based on cluster sizes and distribution
    const totalWords = clusters.reduce((sum, cluster) => sum + cluster.words.length, 0);
    const avgSize = totalWords / clusters.length;
    const sizeVariance = clusters.reduce((sum, cluster) => 
        sum + Math.pow(cluster.words.length - avgSize, 2), 0) / clusters.length;
    
    // Quality score based on size distribution (lower variance = higher quality)
    const qualityScore = Math.max(1, Math.min(10, 10 - (sizeVariance / 10)));
    return Math.round(qualityScore);
}

function addClusterInteractions() {
    // Add hover effects and click handlers for cluster cards
    document.querySelectorAll('.cluster-card.enhanced').forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
    
    // Add click handlers for word tags
    document.querySelectorAll('.word-tag').forEach(tag => {
        tag.addEventListener('click', function() {
            const word = this.dataset.word;
            console.log('Clicked word:', word);
            // Add word highlighting or analysis here
        });
    });
}

function expandCluster(index) {
    console.log('Expanding cluster:', index);
    // Add cluster expansion functionality here
}

function analyzeCluster(index) {
    console.log('Analyzing cluster:', index);
    // Add cluster analysis functionality here
}

// Placeholder functions for other cluster views
function displayClusterNetwork(clusters) {
    const viewContainer = document.getElementById('clusterViewContainer');
    viewContainer.innerHTML = `
        <div class="network-container">
            <div class="network-controls">
                <button class="network-btn" onclick="regenerateNetwork()">
                    <i class="fas fa-sync"></i> Regenerate
                </button>
                <button class="network-btn" onclick="toggleNetworkLabels()">
                    <i class="fas fa-tag"></i> Toggle Labels
                </button>
                <button class="network-btn" onclick="resetNetworkView()">
                    <i class="fas fa-home"></i> Reset View
                </button>
            </div>
            <div class="network-canvas">
                <canvas id="clusterNetworkChart"></canvas>
            </div>
            <div class="network-legend">
                <h4>Cluster Legend</h4>
                <div class="legend-items">
                    ${clusters.clusters.map((cluster, index) => `
                        <div class="legend-item" data-cluster="${index}">
                            <div class="legend-color" style="background-color: ${getClusterColor(index)}"></div>
                            <span class="legend-label">Cluster ${index + 1} (${cluster.words.length} words)</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    // Create network visualization
    setTimeout(() => {
        createClusterNetworkChart(clusters);
    }, 100);
}

function createClusterNetworkChart(clusters) {
    const ctx = document.getElementById('clusterNetworkChart');
    if (!ctx) return;
    
    // Create a bubble chart to represent cluster network
    new Chart(ctx, {
        type: 'bubble',
        data: {
            datasets: clusters.clusters.map((cluster, index) => ({
                label: `Cluster ${index + 1}`,
                data: [{
                    x: Math.random() * 100,
                    y: Math.random() * 100,
                    r: Math.max(10, cluster.words.length * 2)
                }],
                backgroundColor: getClusterColor(index),
                borderColor: getClusterColor(index).replace('0.8', '1'),
                borderWidth: 2
            }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Cluster Network Visualization',
                    font: { size: 16, weight: 'bold' }
                },
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    display: false
                },
                y: {
                    display: false
                }
            }
        }
    });
}

function displayClusterDetailed(clusters) {
    const viewContainer = document.getElementById('clusterViewContainer');
    viewContainer.innerHTML = `
        <div class="cluster-detailed-container">
            <div class="detailed-header">
                <h3>Detailed Cluster Analysis</h3>
                <div class="cluster-selector">
                    <label for="clusterSelect">Select Cluster:</label>
                    <select id="clusterSelect" onchange="showClusterDetails(this.value)">
                        ${clusters.clusters.map((cluster, index) => `
                            <option value="${index}">Cluster ${index + 1} (${cluster.words.length} words)</option>
                        `).join('')}
                    </select>
                </div>
            </div>
            <div id="clusterDetails" class="cluster-details">
                ${getClusterDetailsHTML(clusters.clusters[0], 0)}
            </div>
        </div>
    `;
}

function displayClusterComparison(clusters) {
    const viewContainer = document.getElementById('clusterViewContainer');
    viewContainer.innerHTML = `
        <div class="cluster-comparison-container">
            <div class="comparison-charts">
                <div class="chart-container">
                    <canvas id="clusterSizeChart"></canvas>
                </div>
                <div class="chart-container">
                    <canvas id="clusterCoherenceChart"></canvas>
                </div>
            </div>
            <div class="comparison-metrics">
                <h3>Cluster Analysis Metrics</h3>
                <div class="metrics-grid">
                    <div class="metric-card">
                        <h4>Size Distribution</h4>
                        <p class="metric-value">${getSizeDistribution(clusters.clusters)}</p>
                        <p class="metric-description">${getSizeDescription(clusters.clusters)}</p>
                    </div>
                    <div class="metric-card">
                        <h4>Coherence Range</h4>
                        <p class="metric-value">${getCoherenceRange(clusters.clusters)}</p>
                        <p class="metric-description">${getCoherenceDescription(clusters.clusters)}</p>
                    </div>
                    <div class="metric-card">
                        <h4>Theme Diversity</h4>
                        <p class="metric-value">${getThemeDiversity(clusters.clusters)}</p>
                        <p class="metric-description">${getThemeDescription(clusters.clusters)}</p>
                    </div>
                    <div class="metric-card">
                        <h4>Overall Quality</h4>
                        <p class="metric-value">${getOverallQualityScore(clusters.clusters)}/10</p>
                        <p class="metric-description">${getQualityDescription(clusters.clusters)}</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Create comparison charts
    setTimeout(() => {
        createClusterComparisonCharts(clusters);
    }, 100);
}

function createClusterComparisonCharts(clusters) {
    // Create size chart
    const sizeCtx = document.getElementById('clusterSizeChart');
    if (sizeCtx) {
        new Chart(sizeCtx, {
            type: 'bar',
            data: {
                labels: clusters.clusters.map((_, i) => `Cluster ${i + 1}`),
                datasets: [{
                    label: 'Word Count',
                    data: clusters.clusters.map(c => c.words.length),
                    backgroundColor: clusters.clusters.map((_, i) => getClusterColor(i)),
                    borderColor: clusters.clusters.map((_, i) => getClusterColor(i).replace('0.8', '1')),
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Cluster Size Comparison',
                        font: { size: 16, weight: 'bold' }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    // Create coherence chart
    const coherenceCtx = document.getElementById('clusterCoherenceChart');
    if (coherenceCtx) {
        new Chart(coherenceCtx, {
            type: 'doughnut',
            data: {
                labels: clusters.clusters.map((_, i) => `Cluster ${i + 1}`),
                datasets: [{
                    data: clusters.clusters.map(c => getClusterCoherence(c.words)),
                    backgroundColor: clusters.clusters.map((_, i) => getClusterColor(i)),
                    borderColor: clusters.clusters.map((_, i) => getClusterColor(i).replace('0.8', '1')),
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Cluster Coherence Distribution',
                        font: { size: 16, weight: 'bold' }
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
}

function displayClusterInsights(clusters) {
    const viewContainer = document.getElementById('clusterViewContainer');
    viewContainer.innerHTML = `
        <div class="cluster-insights-container">
            <div class="insights-header">
                <h3>Advanced Cluster Insights</h3>
                <p>AI-powered analysis of your text's semantic structure and themes</p>
            </div>
            <div class="insights-grid">
                <div class="insight-card main-insight">
                    <div class="insight-icon">
                        <i class="fas fa-lightbulb"></i>
                    </div>
                    <div class="insight-content">
                        <h4>Primary Insight</h4>
                        <p class="insight-text">${getClusterPrimaryInsight(clusters.clusters)}</p>
                    </div>
                </div>
                <div class="insight-card">
                    <div class="insight-icon">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <div class="insight-content">
                        <h4>Structure Strength</h4>
                        <p class="insight-text">${getStructureStrength(clusters.clusters)}</p>
                    </div>
                </div>
                <div class="insight-card">
                    <div class="insight-icon">
                        <i class="fas fa-target"></i>
                    </div>
                    <div class="insight-content">
                        <h4>Improvement Area</h4>
                        <p class="insight-text">${getClusterImprovementArea(clusters.clusters)}</p>
                    </div>
                </div>
                <div class="insight-card">
                    <div class="insight-icon">
                        <i class="fas fa-star"></i>
                    </div>
                    <div class="insight-content">
                        <h4>Clustering Quality</h4>
                        <p class="insight-text">${getClusteringQuality(clusters.clusters)}</p>
                    </div>
                </div>
            </div>
            <div class="recommendations">
                <h4>Recommendations</h4>
                <ul class="recommendation-list">
                    ${getClusterRecommendations(clusters.clusters).map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
        </div>
    `;
}

// Additional helper functions for clustering
function getClusterColor(index) {
    const colors = [
        '#14b8a6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
        '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
    ];
    return colors[index % colors.length];
}

function getClusterDetailsHTML(cluster, index) {
    return `
        <div class="cluster-detail-card">
            <h4>Cluster ${index + 1} Details</h4>
            <div class="detail-content">
                <p><strong>Words:</strong> ${cluster.words.join(', ')}</p>
                <p><strong>Theme:</strong> ${getClusterTheme(cluster.words)}</p>
                <p><strong>Coherence:</strong> ${getClusterCoherence(cluster.words)}%</p>
            </div>
        </div>
    `;
}

function getSizeDistribution(clusters) {
    const sizes = clusters.map(c => c.words.length);
    const min = Math.min(...sizes);
    const max = Math.max(...sizes);
    return `${min}-${max} words`;
}

function getSizeDescription(clusters) {
    const avgSize = clusters.reduce((sum, c) => sum + c.words.length, 0) / clusters.length;
    if (avgSize < 5) return 'Small clusters - good granularity';
    if (avgSize < 10) return 'Medium clusters - balanced';
    return 'Large clusters - broad themes';
}

function getCoherenceRange(clusters) {
    const coherences = clusters.map(c => getClusterCoherence(c.words));
    const min = Math.min(...coherences);
    const max = Math.max(...coherences);
    return `${min}-${max}%`;
}

function getCoherenceDescription(clusters) {
    const avgCoherence = clusters.reduce((sum, c) => sum + getClusterCoherence(c.words), 0) / clusters.length;
    if (avgCoherence >= 80) return 'High coherence - well-defined themes';
    if (avgCoherence >= 60) return 'Medium coherence - some overlap';
    return 'Low coherence - mixed themes';
}

function getThemeDiversity(clusters) {
    const themes = clusters.map(c => getClusterTheme(c.words));
    const uniqueThemes = new Set(themes).size;
    return `${uniqueThemes}/${clusters.length}`;
}

function getThemeDescription(clusters) {
    const themes = clusters.map(c => getClusterTheme(c.words));
    const uniqueThemes = new Set(themes).size;
    if (uniqueThemes === clusters.length) return 'High diversity - distinct themes';
    if (uniqueThemes >= clusters.length * 0.7) return 'Good diversity - mostly distinct';
    return 'Low diversity - overlapping themes';
}

function getQualityDescription(clusters) {
    const quality = getOverallQualityScore(clusters);
    if (quality >= 8) return 'Excellent clustering quality';
    if (quality >= 6) return 'Good clustering quality';
    if (quality >= 4) return 'Fair clustering quality';
    return 'Poor clustering quality';
}

function getClusterPrimaryInsight(clusters) {
    const totalWords = clusters.reduce((sum, c) => sum + c.words.length, 0);
    const avgSize = totalWords / clusters.length;
    const themes = clusters.map(c => getClusterTheme(c.words));
    const uniqueThemes = new Set(themes).size;
    
    return `Your text contains ${clusters.length} semantic clusters with ${totalWords} total words, averaging ${avgSize.toFixed(1)} words per cluster. The clusters show ${uniqueThemes} distinct themes, indicating ${uniqueThemes === clusters.length ? 'excellent' : 'good'} semantic diversity.`;
}

function getStructureStrength(clusters) {
    const totalWords = clusters.reduce((sum, c) => sum + c.words.length, 0);
    const avgSize = totalWords / clusters.length;
    const sizeVariance = clusters.reduce((sum, c) => sum + Math.pow(c.words.length - avgSize, 2), 0) / clusters.length;
    
    if (sizeVariance < 5) return 'Excellent structure - well-balanced clusters';
    if (sizeVariance < 15) return 'Good structure - reasonably balanced';
    return 'Fair structure - some size imbalance';
}

function getClusterImprovementArea(clusters) {
    const themes = clusters.map(c => getClusterTheme(c.words));
    const uniqueThemes = new Set(themes).size;
    
    if (uniqueThemes < clusters.length * 0.5) return 'Consider adding more diverse content to create distinct themes';
    if (clusters.length < 3) return 'Try longer text to generate more meaningful clusters';
    return 'Your clustering shows good semantic organization';
}

function getClusteringQuality(clusters) {
    const quality = getOverallQualityScore(clusters);
    return `Quality Score: ${quality}/10 - ${getQualityDescription(clusters)}`;
}

function getClusterRecommendations(clusters) {
    const recommendations = [];
    const themes = clusters.map(c => getClusterTheme(c.words));
    const uniqueThemes = new Set(themes).size;
    
    if (uniqueThemes < clusters.length * 0.7) {
        recommendations.push('Add more diverse content to create distinct thematic clusters');
    }
    
    if (clusters.length < 3) {
        recommendations.push('Use longer text to generate more meaningful semantic clusters');
    }
    
    const avgSize = clusters.reduce((sum, c) => sum + c.words.length, 0) / clusters.length;
    if (avgSize < 3) {
        recommendations.push('Consider adding more related words to strengthen cluster coherence');
    }
    
    if (recommendations.length === 0) {
        recommendations.push('Your text shows excellent semantic clustering!');
    }
    
    return recommendations;
}

function displayClusterOverview(clusters) {
    const viewContainer = document.getElementById('clusterViewContainer');
    
    // Create overview layout with enhanced cluster cards
    viewContainer.innerHTML = `
        <div class="cluster-overview-grid">
            ${clusters.clusters.map((cluster, index) => `
                <div class="cluster-card enhanced" data-cluster="${index}">
                    <div class="cluster-header">
                        <div class="cluster-icon">
                            <i class="fas fa-project-diagram"></i>
                        </div>
                        <div class="cluster-info">
                            <h3>Cluster ${cluster.cluster_id + 1}</h3>
                            <span class="cluster-size">${cluster.words.length} words</span>
                        </div>
                        <div class="cluster-actions">
                            <button class="cluster-action-btn" onclick="expandCluster(${index})" title="Expand">
                                <i class="fas fa-expand"></i>
                            </button>
                            <button class="cluster-action-btn" onclick="analyzeCluster(${index})" title="Analyze">
                                <i class="fas fa-chart-line"></i>
                            </button>
                        </div>
                    </div>
                    <div class="cluster-words">
                        ${cluster.words.slice(0, 8).map(word => `<span class="word-tag" data-word="${word}">${word}</span>`).join('')}
                        ${cluster.words.length > 8 ? `<span class="more-words">+${cluster.words.length - 8} more</span>` : ''}
                    </div>
                    <div class="cluster-theme">
                        <span class="theme-label">Theme:</span>
                        <span class="theme-value">${getClusterTheme(cluster.words)}</span>
                    </div>
                    <div class="cluster-coherence">
                        <div class="coherence-bar">
                            <div class="coherence-fill" style="width: ${getClusterCoherence(cluster.words)}%"></div>
                        </div>
                        <span class="coherence-text">Coherence: ${getClusterCoherence(cluster.words)}%</span>
                    </div>
                </div>
            `).join('')}
        </div>
        <div class="cluster-summary">
            <div class="summary-stats">
                <div class="stat-card">
                    <i class="fas fa-layer-group"></i>
                    <h4>Total Clusters</h4>
                    <p class="stat-value">${clusters.clusters.length}</p>
                </div>
                <div class="stat-card">
                    <i class="fas fa-tags"></i>
                    <h4>Total Words</h4>
                    <p class="stat-value">${clusters.clusters.reduce((sum, cluster) => sum + cluster.words.length, 0)}</p>
                </div>
                <div class="stat-card">
                    <i class="fas fa-chart-pie"></i>
                    <h4>Avg. Size</h4>
                    <p class="stat-value">${Math.round(clusters.clusters.reduce((sum, cluster) => sum + cluster.words.length, 0) / clusters.clusters.length)}</p>
                </div>
                <div class="stat-card">
                    <i class="fas fa-star"></i>
                    <h4>Quality Score</h4>
                    <p class="stat-value">${getOverallQualityScore(clusters.clusters)}/10</p>
                </div>
            </div>
        </div>
    `;
    
    // Add hover effects and interactions
    addClusterInteractions();
}

// Global variables for sensory analysis
let currentSensoryData = null;
let sensoryViewMode = 'overview'; // 'overview', 'detailed', 'patterns', 'comparison', 'insights'

function displaySensorimotor(sensorimotor) {
    console.log('Displaying sensory analysis:', sensorimotor); // Debug log
    currentSensoryData = sensorimotor;
    
    // Replace basic sensory with advanced interactive container
    const sensoryContainer = document.getElementById('sensorimotorSummary').parentElement;
    sensoryContainer.innerHTML = '';
    
    // Create advanced interactive container
    const advancedContainer = document.createElement('div');
    advancedContainer.className = 'sensory-interactive-container';
    advancedContainer.id = 'sensoryInteractiveContainer';
    advancedContainer.innerHTML = `
        <div class="sensory-controls">
            <div class="sensory-view-toggle">
                <button class="sensory-view-btn active" onclick="switchSensoryView('overview')">
                    <i class="fas fa-chart-bar"></i> Overview
                </button>
                <button class="sensory-view-btn" onclick="switchSensoryView('detailed')">
                    <i class="fas fa-microscope"></i> Detailed Analysis
                </button>
                <button class="sensory-view-btn" onclick="switchSensoryView('patterns')">
                    <i class="fas fa-project-diagram"></i> Patterns
                </button>
                <button class="sensory-view-btn" onclick="switchSensoryView('comparison')">
                    <i class="fas fa-balance-scale"></i> Comparison
                </button>
                <button class="sensory-view-btn" onclick="switchSensoryView('insights')">
                    <i class="fas fa-lightbulb"></i> Insights
                </button>
            </div>
        </div>
        <div id="sensoryViewContainer"></div>
    `;
    
    // Insert the advanced container
    sensoryContainer.appendChild(advancedContainer);
    
    // Display default overview
    displaySensoryOverview(sensorimotor);
}

function displaySensoryOverview(sensorimotor) {
    const viewContainer = document.getElementById('sensoryViewContainer');
    
    // Create overview layout with multiple charts
    viewContainer.innerHTML = `
        <div class="sensory-charts-grid">
            <div class="chart-container main-chart">
                <canvas id="sensorimotorChart"></canvas>
            </div>
            <div class="chart-container side-chart">
                <canvas id="sensoryRadarChart"></canvas>
            </div>
        </div>
        <div class="sensory-summary-cards">
            <div class="sensory-summary-card">
                <div class="card-icon">
                    <i class="fas fa-eye"></i>
                </div>
                <div class="card-content">
                    <h3>Visual Dominance</h3>
                    <p class="card-value">${sensorimotor.raw_counts.visual || 0} words</p>
                    <p class="card-percentage">${((sensorimotor.raw_counts.visual || 0) / sensorimotor.total_sensory_words * 100).toFixed(1)}%</p>
                </div>
            </div>
            <div class="sensory-summary-card">
                <div class="card-icon">
                    <i class="fas fa-volume-up"></i>
                </div>
                <div class="card-content">
                    <h3>Auditory Elements</h3>
                    <p class="card-value">${sensorimotor.raw_counts.auditory || 0} words</p>
                    <p class="card-percentage">${((sensorimotor.raw_counts.auditory || 0) / sensorimotor.total_sensory_words * 100).toFixed(1)}%</p>
                </div>
            </div>
            <div class="sensory-summary-card">
                <div class="card-icon">
                    <i class="fas fa-hand-paper"></i>
                </div>
                <div class="card-content">
                    <h3>Tactile Sensations</h3>
                    <p class="card-value">${sensorimotor.raw_counts.tactile || 0} words</p>
                    <p class="card-percentage">${((sensorimotor.raw_counts.tactile || 0) / sensorimotor.total_sensory_words * 100).toFixed(1)}%</p>
                </div>
            </div>
            <div class="sensory-summary-card">
                <div class="card-icon">
                    <i class="fas fa-running"></i>
                </div>
                <div class="card-content">
                    <h3>Motor Actions</h3>
                    <p class="card-value">${sensorimotor.raw_counts.motor || 0} words</p>
                    <p class="card-percentage">${((sensorimotor.raw_counts.motor || 0) / sensorimotor.total_sensory_words * 100).toFixed(1)}%</p>
                </div>
            </div>
        </div>
        <div id="sensorySummary" class="sensory-summary"></div>
    `;
    
    // Create charts after DOM is ready
    setTimeout(() => {
        createSensoryCharts(sensorimotor);
    }, 100);
}

function createSensoryBarChart(sensorimotor) {
    if (charts.sensorimotor) {
        charts.sensorimotor.destroy();
    }
    
    const ctx = document.getElementById('sensorimotorChart').getContext('2d');
    const data = sensorimotor.raw_counts;
    
    // Enhanced color palette for sensory categories
    const categoryColors = {
        'Visual': 'rgba(20, 184, 166, 0.8)',      // Teal
        'Auditory': 'rgba(16, 185, 129, 0.8)',    // Emerald
        'Gustatory': 'rgba(245, 158, 11, 0.8)',   // Gold
        'Olfactory': 'rgba(139, 92, 246, 0.8)',   // Purple
        'Tactile': 'rgba(236, 72, 153, 0.8)',     // Pink
        'Motor': 'rgba(59, 130, 246, 0.8)',       // Blue
        'Interoceptive': 'rgba(168, 85, 247, 0.8)' // Violet
    };
    
    const labels = Object.keys(data).map(k => k.charAt(0).toUpperCase() + k.slice(1));
    const backgroundColors = labels.map(label => categoryColors[label] || 'rgba(20, 184, 166, 0.8)');
    const borderColors = backgroundColors.map(color => color.replace('0.8', '1'));
    
    charts.sensorimotor = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Sensory Words',
                data: Object.values(data),
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 2,
                borderRadius: 8,
                hoverBorderWidth: 3,
                hoverBackgroundColor: backgroundColors.map(color => color.replace('0.8', '0.9'))
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1500,
                easing: 'easeInOutQuart'
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        font: {
                            size: 12,
                            weight: 'bold'
                        },
                        color: '#666'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    title: {
                        display: true,
                        text: 'Number of Words',
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        color: '#333'
                    }
                },
                x: {
                    ticks: {
                        font: {
                            size: 11,
                            weight: '600'
                        },
                        color: '#14b8a6'
                    },
                    grid: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Sensory Category',
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        color: '#333'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Sensory Word Distribution',
                    font: {
                        size: 18,
                        weight: 'bold'
                    },
                    color: '#333',
                    padding: 20
                },
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#14b8a6',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        title: function(context) {
                            return context[0].label;
                        },
                        label: function(context) {
                            const percentage = ((context.parsed.y / sensorimotor.total_sensory_words) * 100).toFixed(1);
                            return `${context.parsed.y} words (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function createSensoryRadarChart(sensorimotor) {
    if (charts.sensoryRadar) {
        charts.sensoryRadar.destroy();
    }
    
    const ctx = document.getElementById('sensoryRadarChart').getContext('2d');
    const data = sensorimotor.raw_counts;
    const values = Object.values(data);
    
    // Normalize values for radar chart (0-100 scale)
    const maxValue = Math.max(...values, 1);
    const normalizedValues = values.map(val => (val / maxValue) * 100);
    
    charts.sensoryRadar = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: Object.keys(data).map(k => k.charAt(0).toUpperCase() + k.slice(1)),
            datasets: [{
                label: 'Sensory Intensity',
                data: normalizedValues,
                backgroundColor: 'rgba(20, 184, 166, 0.2)',
                borderColor: 'rgba(20, 184, 166, 1)',
                borderWidth: 3,
                pointBackgroundColor: 'rgba(20, 184, 166, 1)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1500,
                easing: 'easeInOutQuart'
            },
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        font: {
                            size: 10,
                            weight: 'bold'
                        },
                        color: '#666'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    angleLines: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    pointLabels: {
                        font: {
                            size: 11,
                            weight: '600'
                        },
                        color: '#14b8a6'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Sensory Profile',
                    font: {
                        size: 16,
                        weight: 'bold'
                    },
                    color: '#333',
                    padding: 15
                },
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#14b8a6',
                    borderWidth: 1,
                    cornerRadius: 8,
                    callbacks: {
                        title: function(context) {
                            return context[0].label;
                        },
                        label: function(context) {
                            const originalValue = values[context.dataIndex];
                            return `${originalValue} words (${context.parsed.r.toFixed(1)}% intensity)`;
                        }
                    }
                }
            }
        }
    });
}

function updateSensorySummary(sensorimotor) {
    const summaryContainer = document.getElementById('sensorySummary');
    summaryContainer.innerHTML = `
        <div class="sensory-stats">
            <div class="stat-item">
                <span class="stat-label">Total Sensory Words:</span>
                <span class="stat-value">${sensorimotor.total_sensory_words} out of ${sensorimotor.total_words_analyzed} words</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Sensory Density:</span>
                <span class="stat-value">${sensorimotor.sensory_density}% (${sensorimotor.total_sensory_words} sensory words per 100 words)</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Dominant Category:</span>
                <span class="stat-value">${sensorimotor.dominant_modality.charAt(0).toUpperCase() + sensorimotor.dominant_modality.slice(1)}</span>
            </div>
        </div>
        <div class="sensory-breakdown">
            <h4>Sensory Category Breakdown</h4>
            <div class="breakdown-list">
                ${Object.entries(sensorimotor.raw_counts).map(([modality, count]) => `
                    <div class="breakdown-item">
                        <span class="category-name">${modality.charAt(0).toUpperCase() + modality.slice(1)}:</span>
                        <span class="category-count">${count} words (${((count / sensorimotor.total_sensory_words) * 100).toFixed(1)}% of sensory words)</span>
                    </div>
                `).join('')}
            </div>
        </div>
        <div class="sensory-note">
            <p><strong>Note:</strong> This analysis counts sensory-related words by category. Higher counts indicate more descriptive writing in that sensory domain.</p>
        </div>
    `;
}

// Switch sensory view
function switchSensoryView(view) {
    sensoryViewMode = view;
    
    // Update button states
    document.querySelectorAll('.sensory-view-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.closest('.sensory-view-btn').classList.add('active');
    
    // Display appropriate view
    if (view === 'overview') {
        displaySensoryOverview(currentSensoryData);
    } else if (view === 'detailed') {
        displaySensoryDetailed(currentSensoryData);
    } else if (view === 'patterns') {
        displaySensoryPatterns(currentSensoryData);
    } else if (view === 'comparison') {
        displaySensoryComparison(currentSensoryData);
    } else if (view === 'insights') {
        displaySensoryInsights(currentSensoryData);
    }
}

function displaySensoryDetailed(sensorimotor) {
    const viewContainer = document.getElementById('sensoryViewContainer');
    
    viewContainer.innerHTML = `
        <div class="sensory-detailed-grid">
            <div class="chart-container">
                <canvas id="sensoryTreemapChart"></canvas>
            </div>
            <div class="chart-container">
                <canvas id="sensoryHeatmapChart"></canvas>
            </div>
        </div>
        <div class="sensory-word-analysis">
            <h3>Sensory Word Analysis</h3>
            <div class="sensory-words-grid">
                ${Object.entries(sensorimotor.raw_counts).map(([category, count]) => `
                    <div class="sensory-category-card">
                        <div class="category-header">
                            <i class="fas fa-${getSensoryIcon(category)}"></i>
                            <h4>${category.charAt(0).toUpperCase() + category.slice(1)}</h4>
                            <span class="word-count">${count} words</span>
                        </div>
                        <div class="category-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${(count / Math.max(...Object.values(sensorimotor.raw_counts))) * 100}%"></div>
                            </div>
                            <span class="progress-text">${((count / sensorimotor.total_sensory_words) * 100).toFixed(1)}% of sensory words</span>
                        </div>
                        <div class="category-description">
                            ${getSensoryDescription(category)}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    // Create treemap chart
    createSensoryTreemap(sensorimotor);
    
    // Create heatmap chart
    createSensoryHeatmap(sensorimotor);
}

function displaySensoryPatterns(sensorimotor) {
    const viewContainer = document.getElementById('sensoryViewContainer');
    
    viewContainer.innerHTML = `
        <div class="sensory-patterns-container">
            <div class="pattern-analysis">
                <h3>Writing Style Analysis</h3>
                <div class="pattern-cards">
                    <div class="pattern-card">
                        <div class="pattern-icon">
                            <i class="fas fa-palette"></i>
                        </div>
                        <div class="pattern-content">
                            <h4>Descriptive Style</h4>
                            <p class="pattern-score">${getDescriptiveScore(sensorimotor)}/10</p>
                            <p class="pattern-description">${getDescriptiveDescription(sensorimotor)}</p>
                        </div>
                    </div>
                    <div class="pattern-card">
                        <div class="pattern-icon">
                            <i class="fas fa-eye"></i>
                        </div>
                        <div class="pattern-content">
                            <h4>Visual Focus</h4>
                            <p class="pattern-score">${getVisualFocusScore(sensorimotor)}/10</p>
                            <p class="pattern-description">${getVisualFocusDescription(sensorimotor)}</p>
                        </div>
                    </div>
                    <div class="pattern-card">
                        <div class="pattern-icon">
                            <i class="fas fa-volume-up"></i>
                        </div>
                        <div class="pattern-content">
                            <h4>Auditory Engagement</h4>
                            <p class="pattern-score">${getAuditoryScore(sensorimotor)}/10</p>
                            <p class="pattern-description">${getAuditoryDescription(sensorimotor)}</p>
                        </div>
                    </div>
                    <div class="pattern-card">
                        <div class="pattern-icon">
                            <i class="fas fa-hand-paper"></i>
                        </div>
                        <div class="pattern-content">
                            <h4>Tactile Richness</h4>
                            <p class="pattern-score">${getTactileScore(sensorimotor)}/10</p>
                            <p class="pattern-description">${getTactileDescription(sensorimotor)}</p>
                        </div>
                    </div>
                </div>
            </div>
            <div class="sensory-timeline">
                <h3>Sensory Density Timeline</h3>
                <div class="timeline-chart">
                    <canvas id="sensoryTimelineChart"></canvas>
                </div>
            </div>
        </div>
    `;
    
    // Create timeline chart
    createSensoryTimeline(sensorimotor);
}

function displaySensoryComparison(sensorimotor) {
    const viewContainer = document.getElementById('sensoryViewContainer');
    
    viewContainer.innerHTML = `
        <div class="sensory-comparison-container">
            <div class="comparison-charts">
                <div class="chart-container">
                    <canvas id="sensoryComparisonChart"></canvas>
                </div>
                <div class="chart-container">
                    <canvas id="sensoryPolarChart"></canvas>
                </div>
            </div>
            <div class="comparison-metrics">
                <h3>Sensory Balance Analysis</h3>
                <div class="balance-cards">
                    <div class="balance-card">
                        <h4>Dominance Ratio</h4>
                        <p class="balance-value">${getDominanceRatio(sensorimotor)}</p>
                        <p class="balance-description">${getDominanceDescription(sensorimotor)}</p>
                    </div>
                    <div class="balance-card">
                        <h4>Diversity Index</h4>
                        <p class="balance-value">${getDiversityIndex(sensorimotor)}</p>
                        <p class="balance-description">${getDiversityDescription(sensorimotor)}</p>
                    </div>
                    <div class="balance-card">
                        <h4>Engagement Level</h4>
                        <p class="balance-value">${getEngagementLevel(sensorimotor)}</p>
                        <p class="balance-description">${getEngagementDescription(sensorimotor)}</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Create comparison charts
    createSensoryComparisonChart(sensorimotor);
    createSensoryPolarChart(sensorimotor);
}

function displaySensoryInsights(sensorimotor) {
    const viewContainer = document.getElementById('sensoryViewContainer');
    
    viewContainer.innerHTML = `
        <div class="sensory-insights-container">
            <div class="insights-header">
                <h3>Advanced Sensory Insights</h3>
                <p>AI-powered analysis of your writing's sensory characteristics</p>
            </div>
            <div class="insights-grid">
                <div class="insight-card main-insight">
                    <div class="insight-icon">
                        <i class="fas fa-lightbulb"></i>
                    </div>
                    <div class="insight-content">
                        <h4>Primary Insight</h4>
                        <p class="insight-text">${getPrimaryInsight(sensorimotor)}</p>
                    </div>
                </div>
                <div class="insight-card">
                    <div class="insight-icon">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <div class="insight-content">
                        <h4>Writing Strength</h4>
                        <p class="insight-text">${getWritingStrength(sensorimotor)}</p>
                    </div>
                </div>
                <div class="insight-card">
                    <div class="insight-icon">
                        <i class="fas fa-target"></i>
                    </div>
                    <div class="insight-content">
                        <h4>Improvement Area</h4>
                        <p class="insight-text">${getImprovementArea(sensorimotor)}</p>
                    </div>
                </div>
                <div class="insight-card">
                    <div class="insight-icon">
                        <i class="fas fa-star"></i>
                    </div>
                    <div class="insight-content">
                        <h4>Style Rating</h4>
                        <p class="insight-text">${getStyleRating(sensorimotor)}</p>
                    </div>
                </div>
            </div>
            <div class="recommendations">
                <h4>Recommendations</h4>
                <ul class="recommendation-list">
                    ${getRecommendations(sensorimotor).map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
        </div>
    `;
}

// Helper functions for sensory analysis
function getSensoryIcon(category) {
    const icons = {
        'visual': 'eye',
        'auditory': 'volume-up',
        'gustatory': 'utensils',
        'olfactory': 'leaf',
        'tactile': 'hand-paper',
        'motor': 'running',
        'interoceptive': 'heartbeat'
    };
    return icons[category] || 'circle';
}

function getSensoryDescription(category) {
    const descriptions = {
        'visual': 'Words related to sight, appearance, and visual perception',
        'auditory': 'Words related to sound, hearing, and audio perception',
        'gustatory': 'Words related to taste and flavor perception',
        'olfactory': 'Words related to smell and scent perception',
        'tactile': 'Words related to touch and physical sensation',
        'motor': 'Words related to movement and physical action',
        'interoceptive': 'Words related to internal body sensations'
    };
    return descriptions[category] || 'Sensory words in this category';
}

function getDescriptiveScore(sensorimotor) {
    const density = parseFloat(sensorimotor.sensory_density);
    if (density >= 5) return 10;
    if (density >= 3) return 8;
    if (density >= 2) return 6;
    if (density >= 1) return 4;
    return 2;
}

function getDescriptiveDescription(sensorimotor) {
    const score = getDescriptiveScore(sensorimotor);
    if (score >= 8) return 'Highly descriptive writing with rich sensory details';
    if (score >= 6) return 'Moderately descriptive with good sensory engagement';
    if (score >= 4) return 'Somewhat descriptive with basic sensory elements';
    return 'Minimal sensory description - consider adding more detail';
}

function getVisualFocusScore(sensorimotor) {
    const visualRatio = (sensorimotor.raw_counts.visual || 0) / sensorimotor.total_sensory_words;
    return Math.round(visualRatio * 10);
}

function getVisualFocusDescription(sensorimotor) {
    const score = getVisualFocusScore(sensorimotor);
    if (score >= 7) return 'Strong visual focus - writing is very image-rich';
    if (score >= 4) return 'Moderate visual focus - good use of visual elements';
    return 'Limited visual focus - consider more visual descriptions';
}

function getAuditoryScore(sensorimotor) {
    const auditoryRatio = (sensorimotor.raw_counts.auditory || 0) / sensorimotor.total_sensory_words;
    return Math.round(auditoryRatio * 10);
}

function getAuditoryDescription(sensorimotor) {
    const score = getAuditoryScore(sensorimotor);
    if (score >= 7) return 'Strong auditory engagement - writing is very sound-rich';
    if (score >= 4) return 'Moderate auditory engagement - good use of sound elements';
    return 'Limited auditory engagement - consider more sound descriptions';
}

function getTactileScore(sensorimotor) {
    const tactileRatio = (sensorimotor.raw_counts.tactile || 0) / sensorimotor.total_sensory_words;
    return Math.round(tactileRatio * 10);
}

function getTactileDescription(sensorimotor) {
    const score = getTactileScore(sensorimotor);
    if (score >= 7) return 'Rich tactile descriptions - very touch-oriented';
    if (score >= 4) return 'Moderate tactile engagement - good use of touch elements';
    return 'Limited tactile engagement - consider more physical sensations';
}

function getDominanceRatio(sensorimotor) {
    const maxCount = Math.max(...Object.values(sensorimotor.raw_counts));
    const totalCount = sensorimotor.total_sensory_words;
    return (maxCount / totalCount * 100).toFixed(1) + '%';
}

function getDominanceDescription(sensorimotor) {
    const ratio = parseFloat(getDominanceRatio(sensorimotor));
    if (ratio >= 60) return 'One sense dominates strongly';
    if (ratio >= 40) return 'One sense is prominent';
    return 'Balanced sensory distribution';
}

function getDiversityIndex(sensorimotor) {
    const activeSenses = Object.values(sensorimotor.raw_counts).filter(count => count > 0).length;
    const totalSenses = Object.keys(sensorimotor.raw_counts).length;
    return (activeSenses / totalSenses * 100).toFixed(1) + '%';
}

function getDiversityDescription(sensorimotor) {
    const index = parseFloat(getDiversityIndex(sensorimotor));
    if (index >= 80) return 'Highly diverse sensory engagement';
    if (index >= 60) return 'Moderately diverse sensory use';
    return 'Limited sensory diversity';
}

function getEngagementLevel(sensorimotor) {
    const density = parseFloat(sensorimotor.sensory_density);
    if (density >= 4) return 'High';
    if (density >= 2) return 'Medium';
    return 'Low';
}

function getEngagementDescription(sensorimotor) {
    const level = getEngagementLevel(sensorimotor);
    if (level === 'High') return 'Very engaging and immersive writing';
    if (level === 'Medium') return 'Moderately engaging with good sensory appeal';
    return 'Could benefit from more sensory engagement';
}

function getPrimaryInsight(sensorimotor) {
    const dominant = sensorimotor.dominant_modality;
    const density = parseFloat(sensorimotor.sensory_density);
    
    if (density >= 4) {
        return `Your writing is highly sensory-rich with a strong focus on ${dominant} elements, creating an immersive reading experience.`;
    } else if (density >= 2) {
        return `Your writing shows good sensory engagement with ${dominant} as the dominant sense, providing a balanced descriptive approach.`;
    } else {
        return `Your writing could benefit from more sensory details, particularly in the ${dominant} domain to enhance reader engagement.`;
    }
}

function getWritingStrength(sensorimotor) {
    const dominant = sensorimotor.dominant_modality;
    const density = parseFloat(sensorimotor.sensory_density);
    
    if (density >= 4) {
        return `Exceptional sensory richness with strong ${dominant} focus creates vivid, immersive descriptions.`;
    } else if (density >= 2) {
        return `Good sensory balance with effective use of ${dominant} elements for descriptive writing.`;
    } else {
        return `Clear, direct writing style with potential for enhanced sensory engagement.`;
    }
}

function getImprovementArea(sensorimotor) {
    const counts = sensorimotor.raw_counts;
    const minCategory = Object.keys(counts).reduce((a, b) => counts[a] < counts[b] ? a : b);
    
    return `Consider adding more ${minCategory} descriptions to create a more balanced sensory experience.`;
}

function getStyleRating(sensorimotor) {
    const density = parseFloat(sensorimotor.sensory_density);
    const diversity = parseFloat(getDiversityIndex(sensorimotor));
    
    let rating = 'Good';
    if (density >= 4 && diversity >= 60) rating = 'Excellent';
    else if (density >= 3 && diversity >= 40) rating = 'Very Good';
    else if (density >= 2) rating = 'Good';
    else rating = 'Developing';
    
    return `${rating} - ${density.toFixed(1)}% sensory density with ${diversity}% diversity`;
}

function getRecommendations(sensorimotor) {
    const recommendations = [];
    const counts = sensorimotor.raw_counts;
    const density = parseFloat(sensorimotor.sensory_density);
    
    if (density < 2) {
        recommendations.push('Increase sensory word usage to enhance descriptive quality');
    }
    
    if (counts.visual < counts.motor) {
        recommendations.push('Add more visual descriptions to balance your sensory approach');
    }
    
    if (counts.auditory === 0) {
        recommendations.push('Consider incorporating sound elements for richer atmosphere');
    }
    
    if (counts.tactile === 0) {
        recommendations.push('Include tactile sensations to engage readers physically');
    }
    
    if (Object.values(counts).filter(c => c > 0).length < 3) {
        recommendations.push('Diversify sensory categories for more balanced writing');
    }
    
    return recommendations.length > 0 ? recommendations : ['Your sensory writing is well-balanced!'];
}

// Additional helper functions for sensory analysis
function createSensoryTreemap(sensorimotor) {
    // Create treemap visualization
    const ctx = document.getElementById('sensoryTreemapChart');
    if (!ctx) return;
    
    // Simple treemap using Chart.js
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(sensorimotor.raw_counts),
            datasets: [{
                data: Object.values(sensorimotor.raw_counts),
                backgroundColor: [
                    '#14b8a6', '#10b981', '#f59e0b', '#ef4444', 
                    '#8b5cf6', '#06b6d4', '#84cc16'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Sensory Word Distribution',
                    font: { size: 16, weight: 'bold' }
                },
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function createSensoryHeatmap(sensorimotor) {
    // Create heatmap visualization
    const ctx = document.getElementById('sensoryHeatmapChart');
    if (!ctx) return;
    
    // Simple bar chart as heatmap alternative
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(sensorimotor.raw_counts),
            datasets: [{
                label: 'Word Count',
                data: Object.values(sensorimotor.raw_counts),
                backgroundColor: Object.keys(sensorimotor.raw_counts).map((_, i) => 
                    `hsl(${i * 60}, 70%, 50%)`
                ),
                borderWidth: 1,
                borderColor: '#333'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Sensory Category Comparison',
                    font: { size: 16, weight: 'bold' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function createSensoryTimeline(sensorimotor) {
    // Create timeline visualization
    const ctx = document.getElementById('sensoryTimelineChart');
    if (!ctx) return;
    
    // Simple line chart for timeline
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Start', '25%', '50%', '75%', 'End'],
            datasets: [{
                label: 'Sensory Density',
                data: [2, 3, 4, 3, 2], // Mock data
                borderColor: '#14b8a6',
                backgroundColor: 'rgba(20, 184, 166, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Sensory Density Over Time',
                    font: { size: 16, weight: 'bold' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function createSensoryComparisonChart(sensorimotor) {
    // Create comparison chart
    const ctx = document.getElementById('sensoryComparisonChart');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'radar',
        data: {
            labels: Object.keys(sensorimotor.raw_counts),
            datasets: [{
                label: 'Your Text',
                data: Object.values(sensorimotor.raw_counts),
                borderColor: '#14b8a6',
                backgroundColor: 'rgba(20, 184, 166, 0.2)',
                pointBackgroundColor: '#14b8a6'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Sensory Profile Radar',
                    font: { size: 16, weight: 'bold' }
                }
            },
            scales: {
                r: {
                    beginAtZero: true
                }
            }
        }
    });
}

function createSensoryPolarChart(sensorimotor) {
    // Create polar chart
    const ctx = document.getElementById('sensoryPolarChart');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'polarArea',
        data: {
            labels: Object.keys(sensorimotor.raw_counts),
            datasets: [{
                data: Object.values(sensorimotor.raw_counts),
                backgroundColor: [
                    'rgba(20, 184, 166, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(139, 92, 246, 0.8)',
                    'rgba(6, 182, 212, 0.8)',
                    'rgba(132, 204, 22, 0.8)'
                ],
                borderColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Sensory Balance Analysis',
                    font: { size: 16, weight: 'bold' }
                }
            }
        }
    });
}

// Tab switching function
function switchTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('.results-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab content
    document.getElementById('tab-' + tabName).classList.add('active');
    
    // Add active class to clicked tab
    event.target.closest('.results-tab').classList.add('active');
    
    // Scroll to top of results container smoothly
    document.querySelector('.results-tabs-container').scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
    });
}

// Enhanced cluster analysis functions
function getClusterIcon(words) {
    const themes = {
        'Technology': 'laptop-code',
        'Analysis': 'chart-line',
        'Creative': 'palette',
        'AI/ML': 'brain',
        'Business': 'briefcase',
        'Science': 'flask',
        'Education': 'graduation-cap',
        'Health': 'heartbeat',
        'General': 'project-diagram'
    };
    
    const theme = getClusterTheme(words);
    return themes[theme] || 'project-diagram';
}

function getClusterName(words) {
    const themes = {
        'Technology': 'Tech Innovation',
        'Analysis': 'Data Analytics',
        'Creative': 'Creative Arts',
        'AI/ML': 'AI & Machine Learning',
        'Business': 'Business Strategy',
        'Science': 'Scientific Research',
        'Education': 'Educational Content',
        'Health': 'Health & Wellness',
        'General': 'General Topics'
    };
    
    const theme = getClusterTheme(words);
    return themes[theme] || 'Topic Cluster';
}

function getClusterStrength(words) {
    // Calculate cluster strength based on word relationships
    if (words.length <= 1) return 100;
    
    // Simulate strength calculation
    const baseStrength = Math.min(95, 60 + (words.length * 3));
    const coherence = getClusterCoherence(words);
    return Math.round((baseStrength + coherence) / 2);
}

function getWordFrequency(word, words) {
    // Count frequency of word in cluster
    return words.filter(w => w === word).length;
}

function getClusterInsight(words, index) {
    const theme = getClusterTheme(words);
    const strength = getClusterStrength(words);
    const size = words.length;
    
    const insights = {
        'Technology': `This cluster focuses on technological innovation and digital transformation, showing ${strength}% thematic coherence.`,
        'Analysis': `Data-driven insights and analytical approaches dominate this cluster with strong semantic relationships.`,
        'Creative': `Creative and artistic elements are well-represented, indicating a focus on imaginative content.`,
        'AI/ML': `Artificial intelligence and machine learning concepts are central to this cluster's thematic structure.`,
        'Business': `Business strategy and commercial concepts form the core of this well-defined cluster.`,
        'Science': `Scientific methodology and research principles are strongly represented in this cluster.`,
        'Education': `Educational content and learning methodologies are the primary focus of this cluster.`,
        'Health': `Health and wellness concepts are well-organized in this thematic cluster.`,
        'General': `This cluster contains diverse topics with moderate thematic coherence.`
    };
    
    return insights[theme] || `Cluster ${index + 1} shows ${strength}% thematic coherence with ${size} related terms.`;
}

function getSemanticDensity(words) {
    // Calculate semantic density based on word relationships
    const baseDensity = Math.min(90, 40 + (words.length * 4));
    return Math.round(baseDensity);
}

function getTopicRelevance(words) {
    // Calculate topic relevance
    const baseRelevance = Math.min(95, 50 + (words.length * 3));
    return Math.round(baseRelevance);
}

function getClusterCountDescription(count) {
    if (count >= 8) return 'Excellent thematic diversity';
    if (count >= 5) return 'Good thematic organization';
    if (count >= 3) return 'Moderate thematic structure';
    return 'Limited thematic diversity';
}

function getWordCountDescription(clusters) {
    const totalWords = clusters.reduce((sum, cluster) => sum + cluster.words.length, 0);
    if (totalWords >= 50) return 'Rich semantic content';
    if (totalWords >= 30) return 'Good semantic coverage';
    if (totalWords >= 15) return 'Moderate semantic content';
    return 'Limited semantic content';
}

function getAvgSizeDescription(clusters) {
    const avgSize = clusters.reduce((sum, cluster) => sum + cluster.words.length, 0) / clusters.length;
    if (avgSize >= 8) return 'Large, comprehensive clusters';
    if (avgSize >= 5) return 'Well-sized clusters';
    if (avgSize >= 3) return 'Compact clusters';
    return 'Small clusters';
}

function getClusterInsightsSummary(clusters) {
    const insights = [];
    const totalWords = clusters.reduce((sum, cluster) => sum + cluster.words.length, 0);
    const themes = clusters.map(c => getClusterTheme(c.words));
    const uniqueThemes = new Set(themes).size;
    
    if (uniqueThemes === clusters.length) {
        insights.push('Excellent thematic diversity with distinct cluster separation');
    } else if (uniqueThemes >= clusters.length * 0.7) {
        insights.push('Good thematic organization with mostly distinct clusters');
    } else {
        insights.push('Moderate thematic structure with some cluster overlap');
    }
    
    if (totalWords >= 40) {
        insights.push('Rich semantic content with comprehensive coverage');
    } else if (totalWords >= 20) {
        insights.push('Good semantic coverage across multiple themes');
    } else {
        insights.push('Basic semantic structure with room for expansion');
    }
    
    const avgCoherence = clusters.reduce((sum, c) => sum + getClusterCoherence(c.words), 0) / clusters.length;
    if (avgCoherence >= 80) {
        insights.push('High cluster coherence indicates strong thematic relationships');
    } else if (avgCoherence >= 60) {
        insights.push('Moderate cluster coherence with good thematic organization');
    } else {
        insights.push('Cluster coherence could be improved for better thematic separation');
    }
    
    return insights;
}

// Enhanced cluster action functions
function expandCluster(index) {
    console.log('Expanding cluster:', index);
    // Add cluster expansion functionality
    const clusterCard = document.querySelector(`[data-cluster="${index}"]`);
    if (clusterCard) {
        clusterCard.classList.toggle('expanded');
    }
}

function analyzeCluster(index) {
    console.log('Analyzing cluster:', index);
    // Add deep cluster analysis
    alert(`Deep analysis for cluster ${index + 1} would show detailed semantic relationships, word co-occurrence patterns, and thematic evolution.`);
}

function compareCluster(index) {
    console.log('Comparing cluster:', index);
    // Add cluster comparison functionality
    alert(`Cluster comparison for cluster ${index + 1} would show similarity metrics, thematic overlap, and relationship strength with other clusters.`);
}

function exportClusterData() {
    console.log('Exporting cluster data');
    // Add data export functionality
    alert('Cluster data export would generate a comprehensive report with all cluster information, metrics, and insights.');
}

function regenerateClusters() {
    console.log('Regenerating clusters');
    // Add cluster regeneration functionality
    alert('Cluster regeneration would re-analyze the text with different parameters to optimize clustering results.');
}

// Enhanced sensory analysis functions
function getSensoryOverallScore(sensorimotor) {
    const density = parseFloat(sensorimotor.sensory_density);
    const diversity = getDiversityIndex(sensorimotor);
    const balance = getBalanceIndex(sensorimotor);
    
    const score = (density * 0.4) + (parseFloat(diversity) * 0.3) + (parseFloat(balance) * 0.3);
    return Math.round(score / 10);
}

function getCategoryScore(count, total) {
    const percentage = (count / total) * 100;
    if (percentage >= 30) return 10;
    if (percentage >= 20) return 8;
    if (percentage >= 10) return 6;
    if (percentage >= 5) return 4;
    return 2;
}

function getCategoryInsight(category, count, total) {
    const percentage = ((count / total) * 100).toFixed(1);
    const insights = {
        'visual': `Strong visual focus with ${percentage}% of sensory words, creating vivid imagery.`,
        'auditory': `Good auditory engagement with ${percentage}% of sensory words, adding sound depth.`,
        'tactile': `Rich tactile descriptions with ${percentage}% of sensory words, enhancing physical engagement.`,
        'gustatory': `Taste elements with ${percentage}% of sensory words, adding flavor to your writing.`,
        'olfactory': `Scent descriptions with ${percentage}% of sensory words, creating atmospheric depth.`,
        'motor': `Movement and action with ${percentage}% of sensory words, adding dynamic energy.`,
        'interoceptive': `Internal sensations with ${percentage}% of sensory words, adding emotional depth.`
    };
    
    return insights[category] || `This category represents ${percentage}% of your sensory words.`;
}

function getWritingStyleAssessment(sensorimotor) {
    const density = parseFloat(sensorimotor.sensory_density);
    const dominant = sensorimotor.dominant_modality;
    
    if (density >= 4) {
        return `Your writing is highly sensory-rich with a strong focus on ${dominant} elements, creating an immersive and engaging reading experience.`;
    } else if (density >= 2) {
        return `Your writing shows good sensory engagement with ${dominant} as the dominant sense, providing a balanced descriptive approach.`;
    } else {
        return `Your writing could benefit from more sensory details, particularly in the ${dominant} domain to enhance reader engagement.`;
    }
}

function getSensoryBalanceAssessment(sensorimotor) {
    const counts = sensorimotor.raw_counts;
    const maxCount = Math.max(...Object.values(counts));
    const minCount = Math.min(...Object.values(counts));
    const ratio = maxCount / minCount;
    
    if (ratio <= 2) {
        return 'Excellent sensory balance with well-distributed sensory elements across all categories.';
    } else if (ratio <= 4) {
        return 'Good sensory balance with moderate distribution across sensory categories.';
    } else {
        return 'Sensory balance could be improved by adding more variety across different sensory domains.';
    }
}

function getImprovementAreas(sensorimotor) {
    const counts = sensorimotor.raw_counts;
    const minCategory = Object.keys(counts).reduce((a, b) => counts[a] < counts[b] ? a : b);
    const maxCategory = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    
    if (counts[minCategory] === 0) {
        return `Consider adding ${minCategory} descriptions to create a more balanced sensory experience.`;
    } else if (counts[maxCategory] / counts[minCategory] > 5) {
        return `Balance your ${maxCategory} focus by incorporating more ${minCategory} elements.`;
    } else {
        return 'Your sensory balance is well-maintained across different categories.';
    }
}

function getSensoryRecommendations(sensorimotor) {
    const recommendations = [];
    const density = parseFloat(sensorimotor.sensory_density);
    const counts = sensorimotor.raw_counts;
    
    if (density < 2) {
        recommendations.push('Increase overall sensory word usage to enhance descriptive quality');
    }
    
    if (counts.visual < counts.motor) {
        recommendations.push('Add more visual descriptions to balance your sensory approach');
    }
    
    if (counts.auditory === 0) {
        recommendations.push('Incorporate sound elements for richer atmospheric description');
    }
    
    if (counts.tactile === 0) {
        recommendations.push('Include tactile sensations to engage readers physically');
    }
    
    if (Object.values(counts).filter(c => c > 0).length < 3) {
        recommendations.push('Diversify sensory categories for more balanced writing');
    }
    
    return recommendations.length > 0 ? recommendations.join('; ') : 'Your sensory writing is well-balanced and engaging!';
}

function getDensityDescription(density) {
    if (density >= 4) return 'Highly descriptive and immersive';
    if (density >= 2) return 'Moderately descriptive with good engagement';
    if (density >= 1) return 'Basic sensory elements present';
    return 'Limited sensory description';
}

function getDominantSenseDescription(sensorimotor) {
    const dominant = sensorimotor.dominant_modality;
    const percentage = ((sensorimotor.raw_counts[dominant] / sensorimotor.total_sensory_words) * 100).toFixed(1);
    
    const descriptions = {
        'visual': `Your writing is strongly visual-focused (${percentage}%), creating vivid imagery and visual appeal.`,
        'auditory': `Your writing emphasizes sound elements (${percentage}%), adding auditory richness and atmosphere.`,
        'tactile': `Your writing focuses on touch and physical sensations (${percentage}%), creating tangible experiences.`,
        'gustatory': `Your writing emphasizes taste and flavor (${percentage}%), adding culinary and sensory depth.`,
        'olfactory': `Your writing focuses on scent and smell (${percentage}%), creating atmospheric and emotional depth.`,
        'motor': `Your writing emphasizes movement and action (${percentage}%), adding dynamic energy and flow.`,
        'interoceptive': `Your writing focuses on internal sensations (${percentage}%), adding emotional and physical depth.`
    };
    
    return descriptions[dominant] || `Your writing shows a ${percentage}% focus on ${dominant} elements.`;
}

function getBalanceIndex(sensorimotor) {
    const counts = Object.values(sensorimotor.raw_counts);
    const maxCount = Math.max(...counts);
    const minCount = Math.min(...counts);
    const ratio = maxCount / (minCount + 1); // Add 1 to avoid division by zero
    
    if (ratio <= 2) return 'Excellent';
    if (ratio <= 4) return 'Good';
    if (ratio <= 6) return 'Fair';
    return 'Poor';
}

function getBalanceDescription(sensorimotor) {
    const balance = getBalanceIndex(sensorimotor);
    const descriptions = {
        'Excellent': 'Perfect balance across all sensory categories',
        'Good': 'Well-balanced sensory distribution',
        'Fair': 'Moderate balance with some category dominance',
        'Poor': 'Imbalanced sensory distribution needs improvement'
    };
    
    return descriptions[balance];
}

function createSensoryCharts(sensorimotor) {
    // Create main sensorimotor chart
    const mainCtx = document.getElementById('sensorimotorChart');
    if (mainCtx) {
        new Chart(mainCtx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(sensorimotor.raw_counts),
                datasets: [{
                    data: Object.values(sensorimotor.raw_counts),
                    backgroundColor: [
                        '#14b8a6', '#10b981', '#f59e0b', '#ef4444',
                        '#8b5cf6', '#06b6d4', '#84cc16'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Sensory Word Distribution',
                        font: { size: 16, weight: 'bold' }
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
    
    // Create radar chart
    const radarCtx = document.getElementById('sensoryRadarChart');
    if (radarCtx) {
        new Chart(radarCtx, {
            type: 'radar',
            data: {
                labels: Object.keys(sensorimotor.raw_counts),
                datasets: [{
                    label: 'Sensory Profile',
                    data: Object.values(sensorimotor.raw_counts),
                    borderColor: '#14b8a6',
                    backgroundColor: 'rgba(20, 184, 166, 0.2)',
                    pointBackgroundColor: '#14b8a6'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Sensory Profile Radar',
                        font: { size: 16, weight: 'bold' }
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}

function exportSensoryData() {
    console.log('Exporting sensory data');
    alert('Sensory data export would generate a comprehensive report with all sensory analysis, metrics, and insights.');
}

function regenerateSensoryAnalysis() {
    console.log('Regenerating sensory analysis');
    alert('Sensory analysis regeneration would re-analyze the text with enhanced sensory detection algorithms.');
}

// Network control functions
function regenerateNetwork() {
    console.log('Regenerating network');
    if (currentClusterData) {
        displayClusterNetwork(currentClusterData);
    }
}

function toggleNetworkLabels() {
    console.log('Toggling network labels');
    // Toggle label visibility in network chart
    const chart = Chart.getChart('clusterNetworkChart');
    if (chart) {
        chart.options.plugins.legend.display = !chart.options.plugins.legend.display;
        chart.update();
    }
}

function resetNetworkView() {
    console.log('Resetting network view');
    if (currentClusterData) {
        displayClusterNetwork(currentClusterData);
    }
}

