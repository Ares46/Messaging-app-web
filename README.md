# Real-time Chat Application

A simple real-time chat application built with HTML, CSS, and JavaScript using Firebase for real-time messaging capabilities.

## Features

- Real-time messaging between users
- User online/offline status
- Clean, responsive UI
- No backend server required (uses Firebase)

## Setup Instructions

1. **Create a Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable Firestore Database
   - Set up Firestore security rules to allow read/write access

2. **Configure Firebase**:
   - In your Firebase project, go to Project Settings
   - Find the Firebase configuration object
   - Replace the placeholder values in `script.js` with your actual Firebase configuration:
     ```javascript
     const firebaseConfig = {
         apiKey: "YOUR_API_KEY",
         authDomain: "YOUR_AUTH_DOMAIN",
         projectId: "YOUR_PROJECT_ID",
         storageBucket: "YOUR_STORAGE_BUCKET",
         messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
         appId: "YOUR_APP_ID"
     };
     ```

3. **Set up Firestore Security Rules**:
   - In Firebase Console, go to Firestore Database > Rules
   - Set the following rules to allow read/write access:
     ```
     rules_version = '2';
     service cloud.firestore {
       match /databases/{database}/documents {
         match /{document=**} {
           allow read, write: if true;
         }
       }
     }
     ```
   - Note: These rules allow anyone to read and write to your database. For a production app, you should implement proper authentication and more restrictive rules.

4. **Run the Application**:
   - Open `index.html` in a web browser
   - Or use a local server (e.g., Live Server in VS Code)

## Usage

1. Enter your username and click "Join Chat"
2. You'll see other online users in the sidebar
3. Type a message in the input field and press Enter or click Send
4. Messages will appear in real-time for all connected users

## Project Structure

- `index.html` - Main HTML structure
- `styles.css` - CSS styling
- `script.js` - JavaScript functionality and Firebase integration

## Technologies Used

- HTML5
- CSS3
- JavaScript (ES6+)
- Firebase (Firestore, Authentication)

## Notes

- This is a simple implementation for demonstration purposes
- For a production application, you should implement proper user authentication and more secure Firestore rules
- The current implementation stores all messages in a single collection. For a larger application, you might want to organize messages by chat rooms or conversations. 