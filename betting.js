// #7 - view betting markets with odds
// #8 - place single bets
// #9 - place parlay bets
// #10 - cancel pending bets
// #12 - virtual wallet (balance display)
// #18 - rob ai betting suggestions
// #19 - rob ai chat assistant
// #22 - player/team statistics display
// #26 - real-time odds from api
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// API base URL
const API_BASE = 'http://localhost:3000';

// Current state
let currentUser = null;
let currentSport = 'all';
let currentBetStatus = 'open';
let betSlip = [];
let betType = 'single'; // 'single' or 'parlay'
let userBalance = 0;
let robSuggestions = []; // Track active Rob suggestions

// Rob's fee percentage (must match server)
const ROB_FEE_PERCENTAGE = 10;

// Apply Rob's fee to American odds (reduces payout)
function applyRobFeeToOdds(americanOdds, feePercentage) {
    const feeFactor = 1 - (feePercentage / 100);
    if (americanOdds >= 0) {
        return Math.round(americanOdds * feeFactor);
    } else {
        return Math.round(americanOdds / feeFactor);
    }
}

// DOM Elements
const marketsList = document.getElementById('marketsList');
const loadingMarkets = document.getElementById('loadingMarkets');
const sportTabs = document.querySelectorAll('.sport-tab');
const betslipItems = document.getElementById('betslipItems');
const betslipEmpty = document.getElementById('betslipEmpty');
const betslipCount = document.getElementById('betslipCount');
const betTypeBtns = document.querySelectorAll('.bet-type-btn');
const parlaySummary = document.getElementById('parlaySummary');
const parlayOdds = document.getElementById('parlayOdds');
const parlayStake = document.getElementById('parlayStake');
const parlayPayout = document.getElementById('parlayPayout');
const placeBetBtn = document.getElementById('placeBetBtn');
const clearSlipBtn = document.getElementById('clearSlipBtn');
const userBalanceSection = document.getElementById('userBalanceSection');
const userBalanceEl = document.getElementById('userBalance');
const myBetsList = document.getElementById('myBetsList');
const myBetsTabs = document.querySelectorAll('.my-bets-tab');
const noBetsMessage = document.getElementById('noBetsMessage');

// Rob Chat Elements
const robToggleBtn = document.getElementById('robToggleBtn');
const robChatBody = document.getElementById('robChatBody');
const robChatMessages = document.getElementById('robChatMessages');
const robChatInput = document.getElementById('robChatInput');
const robSendBtn = document.getElementById('robSendBtn');
const robSinglePickBtn = document.getElementById('robSinglePickBtn');
const robParlayPickBtn = document.getElementById('robParlayPickBtn');

// Initialize betting page
document.addEventListener('DOMContentLoaded', () => {
    initBetting();
});

function initBetting() {
    const checkAuth = setInterval(() => {
        if (window.auth) {
            clearInterval(checkAuth);
            setupAuthListener();
            setupEventListeners();
            setupRobChat();
            loadMarkets();
            loadRobSuggestions();
        }
    }, 100);
}

// Auth state listener
function setupAuthListener() {
    onAuthStateChanged(window.auth, (user) => {
        currentUser = user;
        if (user) {
            userBalanceSection.style.display = 'flex';
            loadUserBalance();
            loadMyBets();
        } else {
            userBalanceSection.style.display = 'none';
            userBalance = 0;
            myBetsList.innerHTML = '<p class="no-bets-message">Sign in to view your bets</p>';
        }
        updatePlaceBetButton();
    });
}

// Setup event listeners
function setupEventListeners() {
    // Sport tabs
    sportTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            sportTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentSport = tab.dataset.sport;
            loadMarkets();
            // Load team stats for selected sport (#22)
            if (currentSport !== 'all') {
                loadTeamStats(currentSport);
            } else {
                hideTeamStats();
            }
        });
    });

    // Close stats panel button
    const closeStatsBtn = document.getElementById('closeStatsBtn');
    if (closeStatsBtn) {
        closeStatsBtn.addEventListener('click', hideTeamStats);
    }

    // Bet type toggle
    betTypeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            betTypeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            betType = btn.dataset.type;
            updateBetSlipUI();
        });
    });

    // Parlay stake input
    parlayStake.addEventListener('input', updateParlayPayout);

    // Place bet button
    placeBetBtn.addEventListener('click', placeBet);

    // Clear slip button
    clearSlipBtn.addEventListener('click', clearBetSlip);

    // My bets tabs
    myBetsTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            myBetsTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentBetStatus = tab.dataset.status;
            loadMyBets();
        });
    });
}

