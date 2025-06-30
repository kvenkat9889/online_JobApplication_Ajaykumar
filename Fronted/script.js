const BASE_URL = 'http://localhost:5000';

function showError(message) {
    const errorContainer = document.getElementById('formError');
    if (errorContainer) {
        errorContainer.textContent = message;
        errorContainer.style.display = 'block';
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 5000);
    } else {
        alert(message);
    }
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validateCurrentPage() {
    const pages = document.querySelectorAll('.form-section');
    const currentPage = Array.from(pages).findIndex(page => page.classList.contains('active'));
    const currentPageForm = pages[currentPage];
    const requiredInputs = currentPageForm.querySelectorAll('[required]');
    let isValid = true;

    requiredInputs.forEach(input => {
        const errorMessage = input.closest('.form-group')?.querySelector('.error-message');
        if (!errorMessage) return;
        
        if (!input.value.trim()) {
            input.classList.add('invalid');
            errorMessage.style.display = 'block';
            isValid = false;
        } else {
            if (input.type === 'email' && !validateEmail(input.value)) {
                input.classList.add('invalid');
                errorMessage.style.display = 'block';
                isValid = false;
            } else if (input.hasAttribute('pattern') && !new RegExp(input.pattern).test(input.value)) {
                input.classList.add('invalid');
                errorMessage.style.display = 'block';
                isValid = false;
            } else if (input.name === 'dob') {
                const dob = new Date(input.value);
                const today = new Date();
                const minAgeDate = new Date();
                minAgeDate.setFullYear(today.getFullYear() - 18);
                const maxAgeDate = new Date();
                maxAgeDate.setFullYear(today.getFullYear() - 70);
                
                if (dob > minAgeDate || dob < maxAgeDate) {
                    input.classList.add('invalid');
                    errorMessage.style.display = 'block';
                    isValid = false;
                } else {
                    input.classList.remove('invalid');
                    errorMessage.style.display = 'none';
                }
            } else {
                input.classList.remove('invalid');
                errorMessage.style.display = 'none';
            }
        }
    });

    if (currentPage === 1) {
        const skillsTextarea = document.getElementById('skillsTextarea');
        const skillsError = skillsTextarea.closest('.form-group').querySelector('.error-message');
        if (!skillsTextarea.value.trim()) {
            skillsTextarea.classList.add('invalid');
            skillsError.style.display = 'block';
            isValid = false;
        } else {
            skillsTextarea.classList.remove('invalid');
            skillsError.style.display = 'none';
        }
    }

    if (currentPage === 2) {
        const termsCheckbox = document.getElementById('termsCheckbox');
        const termsError = termsCheckbox.closest('.checkbox-label').nextElementSibling.nextElementSibling;
        if (!termsCheckbox.checked) {
            termsError.style.display = 'block';
            isValid = false;
        } else {
            termsError.style.display = 'none';
        }
    }

    if (!isValid) {
        const firstInvalid = currentPageForm.querySelector('.invalid');
        if (firstInvalid) firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return isValid;
}

function setupFileUpload(inputId, containerId) {
    const input = document.getElementById(inputId);
    const container = document.getElementById(containerId);
    
    if (!input || !container) {
        console.error(`Could not find elements: inputId=${inputId}, containerId=${containerId}`);
        return false;
    }

    const label = container.querySelector('.file-upload-link');
    if (label) {
        label.setAttribute('for', inputId);
    }

    container.addEventListener('click', (e) => {
        if (e.target === container || e.target.classList.contains('file-upload-link')) {
            input.click();
        }
    });

    input.addEventListener('change', function() {
        if (this.files && this.files.length > 0) {
            handleFileSelection(this.files[0], container, inputId);
        }
    });

    setupDragAndDrop(container, input);
    return true;
}

function handleFileSelection(file, container, inputId) {
    const fileName = file.name;
    const fileType = fileName.split('.').pop().toUpperCase();
    
    if (file.size > 5 * 1024 * 1024) {
        showError('File size exceeds 5MB limit');
        document.getElementById(inputId).value = '';
        return;
    }
    
    if (file.type !== 'application/pdf') {
        showError('Only PDF files are allowed');
        document.getElementById(inputId).value = '';
        return;
    }
    
    container.classList.add('has-file');
    container.innerHTML = `
        <div class="file-preview">
            <div class="file-info">
                <span class="file-name">${fileName}</span>
                <span class="file-type">${fileType}</span>
            </div>
            <button type="button" class="remove-file" onclick="removeFile('${inputId}', '${container.id}')">
                <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        </div>
    `;
}

function setupDragAndDrop(container, input) {
    ['dragover', 'dragenter'].forEach(eventName => {
        container.addEventListener(eventName, (e) => {
            e.preventDefault();
            container.style.borderColor = '#2563eb';
            container.style.backgroundColor = '#f0f4ff';
        });
    });

    ['dragleave', 'dragend'].forEach(eventName => {
        container.addEventListener(eventName, (e) => {
            e.preventDefault();
            container.style.borderColor = '#d1d5db';
            container.style.backgroundColor = 'transparent';
        });
    });

    container.addEventListener('drop', (e) => {
        e.preventDefault();
        container.style.borderColor = '#d1d5db';
        container.style.backgroundColor = 'transparent';
        
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            input.files = e.dataTransfer.files;
            handleFileSelection(e.dataTransfer.files[0], container, input.id);
        }
    });
}

