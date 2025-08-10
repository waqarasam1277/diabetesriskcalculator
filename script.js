// Import Supabase client
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js';

// Configuration
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
const OPENAI_API_KEY = 'YOUR_OPENAI_API_KEY';

// Initialize Supabase client
let supabase = null;
let currentUser = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadPatients();
});

function initializeApp() {
    // Initialize Supabase if credentials are provided
    if (SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY') {
        supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    
    // Check for existing session
    checkAuthStatus();
}

function setupEventListeners() {
    // Navigation
    document.getElementById('calculatorTab').addEventListener('click', () => showSection('calculator'));
    document.getElementById('patientsTab').addEventListener('click', () => showSection('patients'));
    
    // Login modal
    document.getElementById('loginBtn').addEventListener('click', showLoginModal);
    document.getElementById('closeLogin').addEventListener('click', hideLoginModal);
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Patient form
    document.getElementById('patientForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('clearForm').addEventListener('click', clearForm);
    
    // Results actions
    document.getElementById('saveResults').addEventListener('click', saveResults);
    document.getElementById('exportResults').addEventListener('click', exportResults);
    
    // Patient management
    document.getElementById('searchPatients').addEventListener('input', filterPatients);
    document.getElementById('exportAllBtn').addEventListener('click', exportAllPatients);
    
    // Real-time calculation
    const inputs = ['weight', 'height', 'glucose', 'triglycerides', 'hdl'];
    inputs.forEach(id => {
        document.getElementById(id).addEventListener('input', debounce(calculateRealTime, 500));
    });
}

function showSection(section) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
    
    // Show selected section
    document.getElementById(section + 'Section').classList.remove('hidden');
    
    // Update navigation
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    document.getElementById(section + 'Tab').classList.add('active');
    
    if (section === 'patients') {
        loadPatients();
    }
}

function showLoginModal() {
    document.getElementById('loginModal').classList.remove('hidden');
}

function hideLoginModal() {
    document.getElementById('loginModal').classList.add('hidden');
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!supabase) {
        // Mock authentication for demo
        currentUser = { email: email };
        updateAuthUI();
        hideLoginModal();
        showToast('Logged in successfully (Demo Mode)', 'success');
        return;
    }
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        currentUser = data.user;
        updateAuthUI();
        hideLoginModal();
        showToast('Logged in successfully', 'success');
    } catch (error) {
        showToast('Login failed: ' + error.message, 'error');
    }
}

function checkAuthStatus() {
    if (supabase) {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                currentUser = session.user;
                updateAuthUI();
            }
        });
    }
}

function updateAuthUI() {
    const loginBtn = document.getElementById('loginBtn');
    if (currentUser) {
        loginBtn.innerHTML = '<i class="fas fa-user mr-2"></i>Logout';
        loginBtn.onclick = logout;
    } else {
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>Login';
        loginBtn.onclick = showLoginModal;
    }
}

async function logout() {
    if (supabase) {
        await supabase.auth.signOut();
    }
    currentUser = null;
    updateAuthUI();
    showToast('Logged out successfully', 'success');
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = getFormData();
    if (!validateFormData(formData)) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    const calculations = calculateMetrics(formData);
    const riskCategory = categorizeRisk(calculations.tygIndex);
    
    displayResults(calculations, riskCategory);
    
    // Generate AI recommendations
    generateAIRecommendations(formData, calculations, riskCategory);
}

function getFormData() {
    return {
        fullName: document.getElementById('fullName').value,
        age: parseInt(document.getElementById('age').value),
        gender: document.getElementById('gender').value,
        weight: parseFloat(document.getElementById('weight').value),
        height: parseFloat(document.getElementById('height').value),
        glucose: parseFloat(document.getElementById('glucose').value),
        triglycerides: parseFloat(document.getElementById('triglycerides').value),
        hdl: parseFloat(document.getElementById('hdl').value),
        hba1c: parseFloat(document.getElementById('hba1c').value),
        diabetes: document.getElementById('diabetes').value
    };
}

function validateFormData(data) {
    const required = ['fullName', 'age', 'gender', 'weight', 'height', 'glucose', 'triglycerides', 'hdl', 'hba1c', 'diabetes'];
    return required.every(field => data[field] !== '' && data[field] !== null && !isNaN(data[field]) || field === 'fullName' || field === 'gender' || field === 'diabetes');
}