// Load user balance from database
async function loadUserBalance() {
    if (!currentUser) return;

    try {
        const response = await fetch(`${API_BASE}/api/users/${currentUser.uid}/balance`);
        const data = await response.json();
        if (data.success) {
            userBalance = data.balance;
            userBalanceEl.textContent = `$${userBalance.toFixed(2)}`;
        } else {
            userBalance = 0;
            userBalanceEl.textContent = '$0.00';
        }
    } catch (error) {
        console.error('Error loading balance:', error);
        userBalance = 0;
        userBalanceEl.textContent = '$0.00';
    }
    updatePlaceBetButton();
}

// Load markets from server
async function loadMarkets() {
    loadingMarkets.style.display = 'block';

    try {
        const response = await fetch(`${API_BASE}/api/markets?sport=${currentSport}`);
        const data = await response.json();

        loadingMarkets.style.display = 'none';

        if (data.success) {
            renderMarkets(data.markets);
        } else {
            marketsList.innerHTML = `
                <div class="markets-error">
                    <p>Could not load markets. Please try again.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading markets:', error);
        loadingMarkets.style.display = 'none';
        marketsList.innerHTML = `
            <div class="markets-error">
                <p>Could not connect to server. Make sure the server is running.</p>
            </div>
        `;
    }
}

// Render markets
function renderMarkets(markets) {
    if (!markets || markets.length === 0) {
        marketsList.innerHTML = `
            <div class="markets-empty">
                <h3>No markets available</h3>
                <p>Check back later for upcoming events.</p>
            </div>
        `;
        return;
    }

    marketsList.innerHTML = markets.map(market => createMarketHTML(market)).join('');

    // Add click listeners to odds buttons
    marketsList.querySelectorAll('.odds-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!currentUser) {
                alert('Please sign in to place bets.');
                return;
            }
            addToSlip(btn.dataset);
        });
    });
}

// Create HTML for a single market
function createMarketHTML(market) {
    const isOpen = market.status === 'open';
    const statusClass = isOpen ? 'market-open' : 'market-closed';
    const statusText = isOpen ? 'Open' : 'Closed';
    
    const startTime = new Date(market.startTime);
    const timeString = startTime.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });

    const sportEmoji = getSportEmoji(market.sport);

    return `
        <div class="market-card ${statusClass}" data-market-id="${market.id}">
            <div class="market-header">
                <span class="market-sport">${sportEmoji} ${market.sport.toUpperCase()}</span>
                <span class="market-status ${statusClass}">${statusText}</span>
            </div>
            <div class="market-event">
                <h3>${escapeHtml(market.event)}</h3>
                <p class="market-time">📅 ${timeString}</p>
            </div>
            <div class="market-selections">
                ${market.selections.map(sel => `
                    <div class="selection-row">
                        <span class="selection-name">${escapeHtml(sel.name)}</span>
                        <button 
                            class="odds-btn ${isInSlip(market.id, sel.id) ? 'selected' : ''}" 
                            data-market-id="${market.id}"
                            data-market-event="${escapeHtml(market.event)}"
                            data-selection-id="${sel.id}"
                            data-selection-name="${escapeHtml(sel.name)}"
                            data-odds="${sel.odds}"
                            data-sport="${market.sport}"
                            ${!isOpen ? 'disabled' : ''}
                        >
                            ${formatOdds(sel.odds)}
                        </button>
                    </div>
                `).join('')}
            </div>
            ${market.closeTime ? `
                <div class="market-close-time">
                    <small>Closes: ${new Date(market.closeTime).toLocaleString()}</small>
                </div>
            ` : ''}
        </div>
    `;
}

// Check if selection is in bet slip
function isInSlip(marketId, selectionId) {
    return betSlip.some(item => item.marketId === marketId && item.selectionId === selectionId);
}

// Add selection to bet slip
function addToSlip(data) {
    const { marketId, marketEvent, selectionId, selectionName, odds, sport } = data;

    // Check if already in slip
    const existingIndex = betSlip.findIndex(item => item.marketId === marketId && item.selectionId === selectionId);

    if (existingIndex !== -1) {
        // Remove if already exists
        betSlip.splice(existingIndex, 1);
    } else {
        // Check if another selection from same market exists (for same game)
        const sameMarketIndex = betSlip.findIndex(item => item.marketId === marketId);
        if (sameMarketIndex !== -1) {
            betSlip.splice(sameMarketIndex, 1);
        }

        // Add new selection
        betSlip.push({
            marketId,
            marketEvent,
            selectionId,
            selectionName,
            odds: parseFloat(odds),
            sport,
            stake: 10
        });
    }

    updateBetSlipUI();
    updateMarketButtons();
}

// Update market buttons to show selected state
function updateMarketButtons() {
    marketsList.querySelectorAll('.odds-btn').forEach(btn => {
        const isSelected = isInSlip(btn.dataset.marketId, btn.dataset.selectionId);
        btn.classList.toggle('selected', isSelected);
    });
}

// Update bet slip UI
function updateBetSlipUI() {
    betslipCount.textContent = betSlip.length;

    if (betSlip.length === 0) {
        betslipEmpty.style.display = 'block';
        betslipItems.innerHTML = '';
        betslipItems.appendChild(betslipEmpty);
        parlaySummary.style.display = 'none';
        updatePlaceBetButton();
        return;
    }

    betslipEmpty.style.display = 'none';

    if (betType === 'single') {
        renderSingleBets();
        parlaySummary.style.display = 'none';
    } else {
        renderParlayBets();
        parlaySummary.style.display = 'block';
        updateParlayPayout();
    }

    updatePlaceBetButton();
}

// Render single bets
function renderSingleBets() {
    betslipItems.innerHTML = betSlip.map((item, index) => {
        const isRobPick = item.isRobPick;
        const originalPayout = calculatePayout(item.odds, item.stake);
        const reducedOdds = isRobPick ? applyRobFeeToOdds(item.odds, ROB_FEE_PERCENTAGE) : item.odds;
        const reducedPayout = isRobPick ? calculatePayout(reducedOdds, item.stake) : originalPayout;

        return `
            <div class="betslip-item ${isRobPick ? 'rob-pick-item' : ''}" data-index="${index}">
                <div class="betslip-item-header">
                    <button class="remove-bet-btn" data-index="${index}">×</button>
                    <span class="betslip-sport">${getSportEmoji(item.sport)}</span>
                    ${isRobPick ? '<span class="rob-pick-indicator">🤖 Rob\'s Pick</span>' : ''}
                </div>
                <div class="betslip-item-details">
                    <p class="betslip-selection">${escapeHtml(item.selectionName)}</p>
                    <p class="betslip-event">${escapeHtml(item.marketEvent)}</p>
                    ${isRobPick ? `
                        <span class="betslip-odds original-odds">${formatOdds(item.odds)}</span>
                        <span class="betslip-odds reduced-odds">${formatOdds(reducedOdds)}</span>
                        <span class="rob-fee-label">(-${ROB_FEE_PERCENTAGE}% payout)</span>
                    ` : `
                        <span class="betslip-odds">${formatOdds(item.odds)}</span>
                    `}
                </div>
                <div class="betslip-stake-row">
                    <label>Stake ($):</label>
                    <input type="number" class="stake-input single-stake" data-index="${index}" 
                           min="1" max="10000" value="${item.stake}">
                </div>
                <div class="betslip-payout-row">
                    ${isRobPick ? `
                        <span>Potential Payout:</span>
                        <div class="payout-comparison">
                            <span class="original-payout">$${originalPayout.toFixed(2)}</span>
                            <strong class="single-payout reduced-payout" data-index="${index}">$${reducedPayout.toFixed(2)}</strong>
                        </div>
                    ` : `
                        <span>Potential Payout:</span>
                        <strong class="single-payout" data-index="${index}">$${originalPayout.toFixed(2)}</strong>
                    `}
                </div>
            </div>
        `;
    }).join('');

    // Add event listeners
    betslipItems.querySelectorAll('.remove-bet-btn').forEach(btn => {
        btn.addEventListener('click', () => removeFromSlip(parseInt(btn.dataset.index)));
    });

    betslipItems.querySelectorAll('.single-stake').forEach(input => {
        input.addEventListener('input', (e) => {
            const index = parseInt(e.target.dataset.index);
            const item = betSlip[index];
            item.stake = parseFloat(e.target.value) || 0;
            
            const isRobPick = item.isRobPick;
            const originalPayout = calculatePayout(item.odds, item.stake);
            const reducedOdds = isRobPick ? applyRobFeeToOdds(item.odds, ROB_FEE_PERCENTAGE) : item.odds;
            const reducedPayout = isRobPick ? calculatePayout(reducedOdds, item.stake) : originalPayout;
            
            const payoutEl = betslipItems.querySelector(`.single-payout[data-index="${index}"]`);
            payoutEl.textContent = `$${reducedPayout.toFixed(2)}`;
            
            if (isRobPick) {
                const originalPayoutEl = betslipItems.querySelector(`.original-payout`);
                if (originalPayoutEl) {
                    originalPayoutEl.textContent = `$${originalPayout.toFixed(2)}`;
                }
            }
            
            updatePlaceBetButton();
        });
    });
}

// Render parlay bets
function renderParlayBets() {
    const hasRobPicks = betSlip.some(item => item.isRobPick);

    betslipItems.innerHTML = betSlip.map((item, index) => {
        const isRobPick = item.isRobPick;
        const reducedOdds = isRobPick ? applyRobFeeToOdds(item.odds, ROB_FEE_PERCENTAGE) : item.odds;

        return `
            <div class="betslip-item parlay-item ${isRobPick ? 'rob-pick-item' : ''}" data-index="${index}">
                <div class="betslip-item-header">
                    <button class="remove-bet-btn" data-index="${index}">×</button>
                    <span class="betslip-sport">${getSportEmoji(item.sport)}</span>
                    ${isRobPick ? '<span class="rob-pick-indicator">🤖 Rob\'s Pick</span>' : ''}
                </div>
                <div class="betslip-item-details">
                    <p class="betslip-selection">${escapeHtml(item.selectionName)}</p>
                    <p class="betslip-event">${escapeHtml(item.marketEvent)}</p>
                    ${isRobPick ? `
                        <span class="betslip-odds original-odds">${formatOdds(item.odds)}</span>
                        <span class="betslip-odds reduced-odds">${formatOdds(reducedOdds)}</span>
                        <span class="rob-fee-label">(-${ROB_FEE_PERCENTAGE}%)</span>
                    ` : `
                        <span class="betslip-odds">${formatOdds(item.odds)}</span>
                    `}
                </div>
            </div>
        `;
    }).join('');

    // Add remove listeners
    betslipItems.querySelectorAll('.remove-bet-btn').forEach(btn => {
        btn.addEventListener('click', () => removeFromSlip(parseInt(btn.dataset.index)));
    });

    updateParlayOdds();
}

// Update parlay odds display
function updateParlayOdds() {
    const { originalOdds, reducedOdds, hasRobPicks } = calculateParlayOddsWithFee();
    
    if (hasRobPicks) {
        parlayOdds.innerHTML = `
            <span class="original-odds-display">${formatOdds(originalOdds)}</span>
            <span class="reduced-odds-display">${formatOdds(reducedOdds)}</span>
        `;
    } else {
        parlayOdds.textContent = formatOdds(originalOdds);
    }
}

// Update parlay payout
function updateParlayPayout() {
    const { originalOdds, reducedOdds, hasRobPicks } = calculateParlayOddsWithFee();
    const stake = parseFloat(parlayStake.value) || 0;
    const originalPayout = calculatePayout(originalOdds, stake);
    const reducedPayout = calculatePayout(reducedOdds, stake);
    
    if (hasRobPicks) {
        parlayPayout.innerHTML = `
            <div class="payout-comparison">
                <span class="original-payout">$${originalPayout.toFixed(2)}</span>
                <span class="reduced-payout">$${reducedPayout.toFixed(2)}</span>
            </div>
        `;
    } else {
        parlayPayout.textContent = `$${originalPayout.toFixed(2)}`;
    }
}

// Calculate combined parlay odds (original without fee)
function calculateParlayOdds() {
    if (betSlip.length === 0) return 100;

    // Convert American odds to decimal, multiply, convert back
    let decimalProduct = 1;
    betSlip.forEach(item => {
        decimalProduct *= americanToDecimal(item.odds);
    });

    return decimalToAmerican(decimalProduct);
}

// Calculate parlay odds with Rob's fee applied to Rob picks
function calculateParlayOddsWithFee() {
    if (betSlip.length === 0) return { originalOdds: 100, reducedOdds: 100, hasRobPicks: false };

    let originalDecimalProduct = 1;
    let reducedDecimalProduct = 1;
    let hasRobPicks = false;

    betSlip.forEach(item => {
        const originalDecimal = americanToDecimal(item.odds);
        originalDecimalProduct *= originalDecimal;

        if (item.isRobPick) {
            hasRobPicks = true;
            const reducedOdds = applyRobFeeToOdds(item.odds, ROB_FEE_PERCENTAGE);
            reducedDecimalProduct *= americanToDecimal(reducedOdds);
        } else {
            reducedDecimalProduct *= originalDecimal;
        }
    });

    return {
        originalOdds: decimalToAmerican(originalDecimalProduct),
        reducedOdds: decimalToAmerican(reducedDecimalProduct),
        hasRobPicks
    };
}

// Convert American odds to decimal
function americanToDecimal(american) {
    if (american >= 0) {
        return (american / 100) + 1;
    } else {
        return (100 / Math.abs(american)) + 1;
    }
}

// Convert decimal odds to American
function decimalToAmerican(decimal) {
    if (decimal >= 2) {
        return Math.round((decimal - 1) * 100);
    } else {
        return Math.round(-100 / (decimal - 1));
    }
}

// Calculate payout from American odds
function calculatePayout(americanOdds, stake) {
    if (!stake || stake <= 0) return 0;
    const decimal = americanToDecimal(americanOdds);
    return stake * decimal;
}

// Remove from bet slip
function removeFromSlip(index) {
    betSlip.splice(index, 1);
    updateBetSlipUI();
    updateMarketButtons();
}

// Clear bet slip
function clearBetSlip() {
    betSlip = [];
    updateBetSlipUI();
    updateMarketButtons();
}

// Update place bet button state
function updatePlaceBetButton() {
    if (!currentUser) {
        placeBetBtn.disabled = true;
        placeBetBtn.textContent = 'Sign in to Bet';
        return;
    }

    if (betSlip.length === 0) {
        placeBetBtn.disabled = true;
        placeBetBtn.textContent = 'Add Selections';
        return;
    }

    const totalStake = getTotalStake();
    if (totalStake > userBalance) {
        placeBetBtn.disabled = true;
        placeBetBtn.textContent = 'Insufficient Balance';
        return;
    }

    if (totalStake <= 0) {
        placeBetBtn.disabled = true;
        placeBetBtn.textContent = 'Enter Stake';
        return;
    }

    placeBetBtn.disabled = false;
    placeBetBtn.textContent = `Place Bet ($${totalStake.toFixed(2)})`;
}

// Get total stake
function getTotalStake() {
    if (betType === 'parlay') {
        return parseFloat(parlayStake.value) || 0;
    }
    return betSlip.reduce((sum, item) => sum + (item.stake || 0), 0);
}

// Place bet
async function placeBet() {
    if (!currentUser || betSlip.length === 0) return;

    const totalStake = getTotalStake();
    if (totalStake > userBalance) {
        alert('Insufficient balance.');
        return;
    }

    placeBetBtn.disabled = true;
    placeBetBtn.textContent = 'Placing...';

    try {
        const betsToPlace = betType === 'parlay' 
            ? [{
                type: 'parlay',
                selections: betSlip.map(item => ({
                    marketId: item.marketId,
                    selectionId: item.selectionId,
                    selectionName: item.selectionName,
                    marketEvent: item.marketEvent,
                    odds: item.odds
                })),
                stake: parseFloat(parlayStake.value),
                combinedOdds: calculateParlayOdds()
            }]
            : betSlip.map(item => ({
                type: 'single',
                selections: [{
                    marketId: item.marketId,
                    selectionId: item.selectionId,
                    selectionName: item.selectionName,
                    marketEvent: item.marketEvent,
                    odds: item.odds
                }],
                stake: item.stake,
                combinedOdds: item.odds
            }));

        const response = await fetch(`${API_BASE}/api/bets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUser.uid,
                bets: betsToPlace
            })
        });

        const data = await response.json();

        if (data.success) {
            // Balance is already deducted on server, just refresh from DB
            alert(`Bet${betsToPlace.length > 1 ? 's' : ''} placed successfully!`);
            clearBetSlip();
            await loadUserBalance();
            loadMyBets();
        } else {
            alert('Failed to place bet: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error placing bet:', error);
        alert('Could not place bet. Please try again.');
    } finally {
        updatePlaceBetButton();
    }
}

