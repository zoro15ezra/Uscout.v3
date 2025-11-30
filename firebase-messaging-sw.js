/* firebase-messaging-sw.js */
importScripts("https://www.gstatic.com/firebasejs/11.1.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.1.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "YOUR_API_KEY",
  authDomain: "uscout-football-network.firebaseapp.com",
  projectId: "uscout-football-network",
  storageBucket: "uscout-football-network.appspot.com",
  messagingSenderId: "1072495022545",
  appId: "1:1072495022545:web:891dca6138f1ef691c50f0"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  const notificationTitle = payload.notification.title || "U.Scout";
  const notificationOptions = {
    body: payload.notification.body || "",
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});
