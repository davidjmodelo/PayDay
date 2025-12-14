// --- IMPORT FIREBASE AUTH FUNCTIONS ---
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut,
  updateEmail,
  updatePassword,
  updateProfile,
  deleteUser
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// Navigation functionality
document.addEventListener('DOMContentLoaded', function() {
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const heroSignupBtn = document.getElementById('heroSignupBtn');
    const howItWorksBtn = document.getElementById('howItWorksBtn');
    const accountNavLink = document.getElementById('accountNavLink');
    const bettingNavItem = document.getElementById('bettingNavItem');

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
            <button type="button" id="closeSignup" style="position:absolute; top:10px; right:10px; background:transparent; border:none; font-size:20px; cursor:pointer; line-height:1;">&times;</button>
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
        const closeSignupBtn = document.getElementById('closeSignup');
        if (closeSignupBtn) closeSignupBtn.addEventListener('click', () => overlay.remove());

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
                
                // Save profile to database
                await fetch(`http://localhost:3000/api/users/${user.uid}/profile`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, birthday, email })
                });

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
            <button type="button" id="closeLogin" style="position:absolute; top:10px; right:10px; background:transparent; border:none; font-size:20px; cursor:pointer; line-height:1;">&times;</button>
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
        const closeLoginBtn = document.getElementById('closeLogin');
        if (closeLoginBtn) closeLoginBtn.addEventListener('click', () => overlay.remove());

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
            showHowItWorksModal();
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

        if (accountNavLink) accountNavLink.style.display = '';
        if (bettingNavItem) bettingNavItem.style.display = '';

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

        if (accountNavLink) accountNavLink.style.display = 'none';
        if (bettingNavItem) bettingNavItem.style.display = 'none';

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

    // --- ACCOUNT PAGE LOGIC ---
    const accountUsernameEl = document.getElementById('accountUsername');
    const accountEmailEl = document.getElementById('accountEmail');
    const accountBirthdayEl = document.getElementById('accountBirthday');
    const accountWalletEl = document.getElementById('accountWallet');
    const accountBioEl = document.getElementById('accountBio');
    const profilePictureEl = document.getElementById('profilePicture');
    const profileInitialsEl = document.getElementById('profileInitials');
    const changeUsernameBtn = document.getElementById('changeUsernameBtn');
    const changeEmailBtn = document.getElementById('changeEmailBtn');
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    const saveBioBtn = document.getElementById('saveBioBtn');
    const addFundsBtn = document.getElementById('addFundsBtn');
    const changePictureBtn = document.getElementById('changePictureBtn');
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');

    if (accountUsernameEl && accountEmailEl && accountBirthdayEl) {
        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                accountUsernameEl.textContent = 'Not signed in';
                accountEmailEl.textContent = 'Email: -';
                accountBirthdayEl.textContent = 'Birthday: -';
                if (accountWalletEl) accountWalletEl.textContent = 'Wallet Balance: $0.00';
                if (accountBioEl) accountBioEl.value = '';
                if (profilePictureEl) {
                    profilePictureEl.style.display = 'none';
                }
                if (profileInitialsEl) {
                    profileInitialsEl.textContent = 'U';
                }
                return;
            }

            // Fetch profile from database
            let profile = { username: 'User', birthday: '', bio: '', photoUrl: '', balance: 0 };
            try {
                const profileRes = await fetch(`http://localhost:3000/api/users/${user.uid}/profile`);
                const profileData = await profileRes.json();
                if (profileData.success) {
                    profile = profileData.profile;
                }
            } catch (err) {
                console.error('Error fetching profile:', err);
            }

            const username = profile.username || user.displayName || 'User';
            const birthday = profile.birthday || '-';
            const bio = profile.bio || '';
            const photoUrl = profile.photoUrl || '';

            accountUsernameEl.textContent = `Username: ${username}`;
            accountEmailEl.textContent = `Email: ${user.email || '-'}`;
            accountBirthdayEl.textContent = `Birthday: ${birthday || '-'}`;

            if (accountWalletEl) {
                accountWalletEl.textContent = `Wallet Balance: $${profile.balance.toFixed(2)}`;
            }

            if (accountBioEl) {
                accountBioEl.value = bio;
            }

            if (profilePictureEl && profileInitialsEl) {
                if (photoUrl) {
                    profilePictureEl.src = photoUrl;
                    profilePictureEl.style.display = 'block';
                    profileInitialsEl.style.display = 'none';
                } else {
                    profilePictureEl.style.display = 'none';
                    const initial = (username || 'U').trim().charAt(0).toUpperCase() || 'U';
                    profileInitialsEl.textContent = initial;
                    profileInitialsEl.style.display = 'block';
                }
            }

            if (changeUsernameBtn) {
                changeUsernameBtn.onclick = async () => {
                    const newUsername = prompt('Enter a new username:', username);
                    if (!newUsername) return;
                    const trimmed = newUsername.trim();
                    if (!trimmed) return;
                    try {
                        const response = await fetch(`http://localhost:3000/api/users/${user.uid}/profile`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ username: trimmed })
                        });
                        const data = await response.json();
                        if (data.success) {
                            accountUsernameEl.textContent = `Username: ${trimmed}`;
                            await updateProfile(user, { displayName: trimmed });
                        } else {
                            alert('Failed to update username');
                        }
                    } catch (e) {
                        console.error('Failed to update username', e);
                        alert('Failed to update username');
                    }
                };
            }

            if (changeEmailBtn) {
                changeEmailBtn.onclick = async () => {
                    const newEmail = prompt('Enter a new email:', user.email || '');
                    if (!newEmail) return;
                    const trimmed = newEmail.trim();
                    if (!trimmed) return;
                    try {
                        await updateEmail(user, trimmed);
                        accountEmailEl.textContent = `Email: ${trimmed}`;
                        alert('Email updated. You may need to verify this new email in Firebase.');
                    } catch (e) {
                        alert(`Failed to update email: ${e.message}`);
                    }
                };
            }

            if (changePasswordBtn) {
                changePasswordBtn.onclick = async () => {
                    const newPassword = prompt('Enter a new password (min 6 characters):');
                    if (!newPassword) return;
                    if (newPassword.length < 6) {
                        alert('Password must be at least 6 characters.');
                        return;
                    }
                    try {
                        await updatePassword(user, newPassword);
                        alert('Password updated successfully.');
                    } catch (e) {
                        alert(`Failed to update password: ${e.message}`);
                    }
                };
            }

            if (saveBioBtn) {
                saveBioBtn.onclick = async () => {
                    if (!accountBioEl) return;
                    try {
                        const response = await fetch(`http://localhost:3000/api/users/${user.uid}/profile`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ bio: accountBioEl.value })
                        });
                        const data = await response.json();
                        if (data.success) {
                            alert('Bio saved.');
                        } else {
                            alert('Failed to save bio');
                        }
                    } catch (e) {
                        console.error('Failed to save bio', e);
                        alert('Failed to save bio');
                    }
                };
            }

            if (addFundsBtn) {
                addFundsBtn.onclick = async () => {
                    let input = prompt('How much would you like to deposit into your virtual wallet?');
                    if (input === null) return;
                    input = input.trim();
                    if (!input) return;
                    const amount = Number(input);
                    if (Number.isNaN(amount) || amount <= 0) {
                        alert('Please enter a valid positive amount.');
                        return;
                    }

                    try {
                        const response = await fetch(`http://localhost:3000/api/users/${user.uid}/deposit`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ amount })
                        });
                        const data = await response.json();

                        if (data.success) {
                            if (accountWalletEl) {
                                accountWalletEl.textContent = `Wallet Balance: $${data.newBalance.toFixed(2)}`;
                            }
                            alert(`$${amount.toFixed(2)} added to your wallet. New balance: $${data.newBalance.toFixed(2)}`);
                        } else {
                            alert('Failed to deposit: ' + (data.error || 'Unknown error'));
                        }
                    } catch (error) {
                        console.error('Deposit error:', error);
                        alert('Failed to deposit funds. Please try again.');
                    }
                };
            }

            if (changePictureBtn) {
                changePictureBtn.onclick = async () => {
                    const url = prompt('Enter a URL for your profile picture (must be an image URL):', photoUrl || '');
                    if (!url) return;
                    const trimmed = url.trim();
                    if (!trimmed) return;
                    try {
                        const response = await fetch(`http://localhost:3000/api/users/${user.uid}/profile`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ photoUrl: trimmed })
                        });
                        const data = await response.json();
                        if (data.success) {
                            if (profilePictureEl && profileInitialsEl) {
                                profilePictureEl.src = trimmed;
                                profilePictureEl.style.display = 'block';
                                profileInitialsEl.style.display = 'none';
                            }
                        } else {
                            alert('Failed to update profile picture');
                        }
                    } catch (e) {
                        console.error('Failed to update profile picture', e);
                        alert('Failed to update profile picture');
                    }
                };
            }

            if (deleteAccountBtn) {
                deleteAccountBtn.onclick = async () => {
                    const confirmDelete = confirm('Are you sure you want to permanently delete your account? This cannot be undone.');
                    if (!confirmDelete) return;

                    try {
                        await deleteUser(user);
                        localStorage.removeItem('paydayUserExtra');
                        alert('Your account has been deleted.');
                        window.location.href = 'index.html';
                    } catch (e) {
                        if (e.code === 'auth/requires-recent-login') {
                            alert('Please log out and log back in, then try deleting your account again (Firebase requires a recent login).');
                        } else {
                            alert(`Failed to delete account: ${e.message}`);
                        }
                    }
                };
            }
        });
    }

});

