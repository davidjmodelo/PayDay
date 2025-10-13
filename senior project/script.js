// Navigation functionality
document.addEventListener('DOMContentLoaded', function() {
    // Navigation tab switching
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all links
            navLinks.forEach(l => l.classList.remove('active'));
            
            // Add active class to clicked link
            this.classList.add('active');
            
            // Get the tab name
            const tabName = this.getAttribute('data-tab');
            
            // Handle different tab content (placeholder functionality)
            handleTabSwitch(tabName);
        });
    });
    
    // Button click handlers
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const heroSignupBtn = document.getElementById('heroSignupBtn');
    const howItWorksBtn = document.getElementById('howItWorksBtn');
    
    // Login button
    loginBtn.addEventListener('click', function() {
        showModal('Login', 'Login functionality would be implemented here.');
    });
    
    // Signup buttons
    signupBtn.addEventListener('click', function() {
        showModal('Sign Up', 'Sign up functionality would be implemented here.');
    });
    
    heroSignupBtn.addEventListener('click', function() {
        showModal('Sign Up', 'Sign up functionality would be implemented here.');
    });
    
    // How it works button
    howItWorksBtn.addEventListener('click', function() {
        showModal('How It Works', 'This would show a tutorial or explanation of how the platform works.');
    });
    
    // Card action buttons
    const higherBtn = document.querySelector('.action-btn.higher');
    const lowerBtn = document.querySelector('.action-btn.lower');
    
    higherBtn.addEventListener('click', function() {
        animateCardAction('higher');
    });
    
    lowerBtn.addEventListener('click', function() {
        animateCardAction('lower');
    });
});

// Handle tab switching
function handleTabSwitch(tabName) {
    console.log(`Switched to ${tabName} tab`);
    
    // This is where you would implement actual tab content switching
    // For now, we'll just show an alert
    switch(tabName) {
        case 'home':
            // Already on home page
            break;
        case 'picks':
            showModal('Picks', 'This would show expert picks and predictions.');
            break;
        case 'timeline':
            showModal('Timeline', 'This would show upcoming games and events.');
            break;
        case 'about':
            showModal('About Us', 'Learn more about our sports gambling platform with AI assistance.');
            break;
        case 'contact':
            showModal('Contact', 'Get in touch with our support team.');
            break;
    }
}

// Simple modal function for demonstrations
function showModal(title, content) {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    // Create modal content
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 15px;
        max-width: 400px;
        width: 90%;
        text-align: center;
        color: #333;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    `;
    
    modal.innerHTML = `
        <h2 style="margin-bottom: 15px; color: #ff6b1a;">${title}</h2>
        <p style="margin-bottom: 20px; line-height: 1.5;">${content}</p>
        <button id="closeModal" style="
            background: #ff6b1a;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 25px;
            cursor: pointer;
            font-weight: 600;
        ">Close</button>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Close modal functionality
    const closeBtn = modal.querySelector('#closeModal');
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(overlay);
    });
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    });
}

// Animate card actions
function animateCardAction(action) {
    const card = document.querySelector('.card-front');
    const originalTransform = card.style.transform;
    
    // Add animation class
    card.style.transition = 'transform 0.3s ease';
    
    if (action === 'higher') {
        card.style.transform = 'translateY(-10px) scale(1.05)';
        setTimeout(() => {
            showModal('Higher!', 'You predicted the player will perform higher than expected!');
            card.style.transform = originalTransform;
        }, 300);
    } else {
        card.style.transform = 'translateY(10px) scale(0.95)';
        setTimeout(() => {
            showModal('Lower!', 'You predicted the player will perform lower than expected!');
            card.style.transform = originalTransform;
        }, 300);
    }
}

// Add some interactive effects
document.addEventListener('DOMContentLoaded', function() {
    // Add hover effects to league logos
    const leagueLogos = document.querySelectorAll('.league-logo');
    
    leagueLogos.forEach(logo => {
        logo.addEventListener('click', function() {
            const leagueName = this.alt || 'League';
            showModal(leagueName, `Explore ${leagueName} games and betting opportunities!`);
        });
    });
    
    // Add parallax effect to hero section
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const heroSection = document.querySelector('.hero-section');
        const cardStack = document.querySelector('.card-stack');
        
        if (heroSection && cardStack) {
            cardStack.style.transform = `translateY(${scrolled * 0.1}px)`;
        }
    });
});