function calculateMetrics(data) {
    // BMI = weight / (height²)
    const bmi = data.weight / (data.height * data.height);
    
    // TyG Index = ln((Fasting Glucose × Triglycerides) / 2)
    const tygIndex = Math.log((data.glucose * data.triglycerides) / 2);
    
    // TG/HDL Ratio = Triglycerides / HDL
    const tgHdlRatio = data.triglycerides / data.hdl;
    
    return {
        bmi: Math.round(bmi * 10) / 10,
        tygIndex: Math.round(tygIndex * 100) / 100,
        tgHdlRatio: Math.round(tgHdlRatio * 100) / 100
    };
}

function categorizeRisk(tygIndex) {
    if (tygIndex < 8.0) {
        return {
            level: 'Low Risk',
            description: 'Low metabolic disorder risk',
            color: 'bg-green-100 border-green-200 text-green-800',
            colorClass: 'success'
        };
    } else if (tygIndex <= 8.5) {
        return {
            level: 'Moderate Risk',
            description: 'Moderate metabolic disorder risk - monitoring recommended',
            color: 'bg-yellow-100 border-yellow-200 text-yellow-800',
            colorClass: 'warning'
        };
    } else {
        return {
            level: 'High Risk',
            description: 'High metabolic disorder risk - immediate attention required',
            color: 'bg-red-100 border-red-200 text-red-800',
            colorClass: 'danger'
        };
    }
}

function displayResults(calculations, riskCategory) {
    // Show results container
    document.getElementById('resultsContainer').classList.remove('hidden');
    document.getElementById('noResults').classList.add('hidden');
    
    // Update calculated values
    document.getElementById('bmiValue').textContent = calculations.bmi;
    document.getElementById('tygValue').textContent = calculations.tygIndex;
    document.getElementById('ratioValue').textContent = calculations.tgHdlRatio;
    
    // Update risk category
    const riskElement = document.getElementById('riskCategory');
    riskElement.className = `p-4 rounded-lg mb-6 text-center border ${riskCategory.color}`;
    document.getElementById('riskLevel').textContent = riskCategory.level;
    document.getElementById('riskDescription').textContent = riskCategory.description;
}

async function generateAIRecommendations(formData, calculations, riskCategory) {
    const aiContainer = document.getElementById('aiRecommendations');
    
    // Show loading state
    aiContainer.innerHTML = `
        <div class="flex items-center justify-center py-4">
            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
            Generating personalized recommendations...
        </div>
    `;
    
    try {
        let recommendations;
        
        if (OPENAI_API_KEY !== 'YOUR_OPENAI_API_KEY') {
            // Use OpenAI API
            recommendations = await getOpenAIRecommendations(formData, calculations, riskCategory);
        } else {
            // Use mock recommendations for demo
            recommendations = getMockRecommendations(formData, calculations, riskCategory);
        }
        
        aiContainer.innerHTML = recommendations;
    } catch (error) {
        console.error('Error generating recommendations:', error);
        aiContainer.innerHTML = `
            <div class="text-red-600">
                <i class="fas fa-exclamation-triangle mr-2"></i>
                Unable to generate AI recommendations. Please try again.
            </div>
        `;
    }
}

async function getOpenAIRecommendations(formData, calculations, riskCategory) {
    const prompt = `
    As a medical AI assistant, provide personalized health recommendations for a patient with the following profile:
    
    Patient: ${formData.age}-year-old ${formData.gender}
    BMI: ${calculations.bmi}
    TyG Index: ${calculations.tygIndex}
    TG/HDL Ratio: ${calculations.tgHdlRatio}
    HbA1c: ${formData.hba1c}%
    Diabetes Status: ${formData.diabetes}
    Risk Level: ${riskCategory.level}
    
    Please provide specific recommendations for:
    1. Dietary modifications
    2. Exercise recommendations
    3. Follow-up tests or monitoring
    4. Lifestyle changes
    
    Use a professional medical tone and be specific with actionable advice.
    `;
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 500,
            temperature: 0.7
        })
    });
    
    const data = await response.json();
    return formatRecommendations(data.choices[0].message.content);
}

