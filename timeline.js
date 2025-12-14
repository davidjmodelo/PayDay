// Timeline functionality - Posts, Followers, Feed, Search, Comments, Share
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// API base URL
const API_BASE = 'http://localhost:3000';

// Current user state
let currentUser = null;
let currentFeed = 'all';
let isSearchActive = false;

// DOM Elements
const createPostCard = document.getElementById('createPostCard');
const guestMessage = document.getElementById('guestMessage');
const guestLoginLink = document.getElementById('guestLoginLink');
const postContent = document.getElementById('postContent');
const postImageUrl = document.getElementById('postImageUrl');
const postVideoUrl = document.getElementById('postVideoUrl');
const postPublic = document.getElementById('postPublic');
const charCount = document.getElementById('charCount');
const submitPostBtn = document.getElementById('submitPostBtn');
const postsFeed = document.getElementById('postsFeed');
const loadingPosts = document.getElementById('loadingPosts');
const feedTabs = document.querySelectorAll('.feed-tab');
const suggestedUsers = document.getElementById('suggestedUsers');

// Search elements
const searchInput = document.getElementById('searchInput');
const searchClearBtn = document.getElementById('searchClearBtn');
const searchType = document.getElementById('searchType');
const searchDateFilter = document.getElementById('searchDateFilter');
const searchBtn = document.getElementById('searchBtn');
const searchResults = document.getElementById('searchResults');
const searchResultsCount = document.getElementById('searchResultsCount');
const searchResultsContent = document.getElementById('searchResultsContent');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const feedTabsContainer = document.getElementById('feedTabs');

// Sidebar elements
const sidebarAvatar = document.getElementById('sidebarAvatar');
const sidebarUsername = document.getElementById('sidebarUsername');
const sidebarEmail = document.getElementById('sidebarEmail');
const postsCount = document.getElementById('postsCount');
const followersCount = document.getElementById('followersCount');
const followingCount = document.getElementById('followingCount');
const createPostAvatar = document.getElementById('createPostAvatar');

// Initialize timeline when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initTimeline();
});

function initTimeline() {
    // Wait for Firebase auth to be ready
    const checkAuth = setInterval(() => {
        if (window.auth) {
            clearInterval(checkAuth);
            setupAuthListener();
            setupEventListeners();
            loadPosts();
            loadSuggestedUsers();
        }
    }, 100);
}

// Auth state listener
function setupAuthListener() {
    onAuthStateChanged(window.auth, (user) => {
        currentUser = user;
        updateUIForAuthState(user);
        if (user) {
            updateUserStats();
        }
    });
}

// Update UI based on auth state
async function updateUIForAuthState(user) {
    if (user) {
        // User is logged in
        createPostCard.style.display = 'block';
        guestMessage.style.display = 'none';

        // Fetch username from database
        let username = user.displayName || 'User';
        try {
            const profileRes = await fetch(`${API_BASE}/api/users/${user.uid}/profile`);
            const profileData = await profileRes.json();
            if (profileData.success && profileData.profile.username) {
                username = profileData.profile.username;
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
        }
        const initial = username.charAt(0).toUpperCase();

        // Update sidebar
        sidebarAvatar.textContent = initial;
        sidebarUsername.textContent = username;
        sidebarEmail.textContent = user.email || '';

        // Update create post avatar
        createPostAvatar.textContent = initial;
    } else {
        // Guest user
        createPostCard.style.display = 'none';
        guestMessage.style.display = 'block';

        sidebarAvatar.textContent = '?';
        sidebarUsername.textContent = 'Guest';
        sidebarEmail.textContent = 'Sign in to post';
        postsCount.textContent = '0';
        followersCount.textContent = '0';
        followingCount.textContent = '0';
    }
}

// Setup event listeners
function setupEventListeners() {
    // Character count for post content
    postContent.addEventListener('input', () => {
        charCount.textContent = postContent.value.length;
    });

    // Submit post
    submitPostBtn.addEventListener('click', submitPost);

    // Enter key to submit (Ctrl+Enter or Cmd+Enter)
    postContent.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            submitPost();
        }
    });

    // Feed tabs
    feedTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            clearSearch();
            feedTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFeed = tab.dataset.feed;
            loadPosts();
        });
    });

    // Guest login link
    if (guestLoginLink) {
        guestLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            // Trigger login modal from script.js
            const loginBtn = document.getElementById('loginBtn');
            if (loginBtn) loginBtn.click();
        });
    }

    // Search functionality
    searchInput.addEventListener('input', () => {
        searchClearBtn.style.display = searchInput.value ? 'block' : 'none';
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    searchClearBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchClearBtn.style.display = 'none';
    });

    searchBtn.addEventListener('click', performSearch);
    clearSearchBtn.addEventListener('click', clearSearch);
}

