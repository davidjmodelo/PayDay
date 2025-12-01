// --- IMPORT FIREBASE AUTH FUNCTIONS ---
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// Navigation functionality
document.addEventListener('DOMContentLoaded', function() {
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const heroSignupBtn = document.getElementById('heroSignupBtn');
    const howItWorksBtn = document.getElementById('howItWorksBtn');

    const auth = window.auth;

    // --- SIGNUP MODAL CREATION ---
    function openSignupModal() {
        const existingModal = document.getElementById('signupModal');
        if (existingModal) existingModal.remove();

        const overlay = document.createElement('div');
        overlay.id = 'signupModal';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); display: flex; justify-content: center; 
            align-items: center; z-index: 2000;
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
            background: white; padding: 30px; border-radius: 15px; 
            width: 90%; max-width: 400px; text-align: left; color: #333;
        `;

        modal.innerHTML = `
            <h2 style="color:#ff6b1a; text-align:center; margin-bottom:20px;">Sign Up for PayDay</h2>
            <form id="signupForm">
                <label>Email:</label>
                <input type="email" id="signupEmail" required placeholder="example@email.com" style="width:100%;padding:10px;margin-bottom:10px;border:1px solid #ccc;border-radius:8px;">
                <label>Username:</label>
                <input type="text" id="signupUsername" required placeholder="Choose a username" style="width:100%;padding:10px;margin-bottom:10px;border:1px solid #ccc;border-radius:8px;">
                <label>Password:</label>
                <input type="password" id="signupPassword" required placeholder="Create a password" style="width:100%;padding:10px;margin-bottom:10px;border:1px solid #ccc;border-radius:8px;">
                <label>Birthday:</label>
                <input type="date" id="signupBirthday" required style="width:100%;padding:10px;margin-bottom:20px;border:1px solid #ccc;border-radius:8px;">
                <button type="submit" class="btn btn-primary" style="width:100%;margin-bottom:10px;">Sign Up</button>
                <button type="button" id="cancelSignup" class="btn btn-secondary" style="width:100%;">Cancel</button>
            </form>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        document.getElementById('cancelSignup').addEventListener('click', () => overlay.remove());

        const signupForm = document.getElementById('signupForm');
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('signupEmail').value.trim();
            const username = document.getElementById('signupUsername').value.trim();
            const password = document.getElementById('signupPassword').value.trim();
            const birthday = document.getElementById('signupBirthday').value.trim();

            if (!email || !username || !password || !birthday) {
                alert('Please fill in all fields.');
                return;
            }

            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                localStorage.setItem('paydayUserExtra', JSON.stringify({ username, birthday }));

                alert(`Welcome, ${username}! Your account has been created.`);
                overlay.remove();

                // 🔄 Refresh the page after signup to show updated UI
                location.reload();

            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        });
    }

    // --- LOGIN MODAL CREATION ---
    function openLoginModal() {
        const existingModal = document.getElementById('loginModal');
        if (existingModal) existingModal.remove();

        const overlay = document.createElement('div');
        overlay.id = 'loginModal';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); display: flex; justify-content: center; 
            align-items: center; z-index: 2000;
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
            background: white; padding: 30px; border-radius: 15px; 
            width: 90%; max-width: 400px; text-align: left; color: #333;
        `;

        modal.innerHTML = `
            <h2 style="color:#ff6b1a; text-align:center; margin-bottom:20px;">Login to PayDay</h2>
            <form id="loginForm">
                <label>Email:</label>
                <input type="email" id="loginEmail" required placeholder="Your email" style="width:100%;padding:10px;margin-bottom:10px;border:1px solid #ccc;border-radius:8px;">
                <label>Password:</label>
                <input type="password" id="loginPassword" required placeholder="Your password" style="width:100%;padding:10px;margin-bottom:20px;border:1px solid #ccc;border-radius:8px;">
                <button type="submit" class="btn btn-primary" style="width:100%;margin-bottom:10px;">Log In</button>
                <button type="button" id="cancelLogin" class="btn btn-secondary" style="width:100%;">Cancel</button>
            </form>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        document.getElementById('cancelLogin').addEventListener('click', () => overlay.remove());

        const loginForm = document.getElementById('loginForm');
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value.trim();

            try {
                await signInWithEmailAndPassword(auth, email, password);
                alert('Logged in successfully!');
                overlay.remove();
                location.reload(); // refresh after login too
            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        });
    }

    // --- BUTTON HANDLERS ---
    if (signupBtn) signupBtn.addEventListener('click', openSignupModal);
    if (heroSignupBtn) heroSignupBtn.addEventListener('click', openSignupModal);
    if (loginBtn) loginBtn.addEventListener('click', openLoginModal);

    if (howItWorksBtn) {
        howItWorksBtn.addEventListener('click', function() {
            showModal('How It Works', 'This would show a tutorial or explanation of how the platform works.');
        });
    }

    // --- CARD BUTTONS ---
    const higherBtn = document.querySelector('.action-btn.higher');
    const lowerBtn = document.querySelector('.action-btn.lower');
    if (higherBtn) higherBtn.addEventListener('click', function() { animateCardAction('higher'); });
    if (lowerBtn) lowerBtn.addEventListener('click', function() { animateCardAction('lower'); });

    // --- AUTH STATE LISTENER ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        const extra = JSON.parse(localStorage.getItem('paydayUserExtra') || '{}');
        const username = extra.username || 'User';

        // Hide Sign Up buttons completely
        if (signupBtn) signupBtn.style.display = 'none';
        if (heroSignupBtn) heroSignupBtn.style.display = 'none';

        // Change Login → Logout (with confirmation)
        if (loginBtn) {
            loginBtn.textContent = `Log Out (${username})`;

            // Remove old event listeners before adding a new one
            const newLoginBtn = loginBtn.cloneNode(true);
            loginBtn.parentNode.replaceChild(newLoginBtn, loginBtn);

            // Now attach the correct logout handler
            newLoginBtn.addEventListener('click', async (e) => {
                e.stopPropagation(); // prevent any other click events
                const confirmLogout = confirm('Are you sure you want to log out?');

                if (confirmLogout) {
                    await signOut(auth);
                    alert('You have been logged out.');
                    location.reload();
                }
                // If Cancel, just do nothing — stay logged in
            });
        }
    } else {
        // Show default buttons
        if (signupBtn) signupBtn.style.display = 'inline-block';
        if (heroSignupBtn) heroSignupBtn.style.display = 'inline-block';

        // Reset Login button text
        if (loginBtn) {
            loginBtn.textContent = 'Log In';

            // Remove old event listeners and rebind login modal
            const newLoginBtn = loginBtn.cloneNode(true);
            loginBtn.parentNode.replaceChild(newLoginBtn, loginBtn);
            newLoginBtn.addEventListener('click', openLoginModal);
        }
    }
});

});

