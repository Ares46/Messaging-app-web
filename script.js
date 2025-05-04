// Firebase configuration
// Replace with your own Firebase config
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const resetPasswordForm = document.getElementById('reset-password-form');
const showRegisterLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');
const showResetPasswordLink = document.getElementById('show-reset-password');
const showLoginFromResetLink = document.getElementById('show-login-from-reset');
const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const registerUsernameInput = document.getElementById('register-username');
const registerEmailInput = document.getElementById('register-email');
const registerPasswordInput = document.getElementById('register-password');
const registerConfirmPasswordInput = document.getElementById('register-confirm-password');
const resetEmailInput = document.getElementById('reset-email');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const resetPasswordBtn = document.getElementById('reset-password-btn');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const messagesContainer = document.getElementById('messages-container');
const usersList = document.getElementById('users-list');
const currentUserAvatar = document.getElementById('current-user-avatar');
const currentUserName = document.getElementById('current-user-name');
const userListView = document.getElementById('user-list-view');
const privateChatView = document.getElementById('private-chat-view');
const privateChatTitle = document.getElementById('private-chat-title');
const backToUsersBtn = document.getElementById('back-to-users');
const privateMessagesContainer = document.getElementById('private-messages-container');

// Current user data
let currentUser = null;
let users = {};
let currentPrivateChat = null;
let unreadMessages = {}; // Track unread messages by user ID
let notificationSound = null; // Will be initialized in DOMContentLoaded
let notificationContainer = document.getElementById('notification-container');
let displayedMessageIds = new Set(); // Track displayed message IDs to prevent duplicates
let notificationPermission = false; // Track if browser notifications are permitted
let notificationVolume = 0.5; // Default notification volume (50%)

// Add inactivity timer
let inactivityTimer;
const INACTIVITY_TIMEOUT = 180000; // 3 minutes in milliseconds

// Event Listeners
showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    resetPasswordForm.classList.add('hidden');
});

showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    resetPasswordForm.classList.add('hidden');
});

showResetPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.add('hidden');
    registerForm.classList.add('hidden');
    resetPasswordForm.classList.remove('hidden');
});

showLoginFromResetLink.addEventListener('click', (e) => {
    e.preventDefault();
    resetPasswordForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
});

loginBtn.addEventListener('click', handleLogin);
registerBtn.addEventListener('click', handleRegister);
resetPasswordBtn.addEventListener('click', handlePasswordReset);
sendBtn.addEventListener('click', sendPrivateMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendPrivateMessage();
    }
});
backToUsersBtn.addEventListener('click', showUserList);

// Handle registration
async function handleRegister() {
    const username = registerUsernameInput.value.trim();
    const email = registerEmailInput.value.trim();
    const password = registerPasswordInput.value;
    const confirmPassword = registerConfirmPasswordInput.value;

    if (!username || !email || !password || !confirmPassword) {
        alert('Please fill in all fields');
        return;
    }

    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }

    if (password.length < 6) {
        alert('Password should be at least 6 characters long');
        return;
    }

    try {
        // Create user with email and password
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Create user profile in Firestore
        await db.collection('users').doc(user.uid).set({
            username: username,
            email: email,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'online',
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });

        currentUser = {
            id: user.uid,
            username: username,
            email: email
        };

        // Update UI
        updateUIAfterLogin();
        
        // Listen for users and messages
        listenForUsers();
        listenForMessages();
        
        // Start heartbeat
        startHeartbeat();

    } catch (error) {
        console.error("Error during registration:", error);
        let errorMessage = 'Registration failed. ';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage += 'This email is already registered. Please use a different email or try logging in.';
                break;
            case 'auth/invalid-email':
                errorMessage += 'Please enter a valid email address.';
                break;
            case 'auth/operation-not-allowed':
                errorMessage += 'Email/password accounts are not enabled. Please contact support.';
                break;
            case 'auth/weak-password':
                errorMessage += 'Please choose a stronger password.';
                break;
            default:
                errorMessage += 'Please try again later.';
        }
        
        alert(errorMessage);
    }
}