// Submit a new post
async function submitPost() {
    if (!currentUser) {
        alert('Please sign in to create a post.');
        return;
    }

    const content = postContent.value.trim();
    const imageUrl = postImageUrl.value.trim();
    const videoUrl = postVideoUrl.value.trim();
    const isPublic = postPublic.checked;

    if (!content && !imageUrl && !videoUrl) {
        alert('Please add some content to your post.');
        return;
    }

    submitPostBtn.disabled = true;
    submitPostBtn.textContent = 'Posting...';

    try {
        // Fetch username from database
        let username = currentUser.displayName || 'User';
        try {
            const profileRes = await fetch(`${API_BASE}/api/users/${currentUser.uid}/profile`);
            const profileData = await profileRes.json();
            if (profileData.success && profileData.profile.username) {
                username = profileData.profile.username;
            }
        } catch (err) {
            console.error('Error fetching profile for post:', err);
        }

        const response = await fetch(`${API_BASE}/api/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUser.uid,
                username: username,
                email: currentUser.email,
                content: content,
                imageUrl: imageUrl || null,
                videoUrl: videoUrl || null,
                isPublic: isPublic
            })
        });

        const data = await response.json();

        if (data.success) {
            // Clear form
            postContent.value = '';
            postImageUrl.value = '';
            postVideoUrl.value = '';
            charCount.textContent = '0';

            // Reload posts
            loadPosts();
            updateUserStats();
        } else {
            alert('Failed to create post: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error creating post:', error);
        alert('Could not connect to server. Make sure the server is running.');
    } finally {
        submitPostBtn.disabled = false;
        submitPostBtn.textContent = 'Post';
    }
}

// Load posts from server
async function loadPosts() {
    loadingPosts.style.display = 'block';

    try {
        let url = `${API_BASE}/api/posts?feed=${currentFeed}`;
        if (currentUser) {
            url += `&userId=${currentUser.uid}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        loadingPosts.style.display = 'none';

        if (data.success) {
            renderPosts(data.posts);
        } else {
            postsFeed.innerHTML = `
                <div class="empty-feed">
                    <h3>Could not load posts</h3>
                    <p>${data.error || 'Please try again later.'}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading posts:', error);
        loadingPosts.style.display = 'none';
        postsFeed.innerHTML = `
            <div class="empty-feed">
                <h3>Could not connect to server</h3>
                <p>Make sure the server is running on port 3000.</p>
            </div>
        `;
    }
}

// Render posts to the feed
function renderPosts(posts) {
    if (!posts || posts.length === 0) {
        postsFeed.innerHTML = `
            <div class="empty-feed">
                <h3>No posts yet</h3>
                <p>${currentFeed === 'following' ? 'Follow some users to see their posts here!' : 'Be the first to share something!'}</p>
            </div>
        `;
        return;
    }

    postsFeed.innerHTML = posts.map(post => createPostHTML(post)).join('');

    // Add event listeners to post actions
    attachPostEventListeners();
}

// Attach event listeners to all post elements
function attachPostEventListeners() {
    // Like buttons
    postsFeed.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', () => toggleLike(btn.dataset.postId));
    });

    // Delete buttons
    postsFeed.querySelectorAll('.delete-post-btn').forEach(btn => {
        btn.addEventListener('click', () => deletePost(btn.dataset.postId));
    });

    // Comment toggle buttons
    postsFeed.querySelectorAll('.comments-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const postId = btn.dataset.postId;
            const commentsList = postsFeed.querySelector(`.comments-list[data-post-id="${postId}"]`);
            if (commentsList) {
                commentsList.classList.toggle('expanded');
                btn.textContent = commentsList.classList.contains('expanded') 
                    ? '💬 Hide comments' 
                    : btn.textContent.replace('Hide', 'View');
            }
        });
    });

    // Comment button (scroll to comment input)
    postsFeed.querySelectorAll('.comment-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!currentUser) {
                alert('Please sign in to comment.');
                return;
            }
            const postId = btn.dataset.postId;
            const commentInput = postsFeed.querySelector(`.comment-input[data-post-id="${postId}"]`);
            const commentsList = postsFeed.querySelector(`.comments-list[data-post-id="${postId}"]`);
            if (commentsList) {
                commentsList.classList.add('expanded');
            }
            if (commentInput) {
                commentInput.focus();
            }
        });
    });

    // Comment submit buttons
    postsFeed.querySelectorAll('.comment-submit-btn').forEach(btn => {
        btn.addEventListener('click', () => submitComment(btn.dataset.postId));
    });

    // Comment input enter key
    postsFeed.querySelectorAll('.comment-input').forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                submitComment(input.dataset.postId);
            }
        });
    });

    // Comment like buttons
    postsFeed.querySelectorAll('.comment-like-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            toggleCommentLike(btn.dataset.postId, btn.dataset.commentId);
        });
    });

    // Comment delete buttons
    postsFeed.querySelectorAll('.comment-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            deleteComment(btn.dataset.postId, btn.dataset.commentId);
        });
    });

    // Share buttons
    postsFeed.querySelectorAll('.share-btn').forEach(btn => {
        btn.addEventListener('click', () => openShareModal(btn.dataset.postId));
    });
}

// Create HTML for a single post
function createPostHTML(post) {
    const initial = (post.username || 'U').charAt(0).toUpperCase();
    const timeAgo = getTimeAgo(new Date(post.createdAt));
    const isOwner = currentUser && currentUser.uid === post.userId;
    const isLiked = currentUser && post.likes && post.likes.includes(currentUser.uid);
    const likeCount = post.likes ? post.likes.length : 0;
    const commentCount = post.comments ? post.comments.length : 0;

    let mediaHTML = '';
    if (post.imageUrl) {
        mediaHTML += `<img src="${escapeHtml(post.imageUrl)}" alt="Post image" class="post-image" onerror="this.style.display='none'">`;
    }
    if (post.videoUrl) {
        const embedUrl = getVideoEmbedUrl(post.videoUrl);
        if (embedUrl) {
            mediaHTML += `<iframe src="${embedUrl}" class="post-video" allowfullscreen></iframe>`;
        }
    }

    // Generate comments HTML
    const commentsHTML = createCommentsHTML(post);

    return `
        <article class="post-card" data-post-id="${post.id}">
            <div class="post-header">
                <div class="post-avatar">${initial}</div>
                <div class="post-user-info">
                    <h4 class="post-username">${escapeHtml(post.username)}</h4>
                    <p class="post-meta">${timeAgo}</p>
                </div>
                <span class="post-visibility">${post.isPublic ? '🌐 Public' : '🔒 Followers'}</span>
                ${isOwner ? `<button class="delete-post-btn" data-post-id="${post.id}" title="Delete post">×</button>` : ''}
            </div>
            ${post.content ? `<div class="post-content">${escapeHtml(post.content)}</div>` : ''}
            ${mediaHTML}
            <div class="post-actions">
                <button class="post-action-btn like-btn ${isLiked ? 'liked' : ''}" data-post-id="${post.id}">
                    <span class="icon">${isLiked ? '❤️' : '🤍'}</span>
                    <span>${likeCount}</span>
                </button>
                <button class="post-action-btn comment-btn" data-post-id="${post.id}">
                    <span class="icon">💬</span>
                    <span>${commentCount > 0 ? commentCount : 'Comment'}</span>
                </button>
                <button class="post-action-btn share-btn" data-post-id="${post.id}">
                    <span class="icon">🔗</span>
                    <span>Share</span>
                </button>
            </div>
            ${commentsHTML}
        </article>
    `;
}

// Create comments section HTML
function createCommentsHTML(post) {
    const comments = post.comments || [];
    const commentCount = comments.length;

    let commentsListHTML = '';
    if (commentCount > 0) {
        commentsListHTML = comments.map(comment => {
            const commentInitial = (comment.username || 'U').charAt(0).toUpperCase();
            const commentTime = getTimeAgo(new Date(comment.createdAt));
            const isCommentOwner = currentUser && currentUser.uid === comment.userId;
            const isCommentLiked = currentUser && comment.likes && comment.likes.includes(currentUser.uid);
            const commentLikeCount = comment.likes ? comment.likes.length : 0;

            return `
                <div class="comment" data-comment-id="${comment.id}">
                    <div class="comment-avatar">${commentInitial}</div>
                    <div class="comment-content">
                        <div class="comment-header">
                            <span class="comment-username">${escapeHtml(comment.username)}</span>
                            <span class="comment-time">${commentTime}</span>
                        </div>
                        <p class="comment-text">${escapeHtml(comment.text)}</p>
                        <div class="comment-actions">
                            <button class="comment-action-btn comment-like-btn ${isCommentLiked ? 'liked' : ''}" 
                                    data-post-id="${post.id}" 
                                    data-comment-id="${comment.id}">
                                ${isCommentLiked ? '❤️' : '🤍'} ${commentLikeCount > 0 ? commentLikeCount : ''}
                            </button>
                            ${isCommentOwner ? `
                                <button class="comment-action-btn comment-delete-btn" 
                                        data-post-id="${post.id}" 
                                        data-comment-id="${comment.id}">
                                    Delete
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    return `
        <div class="comments-section" data-post-id="${post.id}">
            ${commentCount > 0 ? `
                <button class="comments-toggle" data-post-id="${post.id}">
                    💬 ${commentCount} comment${commentCount !== 1 ? 's' : ''} - Click to ${commentCount > 0 ? 'view' : 'add'}
                </button>
                <div class="comments-list" data-post-id="${post.id}">
                    ${commentsListHTML}
                </div>
            ` : ''}
            ${currentUser ? `
                <div class="add-comment-form">
                    <input type="text" class="comment-input" data-post-id="${post.id}" placeholder="Write a comment..." maxlength="300">
                    <button class="comment-submit-btn" data-post-id="${post.id}">Post</button>
                </div>
            ` : ''}
        </div>
    `;
}

// Toggle like on a post
async function toggleLike(postId) {
    if (!currentUser) {
        alert('Please sign in to like posts.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/posts/${postId}/like`, {
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
            loadPosts(); // Refresh to show updated like count
        }
    } catch (error) {
        console.error('Error toggling like:', error);
    }
}

// Delete a post
async function deletePost(postId) {
    if (!currentUser) return;

    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
        const response = await fetch(`${API_BASE}/api/posts/${postId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUser.uid
            })
        });

        const data = await response.json();
        if (data.success) {
            loadPosts();
            updateUserStats();
        } else {
            alert('Failed to delete post: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error deleting post:', error);
    }
}

// Load suggested users
async function loadSuggestedUsers() {
    try {
        const response = await fetch(`${API_BASE}/api/users/suggested${currentUser ? `?userId=${currentUser.uid}` : ''}`);
        const data = await response.json();

        if (data.success && data.users.length > 0) {
            renderSuggestedUsers(data.users);
        } else {
            suggestedUsers.innerHTML = '<p style="color: #999; font-size: 13px;">No suggestions yet</p>';
        }
    } catch (error) {
        console.error('Error loading suggested users:', error);
        suggestedUsers.innerHTML = '<p style="color: #999; font-size: 13px;">Could not load suggestions</p>';
    }
}

// Render suggested users
function renderSuggestedUsers(users) {
    suggestedUsers.innerHTML = users.map(user => {
        const initial = (user.username || 'U').charAt(0).toUpperCase();
        const isFollowing = currentUser && user.followers && user.followers.includes(currentUser.uid);

        return `
            <div class="suggested-user">
                <div class="suggested-user-avatar">${initial}</div>
                <div class="suggested-user-info">
                    <h5>${escapeHtml(user.username)}</h5>
                    <p>${user.postsCount || 0} posts</p>
                </div>
                <button class="follow-btn ${isFollowing ? 'following' : 'follow'}" 
                        data-user-id="${user.id}"
                        onclick="toggleFollow('${user.id}')">
                    ${isFollowing ? 'Following' : 'Follow'}
                </button>
            </div>
        `;
    }).join('');
}

// Toggle follow a user
window.toggleFollow = async function(targetUserId) {
    if (!currentUser) {
        alert('Please sign in to follow users.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/users/${targetUserId}/follow`, {
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
            loadSuggestedUsers();
            updateUserStats();
            if (currentFeed === 'following') {
                loadPosts();
            }
        }
    } catch (error) {
        console.error('Error toggling follow:', error);
    }
};

// Update user stats in sidebar
async function updateUserStats() {
    if (!currentUser) return;

    try {
        const response = await fetch(`${API_BASE}/api/users/${currentUser.uid}/stats`);
        const data = await response.json();

        if (data.success) {
            postsCount.textContent = data.stats.postsCount || 0;
            followersCount.textContent = data.stats.followersCount || 0;
            followingCount.textContent = data.stats.followingCount || 0;
        }
    } catch (error) {
        console.error('Error loading user stats:', error);
    }
}

// Helper: Get time ago string
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    return date.toLocaleDateString();
}

// Helper: Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Helper: Convert video URL to embed URL
function getVideoEmbedUrl(url) {
    if (!url) return null;

    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) {
        return `https://www.youtube.com/embed/${ytMatch[1]}`;
    }

    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
        return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }

    return null;
}