function addSkillTag(skillText) {
    if (!skillText) return;
    
    const skills = skillText.split(',').map(s => s.trim()).filter(s => s);
    const skillsTagsContainer = document.getElementById('skillsTags');
    
    skills.forEach(skill => {
        const tag = document.createElement('div');
        tag.className = 'skill-tag';
        tag.innerHTML = `
            ${skill}
            <span class="remove-skill" onclick="removeSkillTag(this)">×</span>
        `;
        skillsTagsContainer.appendChild(tag);
    });
    
    updateSkillsTextarea();
}

function updateSkillsTextarea() {
    const skillsTagsContainer = document.getElementById('skillsTags');
    const skillsTextarea = document.getElementById('skillsTextarea');
    const hiddenSkillsInput = document.getElementById('hiddenSkills');
    
    const tags = Array.from(skillsTagsContainer.querySelectorAll('.skill-tag'));
    const skills = tags.map(tag => tag.textContent.replace('×', '').trim());
    skillsTextarea.value = skills.join(', ');
    hiddenSkillsInput.value = skills.join(', ');
}

function setupFormPagination() {
    const pages = document.querySelectorAll('.form-section');
    const nextButtons = document.querySelectorAll('.next-page');
    const prevButtons = document.querySelectorAll('.prev-page');
    const pageIndicator = document.getElementById('currentPage');
    let currentPage = 0;

    function showPage(pageIndex) {
        pages.forEach((page, index) => {
            page.classList.toggle('active', index === pageIndex);
        });
        pageIndicator.textContent = pageIndex + 1;
        currentPage = pageIndex;
        updateNavigationButtons();
    }

    function updateNavigationButtons() {
        prevButtons.forEach(button => button.disabled = currentPage === 0);
        nextButtons.forEach(button => button.disabled = currentPage === pages.length - 1);
    }

    nextButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (validateCurrentPage()) {
                showPage(currentPage + 1);
                window.scrollTo(0, 0);
            }
        });
    });

    prevButtons.forEach(button => {
        button.addEventListener('click', () => {
            showPage(currentPage - 1);
            window.scrollTo(0, 0);
        });
    });

    showPage(0);
}