// Load user's bets
async function loadMyBets() {
    if (!currentUser) return;

    try {
        const response = await fetch(`${API_BASE}/api/bets?userId=${currentUser.uid}&status=${currentBetStatus}`);
        const data = await response.json();

        if (data.success) {
            renderMyBets(data.bets);
        }
    } catch (error) {
        console.error('Error loading bets:', error);
        myBetsList.innerHTML = '<p class="no-bets-message">Could not load bets</p>';
    }
}

// Render user's bets
function renderMyBets(bets) {
    if (!bets || bets.length === 0) {
        myBetsList.innerHTML = `<p class="no-bets-message">No ${currentBetStatus} bets</p>`;
        return;
    }

    myBetsList.innerHTML = bets.map(bet => {
        const statusClass = bet.status === 'open' ? 'bet-open' : 
                           bet.status === 'won' ? 'bet-won' : 
                           bet.status === 'lost' ? 'bet-lost' : 'bet-cancelled';

        const canCancel = bet.status === 'open' && bet.canCancel;

        // Rob pick badge
        const robBadge = bet.isRobPick ? `
            <span class="rob-pick-badge">Rob's Pick</span>
            ${bet.discountApplied ? `<span class="fee-badge">-${bet.discountApplied}% payout</span>` : ''}
        ` : '';

        // Show original vs discounted odds if Rob pick
        const oddsDisplay = bet.isRobPick && bet.originalOdds !== bet.combinedOdds 
            ? `<span style="text-decoration: line-through; color: #999; margin-right: 5px;">${formatOdds(bet.originalOdds)}</span>${formatOdds(bet.combinedOdds)}`
            : formatOdds(bet.combinedOdds);

        return `
            <div class="my-bet-card ${statusClass}" data-bet-id="${bet.id}">
                <div class="my-bet-header">
                    <span class="bet-type-badge">${bet.type === 'parlay' ? '🎯 Parlay' : '📌 Single'}${robBadge}</span>
                    <span class="bet-status-badge ${statusClass}">${bet.status.toUpperCase()}</span>
                </div>
                <div class="my-bet-selections">
                    ${bet.selections.map(sel => `
                        <div class="my-bet-selection">
                            <p class="selection-pick">${escapeHtml(sel.selectionName)}</p>
                            <p class="selection-event">${escapeHtml(sel.marketEvent)}</p>
                            <span class="selection-odds">${formatOdds(sel.odds)}</span>
                        </div>
                    `).join('')}
                </div>
                ${bet.isRobPick ? `
                    <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
                        Final Odds: ${oddsDisplay}
                    </div>
                ` : ''}
                <div class="my-bet-footer">
                    <div class="bet-amounts">
                        <span>Stake: $${bet.stake.toFixed(2)}</span>
                        <span>Payout: $${bet.potentialPayout.toFixed(2)}</span>
                    </div>
                    ${canCancel ? `
                        <button class="btn btn-secondary cancel-bet-btn" data-bet-id="${bet.id}">
                            Cancel Bet
                        </button>
                    ` : ''}
                </div>
                <div class="bet-placed-time">
                    <small>Placed: ${new Date(bet.createdAt).toLocaleString()}</small>
                </div>
            </div>
        `;
    }).join('');

    // Add cancel listeners
    myBetsList.querySelectorAll('.cancel-bet-btn').forEach(btn => {
        btn.addEventListener('click', () => cancelBet(btn.dataset.betId));
    });
}

