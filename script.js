// #1 - user signup with email/password
// #2 - user login/logout
// #5 - change email/password
// #6 - delete account with data purge
// #25 - password reset via email
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut,
  updateEmail,
  updatePassword,
  updateProfile,
  deleteUser,
  sendPasswordResetEmail,
  EmailAuthProvider,
  reauthenticateWithCredential
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
                <input type="password" id="loginPassword" required placeholder="Your password" style="width:100%;padding:10px;margin-bottom:10px;border:1px solid #ccc;border-radius:8px;">
                <a href="#" id="forgotPasswordLink" style="display:block;text-align:right;font-size:12px;color:#ff6b1a;margin-bottom:15px;">Forgot Password?</a>
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

        // Forgot Password handler (#25)
        const forgotPasswordLink = document.getElementById('forgotPasswordLink');
        if (forgotPasswordLink) {
            forgotPasswordLink.addEventListener('click', async (e) => {
                e.preventDefault();
                const email = document.getElementById('loginEmail').value.trim();
                if (!email) {
                    alert('Please enter your email address first.');
                    return;
                }
                try {
                    await sendPasswordResetEmail(auth, email);
                    alert('Password reset email sent! Check your inbox.');
                } catch (error) {
                    alert(`Error: ${error.message}`);
                }
            });
        }
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

            // #6 - delete account with data purge
            if (deleteAccountBtn) {
                deleteAccountBtn.onclick = async () => {
                    const confirmDelete = confirm('Are you sure you want to permanently delete your account? This will delete ALL your data including posts, bets, and messages. This cannot be undone.');
                    if (!confirmDelete) return;

                    try {
                        // Delete data from backend first
                        await fetch(`http://localhost:3000/api/users/${user.uid}/account`, {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ confirmDelete: true })
                        });

                        // Then delete Firebase auth account
                        await deleteUser(user);
                        localStorage.removeItem('paydayUserExtra');
                        alert('Your account and all associated data have been permanently deleted.');
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

            // #13 - withdrawal requests
            const withdrawFundsBtn = document.getElementById('withdrawFundsBtn');
            if (withdrawFundsBtn) {
                withdrawFundsBtn.onclick = async () => {
                    const input = prompt(`Enter amount to withdraw (Available: $${profile.balance.toFixed(2)}):`);
                    if (input === null) return;
                    const amount = parseFloat(input.trim());
                    if (isNaN(amount) || amount <= 0) {
                        alert('Please enter a valid positive amount.');
                        return;
                    }
                    if (amount > profile.balance) {
                        alert('Insufficient balance.');
                        return;
                    }

                    try {
                        const response = await fetch(`http://localhost:3000/api/users/${user.uid}/withdraw`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ amount })
                        });
                        const data = await response.json();
                        if (data.success) {
                            if (accountWalletEl) {
                                accountWalletEl.textContent = `Wallet Balance: $${data.newBalance.toFixed(2)}`;
                            }
                            profile.balance = data.newBalance;
                            alert(`Withdrawal of $${amount.toFixed(2)} submitted. ${data.message}`);
                            loadWithdrawals(user.uid);
                        } else {
                            alert('Withdrawal failed: ' + (data.error || 'Unknown error'));
                        }
                    } catch (error) {
                        console.error('Withdrawal error:', error);
                        alert('Failed to process withdrawal.');
                    }
                };
            }

            // --- TRANSACTION HISTORY (#21) ---
            const transactionHistoryBtn = document.getElementById('transactionHistoryBtn');
            const transactionHistorySection = document.getElementById('transactionHistorySection');
            const transactionsList = document.getElementById('transactionsList');
            if (transactionHistoryBtn && transactionHistorySection) {
                transactionHistoryBtn.onclick = async () => {
                    transactionHistorySection.style.display = transactionHistorySection.style.display === 'none' ? 'block' : 'none';
                    if (transactionHistorySection.style.display === 'block') {
                        await loadTransactions(user.uid);
                    }
                };
            }

            // #21 - transaction history
            async function loadTransactions(userId) {
                if (!transactionsList) return;
                try {
                    const response = await fetch(`http://localhost:3000/api/users/${userId}/transactions`);
                    const data = await response.json();
                    if (data.success && data.transactions.length > 0) {
                        transactionsList.innerHTML = data.transactions.map(t => `
                            <div style="padding: 10px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between;">
                                <div>
                                    <div style="font-weight: 500;">${t.description}</div>
                                    <div style="font-size: 12px; color: #6b7280;">${new Date(t.createdAt).toLocaleDateString()}</div>
                                </div>
                                <div style="text-align: right;">
                                    <div style="color: ${t.amount < 0 ? '#dc2626' : '#059669'}; font-weight: 600;">
                                        ${t.amount < 0 ? '-' : '+'}$${Math.abs(t.amount).toFixed(2)}
                                    </div>
                                    <div style="font-size: 12px; color: #6b7280;">${t.status}</div>
                                </div>
                            </div>
                        `).join('');
                    } else {
                        transactionsList.innerHTML = '<p style="color: #6b7280; padding: 10px;">No transactions yet.</p>';
                    }
                } catch (error) {
                    console.error('Error loading transactions:', error);
                    transactionsList.innerHTML = '<p style="color: #dc2626; padding: 10px;">Failed to load transactions.</p>';
                }
            }

            // #13 - withdrawal history
            async function loadWithdrawals(userId) {
                const withdrawalHistorySection = document.getElementById('withdrawalHistorySection');
                const withdrawalsList = document.getElementById('withdrawalsList');
                if (!withdrawalsList) return;
                
                try {
                    const response = await fetch(`http://localhost:3000/api/users/${userId}/withdrawals`);
                    const data = await response.json();
                    const pending = data.withdrawals?.filter(w => w.status === 'pending') || [];
                    
                    if (pending.length > 0) {
                        withdrawalHistorySection.style.display = 'block';
                        withdrawalsList.innerHTML = pending.map(w => `
                            <div style="padding: 10px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <div style="font-weight: 500;">$${w.amount.toFixed(2)}</div>
                                    <div style="font-size: 12px; color: #6b7280;">Requested: ${new Date(w.requestedAt).toLocaleDateString()}</div>
                                </div>
                                <button onclick="cancelWithdrawal('${w.id}', '${userId}')" style="background: #dc2626; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">Cancel</button>
                            </div>
                        `).join('');
                    } else {
                        withdrawalHistorySection.style.display = 'none';
                    }
                } catch (error) {
                    console.error('Error loading withdrawals:', error);
                }
            }

            // Load withdrawals on page load
            loadWithdrawals(user.uid);

            // #23 - direct messaging (dm)
            const viewMessagesBtn = document.getElementById('viewMessagesBtn');
            const messagesSection = document.getElementById('messagesSection');
            const conversationsList = document.getElementById('conversationsList');
            const messageThread = document.getElementById('messageThread');
            const messageThreadHeader = document.getElementById('messageThreadHeader');
            const messagesList = document.getElementById('messagesList');
            const messageInput = document.getElementById('messageInput');
            const sendMessageBtn = document.getElementById('sendMessageBtn');
            let currentChatPartner = null;

            if (viewMessagesBtn && messagesSection) {
                viewMessagesBtn.onclick = async () => {
                    messagesSection.style.display = messagesSection.style.display === 'none' ? 'block' : 'none';
                    if (messagesSection.style.display === 'block') {
                        await loadConversations(user.uid);
                    }
                };
            }

            async function loadConversations(userId) {
                if (!conversationsList) return;
                try {
                    const response = await fetch(`http://localhost:3000/api/messages/conversations/${userId}`);
                    const data = await response.json();
                    if (data.success && data.conversations.length > 0) {
                        conversationsList.innerHTML = data.conversations.map(c => `
                            <div onclick="openConversation('${c.odId}', '${c.username}')" style="padding: 12px; border-bottom: 1px solid #e5e7eb; cursor: pointer; display: flex; justify-content: space-between; align-items: center;" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='white'">
                                <div>
                                    <div style="font-weight: 500;">${c.username}</div>
                                    <div style="font-size: 12px; color: #6b7280; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${c.lastMessage}</div>
                                </div>
                                ${c.unreadCount > 0 ? `<span style="background: #ff6b1a; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 12px;">${c.unreadCount}</span>` : ''}
                            </div>
                        `).join('');
                    } else {
                        conversationsList.innerHTML = '<p style="color: #6b7280; padding: 10px;">No conversations yet. Start a conversation from a user\'s profile on the Timeline.</p>';
                    }
                } catch (error) {
                    console.error('Error loading conversations:', error);
                }
            }

            window.openConversation = async (partnerId, partnerName) => {
                currentChatPartner = partnerId;
                messageThread.style.display = 'block';
                messageThreadHeader.textContent = `Chat with ${partnerName}`;
                await loadMessages(user.uid, partnerId);
            };

            async function loadMessages(userId, partnerId) {
                if (!messagesList) return;
                try {
                    const response = await fetch(`http://localhost:3000/api/messages/${userId}/${partnerId}`);
                    const data = await response.json();
                    if (data.success) {
                        messagesList.innerHTML = data.messages.map(m => `
                            <div style="margin-bottom: 10px; text-align: ${m.isOwn ? 'right' : 'left'};">
                                <div style="display: inline-block; padding: 8px 12px; border-radius: 12px; max-width: 70%; background: ${m.isOwn ? '#ff6b1a' : '#e5e7eb'}; color: ${m.isOwn ? 'white' : '#333'};">
                                    ${m.content}
                                </div>
                                <div style="font-size: 10px; color: #9ca3af; margin-top: 2px;">${new Date(m.createdAt).toLocaleTimeString()}</div>
                            </div>
                        `).join('');
                        messagesList.scrollTop = messagesList.scrollHeight;
                    }
                } catch (error) {
                    console.error('Error loading messages:', error);
                }
            }

            if (sendMessageBtn && messageInput) {
                sendMessageBtn.onclick = async () => {
                    const content = messageInput.value.trim();
                    if (!content || !currentChatPartner) return;

                    try {
                        const response = await fetch('http://localhost:3000/api/messages', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                senderId: user.uid,
                                senderUsername: profile.username,
                                receiverId: currentChatPartner,
                                content
                            })
                        });
                        const data = await response.json();
                        if (data.success) {
                            messageInput.value = '';
                            await loadMessages(user.uid, currentChatPartner);
                        }
                    } catch (error) {
                        console.error('Error sending message:', error);
                    }
                };

                messageInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') sendMessageBtn.click();
                });
            }

            // --- LEGAL LINKS (#28) ---
            const legalLinks = {
                helpLink: 'help',
                termsLink: 'terms',
                privacyLink: 'privacy',
                disclaimerLink: 'disclaimer'
            };

            for (const [linkId, docType] of Object.entries(legalLinks)) {
                const link = document.getElementById(linkId);
                if (link) {
                    link.onclick = async (e) => {
                        e.preventDefault();
                        try {
                            const response = await fetch(`http://localhost:3000/api/legal/${docType}`);
                            const data = await response.json();
                            if (data.success) {
                                showLegalModal(data.title, data.content);
                            }
                        } catch (error) {
                            console.error('Error loading legal document:', error);
                        }
                    };
                }
            }

            function showLegalModal(title, content) {
                const overlay = document.createElement('div');
                overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;justify-content:center;align-items:center;z-index:3000;';
                const modal = document.createElement('div');
                modal.style.cssText = 'background:white;padding:30px;border-radius:15px;max-width:600px;width:90%;max-height:80vh;overflow-y:auto;color:#333;';
                modal.innerHTML = `
                    <h2 style="color:#ff6b1a;margin-bottom:20px;">${title}</h2>
                    <div style="line-height:1.6;">${content}</div>
                    <button id="closeLegalModal" style="margin-top:20px;background:#ff6b1a;color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;">Close</button>
                `;
                overlay.appendChild(modal);
                document.body.appendChild(overlay);
                modal.querySelector('#closeLegalModal').onclick = () => overlay.remove();
                overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
            }
        });
    }

    // --- CANCEL WITHDRAWAL (global function) ---
    window.cancelWithdrawal = async (withdrawalId, userId) => {
        if (!confirm('Cancel this withdrawal and return funds to your wallet?')) return;
        try {
            const response = await fetch(`http://localhost:3000/api/withdrawals/${withdrawalId}/cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });
            const data = await response.json();
            if (data.success) {
                alert(data.message);
                location.reload();
            } else {
                alert('Failed to cancel: ' + data.error);
            }
        } catch (error) {
            console.error('Cancel withdrawal error:', error);
        }
    };

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