function setupFormSubmission() {
    const form = document.getElementById('applicationForm');
    const confirmationModal = document.getElementById('confirmationModal');
    const successModal = document.getElementById('successModal');
    const cancelConfirmation = document.getElementById('cancelConfirmation');
    const confirmSubmission = document.getElementById('confirmSubmission');
    const closeSuccessModal = document.getElementById('closeSuccessModal');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!validateCurrentPage()) return;
        
        const resumeInput = document.getElementById('resume');
        if (!resumeInput.files || resumeInput.files.length === 0) {
            showError('Please upload a resume file (PDF, up to 5MB).');
            resumeInput.closest('.form-group').querySelector('.error-message').style.display = 'block';
            return;
        }

        const formData = new FormData(form);
        
        const additionalEducation = [];
        document.querySelectorAll('.additional-education').forEach(section => {
            const education = {};
            section.querySelectorAll('input').forEach(input => {
                const nameMatch = input.name.match(/\[([^\]]+)\]$/);
                if (nameMatch && input.value.trim()) {
                    education[nameMatch[1]] = input.value;
                }
            });
            if (Object.keys(education).length >= 4) {
                additionalEducation.push(education);
            }
        });
        formData.append('additional_education', JSON.stringify(additionalEducation));

        document.getElementById('confirmFullName').textContent = formData.get('full_name') || 'Not provided';
        document.getElementById('confirmEmail').textContent = formData.get('email') || 'Not provided';
        document.getElementById('confirmMobile').textContent = formData.get('mobile') || 'Not provided';
        document.getElementById('confirmDob').textContent = formData.get('dob') || 'Not provided';
        document.getElementById('confirmGender').textContent = formData.get('gender') || 'Not provided';
        document.getElementById('confirmNationality').textContent = formData.get('nationality') || 'Not provided';
        document.getElementById('confirmCurrentAddress').textContent = formData.get('current_address') || 'Not provided';
        document.getElementById('confirmPermanentAddress').textContent = formData.get('permanent_address') || 'Not provided';
        document.getElementById('confirmLocation').textContent = `${formData.get('city') || ''}, ${formData.get('state') || ''}, ${formData.get('zipcode') || ''}`;
        document.getElementById('confirmSsc').textContent = `${formData.get('ssc_board') || ''}, ${formData.get('ssc_year') || ''}, ${formData.get('ssc_percentage') || ''}%`;
        document.getElementById('confirmIntermediate').textContent = `${formData.get('intermediate_board') || 'Not provided'}, ${formData.get('intermediate_year') || ''}, ${formData.get('intermediate_percentage') || ''}%`;
        document.getElementById('confirmGraduation').textContent = `${formData.get('college_name') || 'Not provided'}, ${formData.get('qualification') || ''}, ${formData.get('graduation_year') || ''}, ${formData.get('graduation_percentage') || ''}%`;
        document.getElementById('confirmJobRole').textContent = formData.get('job_role') || 'Not provided';
        document.getElementById('confirmPreferredLocation').textContent = formData.get('preferred_location') || 'Not provided';
        document.getElementById('confirmExperienceStatus').textContent = formData.get('experience_status') || 'Not provided';
        document.getElementById('confirmSkills').textContent = formData.get('skills') || 'Not provided';

        confirmationModal.classList.add('active');
    });

    cancelConfirmation.addEventListener('click', () => {
        confirmationModal.classList.remove('active');
    });

    confirmSubmission.addEventListener('click', async () => {
        const submitButton = document.getElementById('submitButton');
        submitButton.disabled = true;
        submitButton.innerHTML = `
            <svg class="submit-icon animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            Submitting...
        `;
        
        const form = document.getElementById('applicationForm');
        const formData = new FormData(form);
        const additionalEducation = [];
        document.querySelectorAll('.additional-education').forEach(section => {
            const education = {};
            section.querySelectorAll('input').forEach(input => {
                const nameMatch = input.name.match(/\[([^\]]+)\]$/);
                if (nameMatch && input.value.trim()) {
                    education[nameMatch[1]] = input.value;
                }
            });
            if (Object.keys(education).length >= 4) {
                additionalEducation.push(education);
            }
        });
        formData.append('additional_education', JSON.stringify(additionalEducation));

        try {
            const pingResponse = await fetch(`${BASE_URL}/api/health`, { method: 'GET' }).catch(() => null);
            if (!pingResponse || !pingResponse.ok) {
                throw new Error('Server is not reachable. Please ensure the server is running.');
            }

            const resumeInput = document.getElementById('resume');
            if (!resumeInput.files || resumeInput.files.length === 0) {
                throw new Error('Please upload a resume file (PDF, up to 5MB).');
            }

            const response = await fetch(`${BASE_URL}/api/submit`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                if (response.status === 400) {
                    const errorMessage = errorData.error || 'Invalid or missing form data.';
                    if (errorData.missing) {
                        throw new Error(`${errorMessage} Missing fields: ${errorData.missing.join(', ')}`);
                    }
                    throw new Error(errorMessage);
                } else if (response.status === 500) {
                    throw new Error('Server error occurred. Please try again later.');
                } else {
                    throw new Error(`Submission failed with status ${response.status}`);
                }
            }
            
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Submission failed');
            }
            
            document.getElementById('referenceId').textContent = `APP-${result.id || '2025-XXXXX'}`;
            confirmationModal.classList.remove('active');
            successModal.classList.add('active');
            
            form.reset();
            document.getElementById('skillsTags').innerHTML = '';
            document.getElementById('additionalEducation').innerHTML = '';
            document.getElementById('experienceFields').style.display = 'none';
            showPage(0);
        } catch (error) {
            console.error('Submission error:', error);
            showError(`An error occurred while submitting your application: ${error.message}`);
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = `
                <svg class="submit-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                </svg>
                Submit Application
            `;
        }
    });

    closeSuccessModal.addEventListener('click', () => {
        successModal.classList.remove('active');
    });
}