// --- EXISTING FEATURES BELOW ---

// How It Works Modal with step-by-step tutorial
function showHowItWorksModal() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background-color: rgba(0, 0, 0, 0.7); display: flex;
        justify-content: center; align-items: center; z-index: 2000;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
        background: white; padding: 40px; border-radius: 20px;
        max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;
        color: #333; box-shadow: 0 25px 50px rgba(0, 0, 0, 0.4);
    `;

    modal.innerHTML = `
        <h2 style="color: #ff6b1a; text-align: center; margin-bottom: 25px; font-size: 28px;">How Pay Day Works</h2>
        
        <div style="margin-bottom: 25px;">
            <div style="display: flex; align-items: flex-start; margin-bottom: 20px;">
                <div style="background: #ff6b1a; color: white; width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0; margin-right: 15px;">1</div>
                <div>
                    <h3 style="margin: 0 0 5px 0; color: #222;">Create Your Account</h3>
                    <p style="margin: 0; color: #666; line-height: 1.5;">Sign up for free and add funds to your virtual wallet. Your balance is used to place bets on real sports events.</p>
                </div>
            </div>

            <div style="display: flex; align-items: flex-start; margin-bottom: 20px;">
                <div style="background: #ff6b1a; color: white; width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0; margin-right: 15px;">2</div>
                <div>
                    <h3 style="margin: 0 0 5px 0; color: #222;">Browse Live Markets</h3>
                    <p style="margin: 0; color: #666; line-height: 1.5;">Explore betting markets across NFL, NBA, NHL, MLS, and more. View real-time odds on moneylines, spreads, and totals.</p>
                </div>
            </div>

            <div style="display: flex; align-items: flex-start; margin-bottom: 20px;">
                <div style="background: #ff6b1a; color: white; width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0; margin-right: 15px;">3</div>
                <div>
                    <h3 style="margin: 0 0 5px 0; color: #222;">Place Your Bets</h3>
                    <p style="margin: 0; color: #666; line-height: 1.5;">Add selections to your bet slip. Choose single bets or combine multiple picks into a parlay for bigger potential payouts.</p>
                </div>
            </div>

            <div style="display: flex; align-items: flex-start; margin-bottom: 20px;">
                <div style="background: #ff6b1a; color: white; width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0; margin-right: 15px;">4</div>
                <div>
                    <h3 style="margin: 0 0 5px 0; color: #222;">Get Help from Rob 🤖</h3>
                    <p style="margin: 0; color: #666; line-height: 1.5;">Not sure what to pick? Ask <strong>Rob</strong>, our AI assistant! Rob analyzes games and suggests bets. His picks come with a small 10% fee on winnings, but his insights can help you make smarter choices.</p>
                </div>
            </div>

            <div style="display: flex; align-items: flex-start; margin-bottom: 20px;">
                <div style="background: #ff6b1a; color: white; width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0; margin-right: 15px;">5</div>
                <div>
                    <h3 style="margin: 0 0 5px 0; color: #222;">Track & Cash Out</h3>
                    <p style="margin: 0; color: #666; line-height: 1.5;">Monitor your active bets on the Timeline. When your picks win, your winnings are automatically added to your wallet!</p>
                </div>
            </div>
        </div>

        <div style="background: #f8f9fa; padding: 15px; border-radius: 10px; margin-bottom: 25px;">
            <p style="margin: 0; text-align: center; color: #555; font-size: 14px;">
                <strong>💡 Pro Tip:</strong> Use your own sports knowledge for full payouts, or let Rob help for slightly reduced winnings but smarter picks!
            </p>
        </div>

        <button id="closeHowItWorks" style="
            background: #ff6b1a; color: white; border: none;
            padding: 12px 30px; border-radius: 25px; cursor: pointer; 
            font-weight: 600; font-size: 16px; display: block; margin: 0 auto;
            transition: background 0.2s;
        ">Got It!</button>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    modal.querySelector('#closeHowItWorks').addEventListener('click', () => document.body.removeChild(overlay));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) document.body.removeChild(overlay); });
}

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