function getMockRecommendations(formData, calculations, riskCategory) {
    const recommendations = [];
    
    // BMI-based recommendations
    if (calculations.bmi > 25) {
        recommendations.push("**Weight Management**: Consider a structured weight loss program targeting 5-10% body weight reduction through caloric restriction and increased physical activity.");
    }
    
    // TyG Index recommendations
    if (calculations.tygIndex > 8.0) {
        recommendations.push("**Metabolic Health**: Focus on low-glycemic index foods, reduce refined carbohydrates, and consider Mediterranean-style diet patterns.");
    }
    
    // TG/HDL ratio recommendations
    if (calculations.tgHdlRatio > 3.5) {
        recommendations.push("**Lipid Management**: Increase omega-3 fatty acids, reduce saturated fats, and consider aerobic exercise 150+ minutes per week.");
    }
    
    // HbA1c recommendations
    if (formData.hba1c > 6.5) {
        recommendations.push("**Glucose Control**: Monitor blood glucose regularly, consider continuous glucose monitoring, and maintain consistent meal timing.");
    }
    
    // General recommendations
    recommendations.push("**Follow-up**: Schedule follow-up in 3-6 months to reassess metabolic markers and adjust treatment plan as needed.");
    
    return formatRecommendations(recommendations.join('\n\n'));
}

function formatRecommendations(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
        .replace(/^/, '<p>')
        .replace(/$/, '</p>');
}

function calculateRealTime() {
    const weight = parseFloat(document.getElementById('weight').value);
    const height = parseFloat(document.getElementById('height').value);
    const glucose = parseFloat(document.getElementById('glucose').value);
    const triglycerides = parseFloat(document.getElementById('triglycerides').value);
    const hdl = parseFloat(document.getElementById('hdl').value);
    
    if (weight && height && glucose && triglycerides && hdl) {
        const calculations = calculateMetrics({
            weight, height, glucose, triglycerides, hdl
        });
        
        // Update preview values
        document.getElementById('bmiValue').textContent = calculations.bmi;
        document.getElementById('tygValue').textContent = calculations.tygIndex;
        document.getElementById('ratioValue').textContent = calculations.tgHdlRatio;
        
        // Show results container
        document.getElementById('resultsContainer').classList.remove('hidden');
        document.getElementById('noResults').classList.add('hidden');
    }
}

async function saveResults() {
    if (!currentUser) {
        showToast('Please login to save results', 'error');
        return;
    }
    
    const formData = getFormData();
    const calculations = calculateMetrics(formData);
    const riskCategory = categorizeRisk(calculations.tygIndex);
    const aiRecommendations = document.getElementById('aiRecommendations').innerHTML;
    
    const patientRecord = {
        ...formData,
        ...calculations,
        risk_level: riskCategory.level,
        risk_description: riskCategory.description,
        ai_recommendations: aiRecommendations,
        created_at: new Date().toISOString(),
        created_by: currentUser.email
    };
    
    try {
        if (supabase) {
            const { error } = await supabase
                .from('patient_records')
                .insert([patientRecord]);
            
            if (error) throw error;
        } else {
            // Save to localStorage for demo
            const records = JSON.parse(localStorage.getItem('patientRecords') || '[]');
            records.push({ ...patientRecord, id: Date.now() });
            localStorage.setItem('patientRecords', JSON.stringify(records));
        }
        
        showToast('Patient record saved successfully', 'success');
        loadPatients();
    } catch (error) {
        console.error('Error saving record:', error);
        showToast('Error saving record: ' + error.message, 'error');
    }
}

function exportResults() {
    const formData = getFormData();
    const calculations = calculateMetrics(formData);
    const riskCategory = categorizeRisk(calculations.tygIndex);
    
    const csvContent = [
        ['Field', 'Value'],
        ['Patient Name', formData.fullName],
        ['Age', formData.age],
        ['Gender', formData.gender],
        ['Weight (kg)', formData.weight],
        ['Height (m)', formData.height],
        ['BMI', calculations.bmi],
        ['Fasting Glucose (mg/dL)', formData.glucose],
        ['Triglycerides (mg/dL)', formData.triglycerides],
        ['HDL (mg/dL)', formData.hdl],
        ['TyG Index', calculations.tygIndex],
        ['TG/HDL Ratio', calculations.tgHdlRatio],
        ['HbA1c (%)', formData.hba1c],
        ['Diabetes Status', formData.diabetes],
        ['Risk Level', riskCategory.level],
        ['Risk Description', riskCategory.description],
        ['Date', new Date().toLocaleDateString()]
    ].map(row => row.join(',')).join('\n');
    
    downloadCSV(csvContent, `${formData.fullName}_metabolic_assessment.csv`);
}