function setupTermsModal() {
    const termsModal = document.getElementById('termsModal');
    const termsLink = document.getElementById('termsLink');
    const cancelTerms = document.getElementById('cancelTerms');
    const confirmTerms = document.getElementById('confirmTerms');

    termsLink.addEventListener('click', (e) => {
        e.preventDefault();
        termsModal.classList.add('active');
    });

    cancelTerms.addEventListener('click', () => {
        termsModal.classList.remove('active');
    });

    confirmTerms.addEventListener('click', () => {
        document.getElementById('termsCheckbox').checked = true;
        termsModal.classList.remove('active');
        document.querySelector('.checkbox-label').nextElementSibling.nextElementSibling.style.display = 'none';
    });
}

function setupAdditionalEducation() {
    let educationCounter = 0;

    document.getElementById('addEducationButton').addEventListener('click', () => {
        educationCounter++;
        const additionalEducationDiv = document.getElementById('additionalEducation');
        const newEducation = document.createElement('div');
        newEducation.className = 'education-section additional-education';
        newEducation.id = `additionalEducation${educationCounter}`;
        newEducation.innerHTML = `
            <h3 class="education-title">Additional Education #${educationCounter}</h3>
            <button type="button" class="remove-education" onclick="removeEducation(this)">
                <svg style="width: 24px; height: 24px;" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
            <div class="form-grid">
                <div class="form-group">
                    <label class="form-label">Institution/Board</label>
                    <input type="text" name="additional_education[${educationCounter}][institution]" class="form-input" maxlength="255">
                </div>
                <div class="form-group">
                    <label class="form-label">Qualification</label>
                    <input type="text" name="additional_education[${educationCounter}][qualification]" class="form-input" maxlength="255">
                </div>
                <div class="form-group">
                    <label class="form-label">Branch</label>
                    <input type="text" name="additional_education[${educationCounter}][branch]" class="form-input" maxlength="255">
                </div>
                <div class="form-group">
                    <label class="form-label">Year</label>
                    <input type="number" name="additional_education[${educationCounter}][year]" min="1960" max="2035" class="form-input">
                    <div class="error-message">Please enter a valid year</div>
                </div>
                <div class="form-group">
                    <label class="form-label">Percentage</label>
                    <input type="text" name="additional_education[${educationCounter}][percentage]" class="form-input" maxlength="10" pattern="^[0-9.]+$" title="Only numbers and decimal point allowed">
                    <div class="error-message">Please enter a valid percentage</div>
                </div>
            </div>
        `;
        additionalEducationDiv.appendChild(newEducation);
    });
}

