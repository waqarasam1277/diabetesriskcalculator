// Import required libraries
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// DOM Elements
const titleInput = document.getElementById('title');
const contentTextarea = document.getElementById('content');
const authorInput = document.getElementById('author');
const subjectInput = document.getElementById('subject');
const generateBtn = document.getElementById('generateBtn');
const statusDiv = document.getElementById('status');

// Preview Elements
const previewTitle = document.getElementById('previewTitle');
const previewAuthor = document.getElementById('previewAuthor');
const previewDate = document.getElementById('previewDate');
const previewContent = document.getElementById('previewContent');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    updatePreview();
    updateDate();
    
    // Add event listeners for real-time preview updates
    titleInput.addEventListener('input', updatePreview);
    contentTextarea.addEventListener('input', updatePreview);
    authorInput.addEventListener('input', updatePreview);
    subjectInput.addEventListener('input', updatePreview);
});

// Update the live preview
function updatePreview() {
    previewTitle.textContent = titleInput.value || 'Untitled Document';
    previewAuthor.textContent = authorInput.value || 'Unknown Author';
    
    // Convert textarea content to HTML with basic formatting
    const content = contentTextarea.value || 'No content provided.';
    const formattedContent = formatContent(content);
    previewContent.innerHTML = formattedContent;
}

// Format content with basic HTML
function formatContent(content) {
    return content
        .split('\n\n')
        .map(paragraph => {
            if (paragraph.trim() === '') return '';
            
            // Handle bullet points
            if (paragraph.includes('•') || paragraph.includes('*')) {
                const lines = paragraph.split('\n');
                const listItems = lines
                    .filter(line => line.trim().startsWith('•') || line.trim().startsWith('*'))
                    .map(line => `<li>${line.replace(/^[•*]\s*/, '').trim()}</li>`)
                    .join('');
                
                const nonListLines = lines
                    .filter(line => !line.trim().startsWith('•') && !line.trim().startsWith('*'))
                    .join('<br>');
                
                return (nonListLines ? `<p>${nonListLines}</p>` : '') + 
                       (listItems ? `<ul>${listItems}</ul>` : '');
            }
            
            // Handle regular paragraphs
            return `<p>${paragraph.replace(/\n/g, '<br>')}</p>`;
        })
        .join('');
}

// Update current date
function updateDate() {
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    previewDate.textContent = formattedDate;
}

// Generate PDF function
async function generatePDF() {
    const button = generateBtn;
    const originalText = button.innerHTML;
    
    try {
        // Update button state
        button.innerHTML = '<div class="loading"></div> Generating...';
        button.disabled = true;
        statusDiv.innerHTML = '<span class="status-generating"><i class="fas fa-spinner fa-spin"></i> Generating your PDF...</span>';
        
        // Get the preview element
        const previewElement = document.getElementById('preview');
        
        // Create canvas from the preview
        const canvas = await html2canvas(previewElement, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            width: previewElement.scrollWidth,
            height: previewElement.scrollHeight
        });
        
        // Create PDF
        const imgData = canvas.toDataURL('image/png');
        const pdf = new window.jspdf.jsPDF('p', 'mm', 'a4');
        
        // Calculate dimensions
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        const imgX = (pdfWidth - imgWidth * ratio) / 2;
        const imgY = 0;
        
        // Add image to PDF
        pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
        
        // Set PDF metadata
        pdf.setProperties({
            title: titleInput.value || 'Generated Document',
            subject: subjectInput.value || 'PDF Document',
            author: authorInput.value || 'PDF Generator',
            creator: 'PDF Generator Tool'
        });
        
        // Generate filename
        const filename = (titleInput.value || 'document').replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.pdf';
        
        // Save the PDF
        pdf.save(filename);
        
        // Update status
        statusDiv.innerHTML = '<span class="status-success"><i class="fas fa-check-circle"></i> PDF generated successfully!</span>';
        
        // Reset status after 3 seconds
        setTimeout(() => {
            statusDiv.innerHTML = '';
        }, 3000);
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        statusDiv.innerHTML = '<span class="status-error"><i class="fas fa-exclamation-circle"></i> Error generating PDF. Please try again.</span>';
    } finally {
        // Reset button
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

// Utility functions
function scrollToGenerator() {
    document.getElementById('generator').scrollIntoView({ 
        behavior: 'smooth' 
    });
}

function clearContent() {
    if (confirm('Are you sure you want to clear all content?')) {
        titleInput.value = '';
        contentTextarea.value = '';
        authorInput.value = '';
        subjectInput.value = '';
        updatePreview();
    }
}

function loadSample() {
    titleInput.value = 'Sample Business Report';
    authorInput.value = 'John Doe';
    subjectInput.value = 'Quarterly Business Analysis';
    contentTextarea.value = `Executive Summary

This quarterly report provides an overview of our business performance and key achievements during Q4 2024.

Key Highlights:
• Revenue increased by 25% compared to previous quarter
• Customer satisfaction rating improved to 4.8/5
• Successfully launched 3 new product features
• Expanded team by 15 new members

Financial Performance

Our financial metrics show strong growth across all major categories:

Revenue: $2.4M (+25% QoQ)
Profit Margin: 18.5% (+2.1% QoQ)
Customer Acquisition Cost: $45 (-12% QoQ)

Strategic Initiatives

Looking ahead to Q1 2025, we will focus on:
• Expanding into new markets
• Improving operational efficiency
• Investing in customer success programs
• Developing strategic partnerships

Conclusion

The strong performance this quarter positions us well for continued growth in 2025. We remain committed to delivering exceptional value to our customers and stakeholders.`;
    updatePreview();
}

function refreshPreview() {
    updatePreview();
    updateDate();
}

// Make functions globally available
window.generatePDF = generatePDF;
window.scrollToGenerator = scrollToGenerator;
window.clearContent = clearContent;
window.loadSample = loadSample;
window.refreshPreview = refreshPreview;

// Add smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add scroll effect to header
window.addEventListener('scroll', function() {
    const header = document.querySelector('.header');
    if (window.scrollY > 100) {
        header.style.background = 'rgba(255, 255, 255, 0.98)';
        header.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
    } else {
        header.style.background = 'rgba(255, 255, 255, 0.95)';
        header.style.boxShadow = 'none';
    }
});

// Add intersection observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe feature cards for animation
document.querySelectorAll('.feature-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(card);
});