// Cancel a bet
async function cancelBet(betId) {
    if (!currentUser) return;

    if (!confirm('Are you sure you want to cancel this bet? Your stake will be refunded.')) return;

    try {
        const response = await fetch(`${API_BASE}/api/bets/${betId}/cancel`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUser.uid
            })
        });

        const data = await response.json();

        if (data.success) {
            // Balance is already refunded on server, just refresh from DB
            alert('Bet cancelled. Funds have been refunded.');
            await loadUserBalance();
            loadMyBets();
        } else {
            alert('Could not cancel bet: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error cancelling bet:', error);
        alert('Could not cancel bet. Please try again.');
    }
}

// Format American odds
function formatOdds(odds) {
    return odds >= 0 ? `+${odds}` : `${odds}`;
}

// Get sport emoji
function getSportEmoji(sport) {
    const emojis = {
        nfl: '🏈',
        nba: '🏀',
        mlb: '⚾',
        nhl: '🏒',
        soccer: '⚽'
    };
    return emojis[sport?.toLowerCase()] || '🎮';
}

// Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========================================
// ROB AI CHAT FUNCTIONS
// ========================================

// Setup Rob chat event listeners
function setupRobChat() {
    // Toggle chat panel
    robToggleBtn.addEventListener('click', () => {
        robChatBody.classList.toggle('collapsed');
        robToggleBtn.textContent = robChatBody.classList.contains('collapsed') ? '+' : '−';
    });

    // Send message on button click
    robSendBtn.addEventListener('click', sendRobMessage);

    // Send message on Enter key
    robChatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendRobMessage();
        }
    });

    // Get single pick
    robSinglePickBtn.addEventListener('click', () => getRobPick('single'));

    // Get parlay pick
    robParlayPickBtn.addEventListener('click', () => getRobPick('parlay'));
}