// Handle login
async function handleLogin() {
    const email = loginEmailInput.value.trim();
    const password = loginPasswordInput.value;

    if (!email || !password) {
        alert('Please fill in all fields');
        return;
    }

    try {
        // Sign in with email and password
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Get user profile from Firestore
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();

        currentUser = {
            id: user.uid,
            username: userData.username,
            email: userData.email
        };

        // Update user status to online
        await db.collection('users').doc(user.uid).update({
            status: 'online',
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Update UI
        updateUIAfterLogin();
        
        // Listen for users and messages
        listenForUsers();
        listenForMessages();
        
        // Start heartbeat
        startHeartbeat();

    } catch (error) {
        console.error("Error during login:", error);
        let errorMessage = 'Login failed. ';
        
        switch (error.code) {
            case 'auth/invalid-email':
                errorMessage += 'Please enter a valid email address.';
                break;
            case 'auth/user-disabled':
                errorMessage += 'This account has been disabled. Please contact support.';
                break;
            case 'auth/user-not-found':
                errorMessage += 'No account found with this email. Please check your email or register.';
                break;
            case 'auth/wrong-password':
                errorMessage += 'Incorrect password. Please try again.';
                break;
            default:
                errorMessage += 'Please check your credentials and try again.';
        }
        
        alert(errorMessage);
    }
}

// Handle password reset
async function handlePasswordReset() {
    const email = resetEmailInput.value.trim();

    if (!email) {
        alert('Please enter your email address');
        return;
    }

    try {
        await auth.sendPasswordResetEmail(email);
        alert('Password reset email sent! Please check your inbox.');
        // Switch back to login form
        resetPasswordForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        resetEmailInput.value = '';
    } catch (error) {
        console.error("Error during password reset:", error);
        let errorMessage = 'Password reset failed. ';
        
        switch (error.code) {
            case 'auth/invalid-email':
                errorMessage += 'Please enter a valid email address.';
                break;
            case 'auth/user-not-found':
                errorMessage += 'No account found with this email.';
                break;
            default:
                errorMessage += 'Please try again later.';
        }
        
        alert(errorMessage);
    }
}

// Update UI after login
function updateUIAfterLogin() {
    loginScreen.classList.add('hidden');
    chatScreen.classList.remove('hidden');
    
    // Set current user info
    currentUserAvatar.textContent = currentUser.username.charAt(0).toUpperCase();
    currentUserName.textContent = currentUser.username;
    
    // Set initial status class for current user
    currentUserAvatar.classList.add('online');
    
    // Clear inputs
    loginEmailInput.value = '';
    loginPasswordInput.value = '';
    registerUsernameInput.value = '';
    registerEmailInput.value = '';
    registerPasswordInput.value = '';
    registerConfirmPasswordInput.value = '';
    
    // Show user list view
    showUserList();
    
    // Request notification permission
    requestNotificationPermission();
    
    // Start heartbeat
    startHeartbeat();
    
    // Setup activity listeners
    setupActivityListeners();
    resetInactivityTimer();
}

// Request notification permission
function requestNotificationPermission() {
    if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
            notificationPermission = permission === 'granted';
            console.log('Notification permission:', permission);
        });
    }
}

// Listen for users
function listenForUsers() {
    db.collection('users')
        .onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                const userData = change.doc.data();
                const userId = change.doc.id;
                
                if (change.type === 'added' || change.type === 'modified') {
                    users[userId] = {
                        id: userId,
                        ...userData
                    };
                } else if (change.type === 'removed') {
                    delete users[userId];
                }
                
                updateUsersList();
            });
        });
}

// Update users list in UI
function updateUsersList() {
    usersList.innerHTML = '';
    
    Object.values(users).forEach(user => {
        if (user.id !== currentUser.id) {
            const li = document.createElement('li');
            li.id = `user-${user.id}`;
            
            // Determine status class based on user status
            let statusClass = 'away';
            if (user.status === 'online') {
                statusClass = 'online';
            }
            
            li.innerHTML = `
                <div class="user-info">
                    <div class="user-avatar">${user.username.charAt(0).toUpperCase()}</div>
                    <span class="user-name">${user.username}</span>
                </div>
                <span class="user-status ${statusClass}"></span>
            `;
            
            li.addEventListener('click', () => openPrivateChat(user));
            usersList.appendChild(li);
            
            // Add unread indicator if needed
            if (unreadMessages[user.id] && unreadMessages[user.id] > 0) {
                updateUnreadIndicator(user.id);
            }
        }
    });
}

// Listen for messages
function listenForMessages() {
    db.collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const messageData = change.doc.data();
                    const messageId = change.doc.id;
                    
                    // Check if this message has already been displayed
                    if (!displayedMessageIds.has(messageId)) {
                        displayedMessageIds.add(messageId);
                        displayMessage(messageData);
                        
                        // Play notification sound for all messages not from current user
                        if (messageData.userId !== currentUser.id) {
                            // Play notification sound
                            playNotificationSound();
                            
                            // Show notification for public messages
                            const sender = users[messageData.userId];
                            if (sender) {
                                showNotification(sender.username, messageData.text);
                            }
                        }
                    }
                }
            });
            
            // Scroll to bottom
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        });
}