async function loadPatients() {
    const tableBody = document.getElementById('patientsTableBody');
    const noPatients = document.getElementById('noPatients');
    
    try {
        let records = [];
        
        if (supabase) {
            const { data, error } = await supabase
                .from('patient_records')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            records = data || [];
        } else {
            // Load from localStorage for demo
            records = JSON.parse(localStorage.getItem('patientRecords') || '[]');
        }
        
        if (records.length === 0) {
            tableBody.innerHTML = '';
            noPatients.classList.remove('hidden');
            return;
        }
        
        noPatients.classList.add('hidden');
        tableBody.innerHTML = records.map(record => `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${record.fullName || record.full_name}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${record.age} / ${record.gender}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${record.bmi}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${record.tygIndex || record.tyg_index}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRiskBadgeClass(record.risk_level)}">
                        ${record.risk_level}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${new Date(record.created_at).toLocaleDateString()}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onclick="viewPatient(${record.id})" class="text-medical-600 hover:text-medical-900 mr-3">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="exportPatient(${record.id})" class="text-green-600 hover:text-green-900">
                        <i class="fas fa-download"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading patients:', error);
        showToast('Error loading patient records', 'error');
    }
}

function getRiskBadgeClass(riskLevel) {
    switch (riskLevel) {
        case 'Low Risk':
            return 'bg-green-100 text-green-800';
        case 'Moderate Risk':
            return 'bg-yellow-100 text-yellow-800';
        case 'High Risk':
            return 'bg-red-100 text-red-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}

function filterPatients() {
    const searchTerm = document.getElementById('searchPatients').value.toLowerCase();
    const rows = document.querySelectorAll('#patientsTableBody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

function exportAllPatients() {
    const records = JSON.parse(localStorage.getItem('patientRecords') || '[]');
    
    if (records.length === 0) {
        showToast('No patient records to export', 'warning');
        return;
    }
    
    const csvContent = [
        ['Name', 'Age', 'Gender', 'Weight', 'Height', 'BMI', 'Glucose', 'Triglycerides', 'HDL', 'TyG Index', 'TG/HDL Ratio', 'HbA1c', 'Diabetes', 'Risk Level', 'Date'],
        ...records.map(record => [
            record.fullName || record.full_name,
            record.age,
            record.gender,
            record.weight,
            record.height,
            record.bmi,
            record.glucose,
            record.triglycerides,
            record.hdl,
            record.tygIndex || record.tyg_index,
            record.tgHdlRatio || record.tg_hdl_ratio,
            record.hba1c,
            record.diabetes,
            record.risk_level,
            new Date(record.created_at).toLocaleDateString()
        ])
    ].map(row => row.join(',')).join('\n');
    
    downloadCSV(csvContent, 'all_patient_records.csv');
}

function clearForm() {
    document.getElementById('patientForm').reset();
    document.getElementById('resultsContainer').classList.add('hidden');
    document.getElementById('noResults').classList.remove('hidden');
}

function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const icon = document.getElementById('toastIcon');
    const messageEl = document.getElementById('toastMessage');
    
    const icons = {
        success: '<i class="fas fa-check-circle text-green-500"></i>',
        error: '<i class="fas fa-exclamation-circle text-red-500"></i>',
        warning: '<i class="fas fa-exclamation-triangle text-yellow-500"></i>',
        info: '<i class="fas fa-info-circle text-blue-500"></i>'
    };
    
    icon.innerHTML = icons[type] || icons.info;
    messageEl.textContent = message;
    
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Global functions for patient management
window.viewPatient = function(id) {
    // Implementation for viewing patient details
    showToast('Patient details view - Feature coming soon', 'info');
};

window.exportPatient = function(id) {
    const records = JSON.parse(localStorage.getItem('patientRecords') || '[]');
    const record = records.find(r => r.id === id);
    
    if (record) {
        const csvContent = [
            ['Field', 'Value'],
            ['Patient Name', record.fullName],
            ['Age', record.age],
            ['Gender', record.gender],
            ['Weight (kg)', record.weight],
            ['Height (m)', record.height],
            ['BMI', record.bmi],
            ['Fasting Glucose (mg/dL)', record.glucose],
            ['Triglycerides (mg/dL)', record.triglycerides],
            ['HDL (mg/dL)', record.hdl],
            ['TyG Index', record.tygIndex],
            ['TG/HDL Ratio', record.tgHdlRatio],
            ['HbA1c (%)', record.hba1c],
            ['Diabetes Status', record.diabetes],
            ['Risk Level', record.risk_level],
            ['Date', new Date(record.created_at).toLocaleDateString()]
        ].map(row => row.join(',')).join('\n');
        
        downloadCSV(csvContent, `${record.fullName}_metabolic_assessment.csv`);
    }
};