// ========================================
// COMMENT FUNCTIONS
// ========================================

// Submit a comment
async function submitComment(postId) {
    if (!currentUser) {
        alert('Please sign in to comment.');
        return;
    }

    const commentInput = postsFeed.querySelector(`.comment-input[data-post-id="${postId}"]`);
    if (!commentInput) return;

    const text = commentInput.value.trim();
    if (!text) {
        alert('Please enter a comment.');
        return;
    }

    const submitBtn = postsFeed.querySelector(`.comment-submit-btn[data-post-id="${postId}"]`);
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '...';
    }

    try {
        // Fetch username from database
        let username = currentUser.displayName || 'User';
        try {
            const profileRes = await fetch(`${API_BASE}/api/users/${currentUser.uid}/profile`);
            const profileData = await profileRes.json();
            if (profileData.success && profileData.profile.username) {
                username = profileData.profile.username;
            }
        } catch (err) {
            console.error('Error fetching profile for comment:', err);
        }

        const response = await fetch(`${API_BASE}/api/posts/${postId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUser.uid,
                username: username,
                text: text
            })
        });

        const data = await response.json();
        if (data.success) {
            commentInput.value = '';
            loadPosts(); // Refresh to show new comment
        } else {
            alert('Failed to add comment: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error adding comment:', error);
        alert('Could not add comment. Please try again.');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Post';
        }
    }
}

// Toggle like on a comment
async function toggleCommentLike(postId, commentId) {
    if (!currentUser) {
        alert('Please sign in to like comments.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/posts/${postId}/comments/${commentId}/like`, {
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
            loadPosts();
        }
    } catch (error) {
        console.error('Error toggling comment like:', error);
    }
}