// Send message
function sendMessage() {
    const messageText = messageInput.value.trim();
    if (!messageText || !currentUser) return;
    
    // Add message to Firestore
    db.collection('messages').add({
        text: messageText,
        userId: currentUser.id,
        username: currentUser.username,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        // Clear input
        messageInput.value = '';
    })
    .catch(error => {
        console.error("Error sending message: ", error);
        alert("Failed to send message. Please try again.");
    });
}

// Display message in UI
function displayMessage(messageData) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    
    // Determine if message is sent or received
    if (messageData.userId === currentUser.id) {
        messageElement.classList.add('sent');
    } else {
        messageElement.classList.add('received');
    }
    
    // Format timestamp
    const timestamp = messageData.timestamp ? 
        new Date(messageData.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 
        'Just now';
    
    // Set message content
    messageElement.innerHTML = `
        <div class="username">${messageData.username}</div>
        <div class="text">${messageData.text}</div>
        <div class="timestamp">${timestamp}</div>
    `;
    
    // Add to messages container
    messagesContainer.appendChild(messageElement);
}

// Show user list view
function showUserList() {
    userListView.classList.remove('hidden');
    privateChatView.classList.add('hidden');
    currentPrivateChat = null;
    privateMessagesContainer.innerHTML = '';
    messageInput.value = '';
}

// Open private chat
function openPrivateChat(otherUser) {
    console.log("Opening private chat with user:", otherUser);
    
    if (!otherUser || !otherUser.id) {
        console.error("Invalid user data:", otherUser);
        return;
    }
    
    // If we're already in a chat with this user, don't reopen it
    if (currentPrivateChat && currentPrivateChat.id === otherUser.id) {
        console.log("Already in chat with this user");
        return;
    }
    
    currentPrivateChat = otherUser;
    privateChatTitle.textContent = `Chat with ${otherUser.username}`;
    userListView.classList.add('hidden');
    privateChatView.classList.remove('hidden');
    privateMessagesContainer.innerHTML = '';
    messageInput.value = '';
    
    // Mark messages as read
    if (unreadMessages[otherUser.id]) {
        unreadMessages[otherUser.id] = 0;
        updateUnreadIndicator(otherUser.id);
    }
    
    // Load private messages
    loadPrivateMessages(otherUser.id);
}

// Generate chat ID
function generateChatId(uid1, uid2) {
    return [uid1, uid2].sort().join('_');
}

// Load private messages
function loadPrivateMessages(otherUserId) {
    const chatId = generateChatId(currentUser.id, otherUserId);
    
    // Clear the private messages container
    privateMessagesContainer.innerHTML = '';
    
    // Create a new Set for this chat to track displayed messages
    const privateDisplayedMessageIds = new Set();
    
    // Remove any existing listeners for this chat to prevent duplicates
    if (window.privateChatListeners && window.privateChatListeners[chatId]) {
        window.privateChatListeners[chatId]();
        delete window.privateChatListeners[chatId];
    }
    
    // Initialize the listeners object if it doesn't exist
    if (!window.privateChatListeners) {
        window.privateChatListeners = {};
    }
    
    // Store the unsubscribe function for this chat
    window.privateChatListeners[chatId] = db.collection('private_chats')
        .doc(chatId)
        .collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const messageData = change.doc.data();
                    const messageId = change.doc.id;
                    
                    // Check if this message has already been displayed
                    if (!privateDisplayedMessageIds.has(messageId)) {
                        privateDisplayedMessageIds.add(messageId);
                        displayPrivateMessage(messageData);
                    }
                }
            });
            
            // Scroll to bottom
            privateMessagesContainer.scrollTop = privateMessagesContainer.scrollHeight;
        });
}