// Load existing Rob suggestions
async function loadRobSuggestions() {
    try {
        const response = await fetch(`${API_BASE}/api/rob/suggestions`);
        const data = await response.json();

        if (data.success) {
            robSuggestions = data.suggestions;
        }
    } catch (error) {
        console.error('Error loading Rob suggestions:', error);
    }
}

// Send message to Rob
async function sendRobMessage() {
    const message = robChatInput.value.trim();
    if (!message) return;

    // Add user message to chat
    addChatMessage('user', message, currentUser?.displayName || 'You');
    robChatInput.value = '';

    // Show typing indicator
    const typingId = showTypingIndicator();

    try {
        const response = await fetch(`${API_BASE}/api/rob/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUser?.uid,
                username: currentUser?.displayName || 'User',
                message
            })
        });

        const data = await response.json();
        removeTypingIndicator(typingId);

        if (data.success) {
            addChatMessage('rob', data.robMessage.content);
        } else {
            addChatMessage('rob', "Sorry, I couldn't process that. Try again!");
        }
    } catch (error) {
        console.error('Error sending message to Rob:', error);
        removeTypingIndicator(typingId);
        addChatMessage('rob', "I'm having connection issues. Please try again!");
    }
}

// Get a pick suggestion from Rob
async function getRobPick(type) {
    const btn = type === 'single' ? robSinglePickBtn : robParlayPickBtn;
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '⏳ Thinking...';

    try {
        const response = await fetch(`${API_BASE}/api/rob/suggest`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ type })
        });

        const data = await response.json();

        if (data.success) {
            robSuggestions.push(data.suggestion);
            addSuggestionMessage(data.suggestion);
        } else {
            addChatMessage('rob', data.error || "Couldn't generate a pick right now. Try again later!");
        }
    } catch (error) {
        console.error('Error getting Rob pick:', error);
        addChatMessage('rob', "Connection error. Please try again!");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// Add a regular chat message
function addChatMessage(type, content, username = '') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `rob-message ${type === 'user' ? 'user-message' : ''}`;

    const avatar = type === 'user' ? '👤' : '🤖';

    messageDiv.innerHTML = `
        <div class="rob-message-avatar">${avatar}</div>
        <div class="rob-message-content">
            <p>${escapeHtml(content)}</p>
        </div>
    `;

    robChatMessages.appendChild(messageDiv);
    robChatMessages.scrollTop = robChatMessages.scrollHeight;
}

// Add a suggestion message with interactive elements
function addSuggestionMessage(suggestion) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'rob-message';

    const typeLabel = suggestion.type === 'parlay' ? '🎯 PARLAY PICK' : '📌 SINGLE PICK';

    const picksHtml = suggestion.selections.map(sel => `
        <div class="suggestion-pick-item">
            <span class="pick-name">${escapeHtml(sel.selectionName)}</span>
            <span class="pick-odds">${formatOdds(sel.odds)}</span>
        </div>
    `).join('');

    messageDiv.innerHTML = `
        <div class="rob-message-avatar">🤖</div>
        <div class="rob-message-content rob-suggestion-message" data-suggestion-id="${suggestion.id}">
            <div class="suggestion-header">${typeLabel}</div>
            <div class="suggestion-picks">
                ${picksHtml}
            </div>
            <p style="margin: 8px 0; font-size: 13px;">💡 ${escapeHtml(suggestion.reasoning)}</p>
            <div class="suggestion-meta">
                <span class="meta-item">⚠️ ${suggestion.feePercentage}% reduced payout</span>
                <span class="meta-item">📊 ${suggestion.confidence}% confidence</span>
                <span class="meta-item">⏰ Valid 2 hours</span>
            </div>
            <button class="use-pick-btn" onclick="useRobPick('${suggestion.id}')">
                ✨ Use This Pick
            </button>
        </div>
    `;

    robChatMessages.appendChild(messageDiv);
    robChatMessages.scrollTop = robChatMessages.scrollHeight;
}

// Use Rob's pick - add selections to bet slip
window.useRobPick = function(suggestionId) {
    if (!currentUser) {
        alert('Please sign in to use Rob\'s picks.');
        return;
    }

    const suggestion = robSuggestions.find(s => s.id === suggestionId);
    if (!suggestion) {
        alert('This suggestion has expired.');
        return;
    }

    // Check if expired
    if (new Date(suggestion.expiresAt) < new Date()) {
        alert('This suggestion has expired.');
        return;
    }

    // Clear current bet slip and add Rob's selections
    betSlip = [];
    
    for (const sel of suggestion.selections) {
        betSlip.push({
            marketId: sel.marketId,
            marketEvent: sel.marketEvent,
            selectionId: sel.selectionId,
            selectionName: sel.selectionName,
            odds: sel.odds,
            sport: sel.sport,
            stake: 10,
            isRobPick: true,
            suggestionId: suggestion.id
        });
    }

    // Set bet type based on suggestion
    betType = suggestion.type;
    betTypeBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === betType);
    });

    updateBetSlipUI();
    updateMarketButtons();

    // Scroll to bet slip on mobile
    document.querySelector('.betslip-section')?.scrollIntoView({ behavior: 'smooth' });

    addChatMessage('rob', `Great choice! I've added the pick to your bet slip. Note: There's a ${suggestion.feePercentage}% reduced payout fee for using my assistance. Good luck! 🍀`);
};

// Show typing indicator
function showTypingIndicator() {
    const id = 'typing-' + Date.now();
    const typingDiv = document.createElement('div');
    typingDiv.className = 'rob-message';
    typingDiv.id = id;
    typingDiv.innerHTML = `
        <div class="rob-message-avatar">🤖</div>
        <div class="rob-message-content">
            <p>Rob is typing...</p>
        </div>
    `;
    robChatMessages.appendChild(typingDiv);
    robChatMessages.scrollTop = robChatMessages.scrollHeight;
    return id;
}

// Remove typing indicator
function removeTypingIndicator(id) {
    const typingDiv = document.getElementById(id);
    if (typingDiv) {
        typingDiv.remove();
    }
}

// ========================================
// TEAM STATISTICS (#22)
// ========================================

// Load team statistics for a sport
async function loadTeamStats(sport) {
    const teamStatsPanel = document.getElementById('teamStatsPanel');
    const teamStatsList = document.getElementById('teamStatsList');
    
    if (!teamStatsPanel || !teamStatsList) return;

    try {
        const response = await fetch(`${API_BASE}/api/stats/${sport}`);
        const data = await response.json();

        if (data.success && data.stats.length > 0) {
            teamStatsPanel.style.display = 'block';
            
            // Render stats based on sport type
            const isNHL = sport === 'nhl';
            const isMLB = sport === 'mlb';
            const isSoccer = sport === 'soccer';

            teamStatsList.innerHTML = data.stats.map(team => `
                <div style="padding: 10px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: 600; color: #333;">${team.team}</div>
                        <div style="font-size: 12px; color: #6b7280;">Record: ${team.record}</div>
                    </div>
                    <div style="text-align: right; font-size: 12px;">
                        <div style="color: #059669;">
                            ${isNHL ? `${team.goalsPerGame} GPG` : isMLB ? `${team.runsPerGame} RPG` : isSoccer ? `${team.goalsPerGame} GPG` : `${team.pointsPerGame} PPG`}
                        </div>
                        <div style="color: #dc2626;">
                            ${isNHL ? `${team.goalsAllowed} GA` : isMLB ? `${team.runsAllowed} RA` : isSoccer ? `${team.goalsAllowed} GA` : `${team.pointsAllowed} PA`}
                        </div>
                        <div style="color: #6b7280; font-size: 11px;">L5: ${team.lastFive}</div>
                    </div>
                </div>
            `).join('');
        } else {
            teamStatsPanel.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading team stats:', error);
        teamStatsPanel.style.display = 'none';
    }
}

// Hide team stats panel
function hideTeamStats() {
    const teamStatsPanel = document.getElementById('teamStatsPanel');
    if (teamStatsPanel) {
        teamStatsPanel.style.display = 'none';
    }
}