function setupExperienceFields() {
    document.querySelector('[name="experience_status"]').addEventListener('change', (e) => {
        const experienceFields = document.getElementById('experienceFields');
        experienceFields.style.display = e.target.value === 'Experienced' ? 'block' : 'none';
    });
}

function setupSkillsInput() {
    const skillsTextarea = document.getElementById('skillsTextarea');
    skillsTextarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addSkillTag(e.target.value.trim());
            e.target.value = '';
        }
    });
}

function setupDOBValidation() {
    const dobInput = document.querySelector('input[name="dob"]');
    if (dobInput) {
        const today = new Date();
        const minDate = new Date();
        minDate.setFullYear(today.getFullYear() - 70);
        const maxDate = new Date();
        maxDate.setFullYear(today.getFullYear() - 18);
        dobInput.min = minDate.toISOString().split('T')[0];
        dobInput.max = maxDate.toISOString().split('T')[0];
    }
}

function setupRealTimeValidation() {
    document.querySelectorAll('input, select, textarea').forEach(input => {
        input.addEventListener('input', function() {
            const errorMessage = this.closest('.form-group')?.querySelector('.error-message');
            if (!errorMessage) return;
            
            if (this.hasAttribute('required') && !this.value.trim()) {
                this.classList.add('invalid');
                errorMessage.style.display = 'block';
            } else if (this.type === 'email' && this.value && !validateEmail(this.value)) {
                this.classList.add('invalid');
                errorMessage.style.display = 'block';
            } else if (this.hasAttribute('pattern') && this.value && !new RegExp(this.pattern).test(this.value)) {
                this.classList.add('invalid');
                errorMessage.style.display = 'block';
            } else if (this.name === 'dob' && this.value) {
                const dob = new Date(this.value);
                const today = new Date();
                const minAgeDate = new Date();
                minAgeDate.setFullYear(today.getFullYear() - 18);
                const maxAgeDate = new Date();
                maxAgeDate.setFullYear(today.getFullYear() - 70);
                
                if (dob > minAgeDate || dob < maxAgeDate) {
                    this.classList.add('invalid');
                    errorMessage.style.display = 'block';
                } else {
                    this.classList.remove('invalid');
                    errorMessage.style.display = 'none';
                }
            } else {
                this.classList.remove('invalid');
                errorMessage.style.display = 'none';
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', function() {
    setupDOBValidation();
    setupFormPagination();
    setupAdditionalEducation();
    setupExperienceFields();
    setupSkillsInput();
    setupRealTimeValidation();
    setupTermsModal();
    setupFormSubmission();

    const resumeSetupSuccess = setupFileUpload('resume', 'resumeUpload');
    const coverLetterSetupSuccess = setupFileUpload('cover_letter', 'coverLetterUpload');
    
    if (!resumeSetupSuccess) {
        console.error('Failed to initialize resume upload');
    }
});

window.removeEducation = function(button) {
    button.parentElement.remove();
};

window.removeFile = function(inputId, containerId) {
    const input = document.getElementById(inputId);
    const container = document.getElementById(containerId);
    
    if (!input || !container) return;
    
    input.value = '';
    container.classList.remove('has-file');
    container.innerHTML = `
        <svg class="file-upload-icon" stroke="currentColor" fill="none" viewBox="0 0 48 48">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>
        <div class="file-upload-text">
            <label for="${inputId}" class="file-upload-link">Upload a file</label>
            <span>or drag and drop</span>
        </div>
        <p class="file-upload-info">PDF up to 5MB</p>
    `;
    
    const label = container.querySelector('.file-upload-link');
    if (label) label.setAttribute('for', inputId);
    container.addEventListener('click', () => document.getElementById(inputId).click());
    setupDragAndDrop(container, document.getElementById(inputId));
};

window.removeSkillTag = function(button) {
    button.parentElement.remove();
    updateSkillsTextarea();
};

function showPage(pageIndex) {
    const pages = document.querySelectorAll('.form-section');
    pages.forEach((page, index) => {
        page.classList.toggle('active', index === pageIndex);
    });
    document.getElementById('currentPage').textContent = pageIndex + 1;
}