// Send private message
async function sendPrivateMessage() {
    if (!currentPrivateChat || !currentUser) return;
    
    const messageText = messageInput.value.trim();
    if (!messageText) return;
    
    const chatId = generateChatId(currentUser.id, currentPrivateChat.id);
    
    try {
        await db.collection('private_chats')
            .doc(chatId)
            .collection('messages')
            .add({
                text: messageText,
                senderId: currentUser.id,
                senderName: currentUser.username,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        messageInput.value = '';
    } catch (error) {
        console.error("Error sending private message:", error);
        alert("Failed to send message. Please try again.");
    }
}

// Display private message
function displayPrivateMessage(messageData) {
    console.log("Displaying private message:", messageData);
    
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    
    if (messageData.senderId === currentUser.id) {
        messageElement.classList.add('sent');
    } else {
        messageElement.classList.add('received');
        
        // Check if we're in a private chat with the sender
        const isInPrivateChatWithSender = currentPrivateChat && currentPrivateChat.id === messageData.senderId;
        
        // Play notification sound for all received messages, even if in chat with sender
        playNotificationSound();
        
        // Only show notification and increment unread count if we're not in a private chat with the sender
        if (!isInPrivateChatWithSender) {
            console.log("Message is from another user, incrementing unread count");
            
            if (!unreadMessages[messageData.senderId]) {
                unreadMessages[messageData.senderId] = 0;
            }
            unreadMessages[messageData.senderId]++;
            
            console.log("Updated unread count for user:", messageData.senderId, "New count:", unreadMessages[messageData.senderId]);
            
            // Update unread indicator
            updateUnreadIndicator(messageData.senderId);
            
            // Show notification for new message
            const sender = users[messageData.senderId];
            if (sender) {
                console.log("Showing notification for message from:", sender.username);
                showNotification(sender.username, messageData.text);
            } else {
                console.log("Sender not found in users list:", messageData.senderId);
            }
        } else {
            console.log("Message is from current chat, not showing notification");
        }
    }
    
    const timestamp = messageData.timestamp ? 
        new Date(messageData.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 
        'Just now';
    
    messageElement.innerHTML = `
        <div class="text">${messageData.text}</div>
        <div class="timestamp">${timestamp}</div>
    `;
    
    privateMessagesContainer.appendChild(messageElement);
}

// Handle user leaving
window.addEventListener('beforeunload', () => {
    if (currentUser) {
        db.collection('users').doc(currentUser.id).update({
            status: 'away',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(error => {
            console.error("Error updating status:", error);
        });
    }
});

// Add visibility change detection
document.addEventListener('visibilitychange', () => {
    if (currentUser) {
        if (document.hidden) {
            // User switched tabs or minimized window
            db.collection('users').doc(currentUser.id).update({
                status: 'away',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Update UI status
            currentUserAvatar.classList.remove('online');
            currentUserAvatar.classList.add('away');
        } else {
            // User returned to the tab
            db.collection('users').doc(currentUser.id).update({
                status: 'online',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Update UI status
            currentUserAvatar.classList.remove('away');
            currentUserAvatar.classList.add('online');
        }
    }
});

// Add connection status detection
window.addEventListener('online', () => {
    if (currentUser) {
        db.collection('users').doc(currentUser.id).update({
            status: 'online',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
});

window.addEventListener('offline', () => {
    if (currentUser) {
        db.collection('users').doc(currentUser.id).update({
            status: 'away',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
});

// Add heartbeat to detect disconnections
let heartbeatInterval;

function startHeartbeat() {
    if (currentUser) {
        // Clear any existing interval
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
        }
        
        // Set up a new heartbeat interval (every 30 seconds)
        heartbeatInterval = setInterval(() => {
            if (currentUser) {
                db.collection('users').doc(currentUser.id).update({
                    lastSeen: firebase.firestore.FieldValue.serverTimestamp()
                }).catch(error => {
                    console.error("Heartbeat error:", error);
                    // If we can't update, user might be offline
                    clearInterval(heartbeatInterval);
                });
            }
        }, 30000);
    }
}

// Function to reset inactivity timer
function resetInactivityTimer() {
    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
    }
    
    if (currentUser) {
        // Update status to online
        currentUserAvatar.classList.remove('away');
        currentUserAvatar.classList.add('online');
        
        inactivityTimer = setTimeout(async () => {
            try {
                await db.collection('users').doc(currentUser.id).update({
                    status: 'away',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                // Update UI status
                currentUserAvatar.classList.remove('online');
                currentUserAvatar.classList.add('away');
            } catch (error) {
                console.error("Error updating status:", error);
            }
        }, INACTIVITY_TIMEOUT);
    }
}

// Add activity listeners
function setupActivityListeners() {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
        document.addEventListener(event, () => {
            if (currentUser) {
                // Reset the timer on any user activity
                resetInactivityTimer();
                
                // If user was offline, set them back to online
                db.collection('users').doc(currentUser.id).get().then(doc => {
                    if (doc.exists && doc.data().status === 'offline') {
                        db.collection('users').doc(currentUser.id).update({
                            status: 'online',
                            timestamp: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        
                        // Update UI status
                        currentUserAvatar.classList.remove('away');
                        currentUserAvatar.classList.add('online');
                    }
                });
            }
        });
    });
}

// Show notification for new message
function showNotification(senderName, messageText) {
    // Always play sound when a message is received
    playNotificationSound();

    // Only show in-app notification if tab is active
    if (!document.hidden) {
        const notification = document.createElement('div');
        notification.className = 'notification';

        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-title">${senderName}</div>
                <div class="notification-message">${messageText}</div>
            </div>
            <button class="notification-close">&times;</button>
        `;

        // Add close functionality
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => {
                notification.remove();
            }, 300);
        });

        notificationContainer.appendChild(notification);

        // Auto remove after 5s
        setTimeout(() => {
            if (notification.parentNode === notificationContainer) {
                notification.style.animation = 'fadeOut 0.3s ease-out';
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }
        }, 5000);
    }

    // Show browser notification if tab is hidden
    if (document.hidden && notificationPermission) {
        try {
            const browserNotification = new Notification(`${senderName} sent you a message`, {
                body: messageText,
                icon: '/favicon.ico'
            });

            browserNotification.onclick = function () {
                window.focus();
                this.close();
            };
        } catch (e) {
            console.log('Error showing browser notification:', e);
        }
    }
}

// Play notification sound
function playNotificationSound() {
    try {
        if (notificationSound) {
            // Reset the audio to the beginning
            notificationSound.currentTime = 0;
            
            // Set volume to a reasonable level
            notificationSound.volume = 0.5;
            
            // Play the sound with a promise to handle autoplay restrictions
            const playPromise = notificationSound.play();
            
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        console.log("Notification sound played successfully");
                    })
                    .catch(error => {
                        console.log('Error playing notification sound:', error);
                        // Try to play again with user interaction if autoplay was blocked
                        if (error.name === 'NotAllowedError') {
                            console.log('Autoplay blocked. Sound will play on next user interaction.');
                        }
                    });
            }
        } else {
            console.log("Notification sound element not found");
        }
    } catch (e) {
        console.log('Error with notification sound:', e);
    }
}

// Initialize notification sound when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Get the notification sound element
    notificationSound = document.getElementById('notification-sound');
    
    // Set default volume
    if (notificationSound) {
        notificationSound.volume = 0.5; // 50% volume by default
        
        // Test the sound to ensure it works
        // This will only play if the user has interacted with the page
        document.addEventListener('click', function testSound() {
            // Play the sound once
            notificationSound.play().catch(e => console.log('Error testing sound:', e));
            
            // Remove the event listener after first click
            document.removeEventListener('click', testSound);
        }, { once: true });
    }
    
    // Request notification permission
    requestNotificationPermission();
});

// Update unread message indicator
function updateUnreadIndicator(userId) {
    console.log("Updating unread indicator for user:", userId, "Count:", unreadMessages[userId]);
    
    const userElement = document.querySelector(`#user-${userId}`);
    if (!userElement) {
        console.log("User element not found:", userId);
        return;
    }
    
    if (unreadMessages[userId] && unreadMessages[userId] > 0) {
        console.log("Adding unread indicator for user:", userId);
        
        // Add unread badge if not already present
        if (!userElement.querySelector('.unread-indicator')) {
            const badge = document.createElement('span');
            badge.className = 'unread-indicator';
            badge.textContent = unreadMessages[userId] > 9 ? '9+' : unreadMessages[userId];
            userElement.appendChild(badge);
        } else {
            // Update existing badge
            const badge = userElement.querySelector('.unread-indicator');
            badge.textContent = unreadMessages[userId] > 9 ? '9+' : unreadMessages[userId];
        }
        
        // Add bold style
        userElement.classList.add('has-unread');
        
        // Make sure the user name is bold
        const userNameElement = userElement.querySelector('.user-name');
        if (userNameElement) {
            userNameElement.style.fontWeight = 'bold';
            userNameElement.style.color = '#4a90e2';
        }
    } else {
        console.log("Removing unread indicator for user:", userId);
        
        // Remove unread badge and bold style
        const badge = userElement.querySelector('.unread-indicator');
        if (badge) badge.remove();
        userElement.classList.remove('has-unread');
        
        // Reset the user name style
        const userNameElement = userElement.querySelector('.user-name');
        if (userNameElement) {
            userNameElement.style.fontWeight = 'normal';
            userNameElement.style.color = '';
        }
    }
} 