// --- EXISTING FEATURES BELOW ---

// Modal and animations
function showModal(title, content) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background-color: rgba(0, 0, 0, 0.5); display: flex;
        justify-content: center; align-items: center; z-index: 1000;
    `;
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: white; padding: 30px; border-radius: 15px;
        max-width: 400px; width: 90%; text-align: center; color: #333;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    `;
    modal.innerHTML = `
        <h2 style="margin-bottom: 15px; color: #ff6b1a;">${title}</h2>
        <p style="margin-bottom: 20px; line-height: 1.5;">${content}</p>
        <button id="closeModal" style="
            background: #ff6b1a; color: white; border: none;
            padding: 10px 20px; border-radius: 25px; cursor: pointer; font-weight: 600;
        ">Close</button>
    `;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    modal.querySelector('#closeModal').addEventListener('click', () => document.body.removeChild(overlay));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) document.body.removeChild(overlay); });
}

function animateCardAction(action) {
    const card = document.querySelector('.card-front');
    const originalTransform = card.style.transform;
    card.style.transition = 'transform 0.3s ease';
    if (action === 'higher') {
        card.style.transform = 'translateY(-10px) scale(1.05)';
        setTimeout(() => { showModal('Higher!', 'You predicted the player will perform higher than expected!'); card.style.transform = originalTransform; }, 300);
    } else {
        card.style.transform = 'translateY(10px) scale(0.95)';
        setTimeout(() => { showModal('Lower!', 'You predicted the player will perform lower than expected!'); card.style.transform = originalTransform; }, 300);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const leagueLogos = document.querySelectorAll('.league-logo');
    leagueLogos.forEach(logo => {
        logo.addEventListener('click', function() {
            const leagueName = this.alt || 'League';
            showModal(leagueName, `Explore ${leagueName} games and betting opportunities!`);
        });
    });
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const cardStack = document.querySelector('.card-stack');
        if (cardStack) cardStack.style.transform = `translateY(${scrolled * 0.1}px)`;
    });
});