// Delete a comment
async function deleteComment(postId, commentId) {
    if (!currentUser) return;

    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
        const response = await fetch(`${API_BASE}/api/posts/${postId}/comments/${commentId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUser.uid
            })
        });

        const data = await response.json();
        if (data.success) {
            loadPosts();
        } else {
            alert('Failed to delete comment: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error deleting comment:', error);
    }
}

// ========================================
// SHARE FUNCTIONS
// ========================================

// Open share modal
function openShareModal(postId) {
    const postUrl = `${window.location.origin}/timeline.html?post=${postId}`;

    const overlay = document.createElement('div');
    overlay.className = 'share-modal-overlay';
    overlay.innerHTML = `
        <div class="share-modal">
            <h3>Share this post</h3>
            <div class="share-options">
                <button class="share-option" data-platform="twitter">
                    <span class="icon">🐦</span>
                    <span>Twitter</span>
                </button>
                <button class="share-option" data-platform="facebook">
                    <span class="icon">📘</span>
                    <span>Facebook</span>
                </button>
                <button class="share-option" data-platform="reddit">
                    <span class="icon">🔴</span>
                    <span>Reddit</span>
                </button>
                <button class="share-option" data-platform="email">
                    <span class="icon">📧</span>
                    <span>Email</span>
                </button>
            </div>
            <div class="share-link-container">
                <input type="text" class="share-link-input" value="${postUrl}" readonly>
                <button class="copy-link-btn">Copy</button>
            </div>
            <button class="share-modal-close">Close</button>
        </div>
    `;

    document.body.appendChild(overlay);

    // Close modal
    overlay.querySelector('.share-modal-close').addEventListener('click', () => {
        overlay.remove();
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });

    // Copy link
    overlay.querySelector('.copy-link-btn').addEventListener('click', () => {
        const input = overlay.querySelector('.share-link-input');
        input.select();
        navigator.clipboard.writeText(input.value).then(() => {
            overlay.querySelector('.copy-link-btn').textContent = 'Copied!';
            setTimeout(() => {
                overlay.querySelector('.copy-link-btn').textContent = 'Copy';
            }, 2000);
        });
    });

    // Share to platforms
    overlay.querySelectorAll('.share-option').forEach(btn => {
        btn.addEventListener('click', () => {
            const platform = btn.dataset.platform;
            let shareUrl = '';

            switch (platform) {
                case 'twitter':
                    shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent('Check out this post on PayDay!')}`;
                    break;
                case 'facebook':
                    shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`;
                    break;
                case 'reddit':
                    shareUrl = `https://reddit.com/submit?url=${encodeURIComponent(postUrl)}&title=${encodeURIComponent('Check out this post on PayDay!')}`;
                    break;
                case 'email':
                    shareUrl = `mailto:?subject=${encodeURIComponent('Check out this post on PayDay!')}&body=${encodeURIComponent(postUrl)}`;
                    break;
            }

            if (shareUrl) {
                window.open(shareUrl, '_blank', 'width=600,height=400');
            }
        });
    });
}

