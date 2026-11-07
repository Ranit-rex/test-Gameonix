/* ==========================================
   PLAYBRIX SDK v2.0
   Firebase Authentication + Firestore
   ========================================== */

(function () {
  "use strict";

  if (window.PlayHub) {
    console.warn("Playbrix SDK already loaded.");
    return;
  }

  const firebaseConfig = {
    apiKey: "AIzaSyB_pZ9WfVSx2XHuDeSZ7VrwEr-Pz_m_2QM",
    authDomain: "play-hub-688e8.firebaseapp.com",
    projectId: "play-hub-688e8",
    storageBucket: "play-hub-688e8.firebasestorage.app",
    messagingSenderId: "195222206861",
    appId: "1:195222206861:web:828a8cf16991f982a925c4",
    measurementId: "G-HDGCFBSDQH"
  };

  const VERSION = "2.0.0";
  const listeners = {};
  const providers = {};

  let app = null;
  let auth = null;
  let db = null;
  let currentUser = null;
  let initialized = false;
  let initializationError = null;

  function emit(event, data) {
    (listeners[event] || []).forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error("Playbrix event error:", error);
      }
    });

    window.dispatchEvent(
      new CustomEvent("playhub:" + event, { detail: data })
    );
  }

  function on(event, callback) {
    if (typeof callback !== "function") return () => {};

    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(callback);

    return function unsubscribe() {
      listeners[event] = listeners[event].filter(
        item => item !== callback
      );
    };
  }

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(
        'script[data-playhub-firebase="' + url + '"]'
      );

      if (existing) {
        if (existing.dataset.loaded === "true") {
          resolve();
          return;
        }

        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener(
          "error",
          () => reject(new Error("Firebase SDK failed to load")),
          { once: true }
        );
        return;
      }

      const script = document.createElement("script");
      script.src = url;
      script.async = true;
      script.dataset.playhubFirebase = url;

      script.onload = () => {
        script.dataset.loaded = "true";
        resolve();
      };

      script.onerror = () => {
        reject(new Error("Could not load Firebase SDK: " + url));
      };

      document.head.appendChild(script);
    });
  }

  async function initialize() {
    try {
      const base =
        "https://www.gstatic.com/firebasejs/10.14.1/";

      await loadScript(base + "firebase-app-compat.js");
      await loadScript(base + "firebase-auth-compat.js");
      await loadScript(base + "firebase-firestore-compat.js");

      if (!window.firebase) {
        throw new Error("Firebase SDK is unavailable.");
      }

      app = firebase.apps.length
        ? firebase.app()
        : firebase.initializeApp(firebaseConfig);

      auth = firebase.auth();
      db = firebase.firestore();

      await auth.setPersistence(
        firebase.auth.Auth.Persistence.LOCAL
      );

      auth.onAuthStateChanged(async user => {
        currentUser = user || null;

        if (user) {
          try {
            await createOrUpdateProfile(user);
          } catch (error) {
            console.error("Profile sync failed:", error);
            emit("profileError", error);
          }
        }

        emit("authStateChanged", getPublicUser(user));
      });

      initialized = true;
      emit("ready", { version: VERSION });

      console.log("Playbrix Firebase connected:", VERSION);

      return true;

    } catch (error) {
      initializationError = error;
      console.error("Playbrix Firebase error:", error);
      emit("error", error);
      throw error;
    }
  }

  function getPublicUser(user) {
    if (!user) return null;

    return {
      uid: user.uid,
      id: user.uid,
      displayName: user.displayName || "Player",
      email: user.email || null,
      photoURL: user.photoURL || null,
      emailVerified: user.emailVerified
    };
  }

  async function createOrUpdateProfile(user) {
    const ref = db.collection("users").doc(user.uid);
    const snapshot = await ref.get();

    const now = firebase.firestore.FieldValue.serverTimestamp();

    if (!snapshot.exists) {
      await ref.set({
        displayName: user.displayName || "Player",
        photoURL: user.photoURL || null,
        createdAt: now,
        updatedAt: now
      });

      emit("profileCreated", getPublicUser(user));
    } else {
      await ref.update({
        updatedAt: now
      });
    }
  }

  function requireFirebase() {
    if (!initialized || !auth || !db) {
      throw new Error(
        "Playbrix Firebase is not ready. Wait for Playbrix.ready()."
      );
    }
  }

  // AUTHENTICATION

  const authService = {
    async signInWithGoogle() {
      requireFirebase();

      // Google popup should be opened from the main homepage,
      // not from an embedded game iframe.
      if (window.top !== window.self) {
        throw new Error(
          "Please sign in using the main Playbrix homepage."
        );
      }

      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: "select_account"
      });

      try {
        const result = await auth.signInWithPopup(provider);
        return getPublicUser(result.user);
      } catch (error) {
        console.error("Google login failed:", error);
        throw error;
      }
    },

    async signOut() {
      requireFirebase();
      await auth.signOut();
      return true;
    },

    getCurrentUser() {
      return getPublicUser(currentUser);
    },

    onAuthStateChanged(callback) {
      requireFirebase();

      return auth.onAuthStateChanged(user => {
        callback(getPublicUser(user));
      });
    },

    isLoggedIn() {
      return !!currentUser;
    }
  };

  // PLAYER PROFILES

  const userService = {
    getId() {
      return currentUser ? currentUser.uid : null;
    },

    isLoggedIn() {
      return !!currentUser;
    },

    async getProfile() {
      requireFirebase();

      if (!currentUser) return null;

      const snapshot = await db
        .collection("users")
        .doc(currentUser.uid)
        .get();

      return snapshot.exists
        ? { uid: currentUser.uid, ...snapshot.data() }
        : null;
    },

    onAuthStateChanged(callback) {
      return authService.onAuthStateChanged(callback);
    }
  };

  // FUTURE SERVICES

  const multiplayerService = {
    async joinRoom(roomId) {
      if (!providers.multiplayer) {
        throw new Error("Multiplayer service is not connected yet.");
      }
      return providers.multiplayer.joinRoom(roomId);
    },

    async leaveRoom() {
      if (!providers.multiplayer) return false;
      return providers.multiplayer.leaveRoom();
    },

    on(event, callback) {
      if (!providers.multiplayer) return () => {};
      return providers.multiplayer.on(event, callback);
    }
  };

  const friendsService = {
    async getList() {
      if (!providers.friends) return [];
      return providers.friends.getList();
    },

    async sendRequest(userId) {
      if (!providers.friends) {
        throw new Error("Friends service is not connected yet.");
      }
      return providers.friends.sendRequest(userId);
    }
  };

  const currencyService = {
    async getBalance() {
      if (!providers.currency) return 0;
      return providers.currency.getBalance();
    }
  };

  const PlayHub = {
    version: VERSION,

    app: null,

    auth: authService,
    user: userService,
    multiplayer: multiplayerService,
    friends: friendsService,
    currency: currencyService,

    on,
    emit,

    ready() {
      return initializationPromise;
    },

    getServiceStatus() {
      return {
        firebase: initialized ? "connected" : "loading",
        authentication: initialized ? "connected" : "loading",
        firestore: initialized ? "connected" : "loading",
        multiplayer: providers.multiplayer ? "connected" : "not-connected",
        friends: providers.friends ? "connected" : "not-connected",
        currency: providers.currency ? "connected" : "not-connected",
        error: initializationError
          ? initializationError.message
          : null
      };
    },

    _registerProvider(name, provider) {
      providers[name] = provider;
    }
  };

  window.PlayHub = PlayHub;

  const initializationPromise = initialize();

})();