// ========================================
// SEARCH FUNCTIONS
// ========================================

// Perform search
async function performSearch() {
    const query = searchInput.value.trim();
    if (!query) {
        alert('Please enter a search term.');
        return;
    }

    const type = searchType.value;
    const dateFilter = searchDateFilter.value;

    searchBtn.disabled = true;
    searchBtn.textContent = 'Searching...';

    try {
        const response = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}&type=${type}&date=${dateFilter}${currentUser ? `&userId=${currentUser.uid}` : ''}`);
        const data = await response.json();

        if (data.success) {
            displaySearchResults(data.results, query);
        } else {
            alert('Search failed: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error performing search:', error);
        alert('Could not perform search. Please try again.');
    } finally {
        searchBtn.disabled = false;
        searchBtn.textContent = 'Search';
    }
}

// Display search results
function displaySearchResults(results, query) {
    isSearchActive = true;
    searchResults.style.display = 'block';
    feedTabsContainer.style.display = 'none';
    postsFeed.style.display = 'none';

    const totalCount = (results.posts?.length || 0) + (results.users?.length || 0);
    searchResultsCount.textContent = `(${totalCount} result${totalCount !== 1 ? 's' : ''} for "${query}")`;

    let html = '';

    // Users section
    if (results.users && results.users.length > 0) {
        html += '<h4 style="color: #ff6b1a; margin-bottom: 12px;">Users</h4>';
        html += results.users.map(user => {
            const initial = (user.username || 'U').charAt(0).toUpperCase();
            const isFollowing = currentUser && user.followers && user.followers.includes(currentUser.uid);
            const isCurrentUser = currentUser && currentUser.uid === user.id;

            return `
                <div class="search-user-result">
                    <div class="search-user-avatar">${initial}</div>
                    <div class="search-user-info">
                        <h4>${escapeHtml(user.username)}</h4>
                        <p>${user.postsCount || 0} posts • ${user.followers?.length || 0} followers</p>
                    </div>
                    ${!isCurrentUser ? `
                        <button class="follow-btn ${isFollowing ? 'following' : 'follow'}" 
                                onclick="toggleFollow('${user.id}')">
                            ${isFollowing ? 'Following' : 'Follow'}
                        </button>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    // Posts section
    if (results.posts && results.posts.length > 0) {
        html += '<h4 style="color: #ff6b1a; margin: 20px 0 12px 0;">Posts</h4>';
        html += '<div class="search-posts-results">';
        html += results.posts.map(post => createPostHTML(post)).join('');
        html += '</div>';
    }

    if (totalCount === 0) {
        html = `
            <div class="empty-feed" style="color: #666;">
                <h3>No results found</h3>
                <p>Try different keywords or filters.</p>
            </div>
        `;
    }

    searchResultsContent.innerHTML = html;

    // Attach event listeners to search result posts
    const searchPostsContainer = searchResultsContent.querySelector('.search-posts-results');
    if (searchPostsContainer) {
        // Like buttons
        searchPostsContainer.querySelectorAll('.like-btn').forEach(btn => {
            btn.addEventListener('click', () => toggleLike(btn.dataset.postId));
        });

        // Delete buttons
        searchPostsContainer.querySelectorAll('.delete-post-btn').forEach(btn => {
            btn.addEventListener('click', () => deletePost(btn.dataset.postId));
        });

        // Comment buttons
        searchPostsContainer.querySelectorAll('.comment-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!currentUser) {
                    alert('Please sign in to comment.');
                    return;
                }
                const postId = btn.dataset.postId;
                const commentInput = searchPostsContainer.querySelector(`.comment-input[data-post-id="${postId}"]`);
                if (commentInput) commentInput.focus();
            });
        });

        // Share buttons
        searchPostsContainer.querySelectorAll('.share-btn').forEach(btn => {
            btn.addEventListener('click', () => openShareModal(btn.dataset.postId));
        });
    }
}

// Clear search and return to feed
function clearSearch() {
    isSearchActive = false;
    searchInput.value = '';
    searchClearBtn.style.display = 'none';
    searchResults.style.display = 'none';
    feedTabsContainer.style.display = 'flex';
    postsFeed.style.display = 'flex';
}
