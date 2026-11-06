/* =========================================
   PLAYHUB SHARED SDK
   Version: 1.0.0
   Purpose: Common interface for all games
========================================= */

(function (window) {
  "use strict";

  // Prevent duplicate SDK initialization
  if (window.PlayHub) {
    console.warn("PlayHub SDK is already initialized.");
    return;
  }

  const VERSION = "1.0.0";

  // Future services will connect through these adapters
  const providers = {
    auth: null,
    multiplayer: null,
    friends: null,
    currency: null
  };

  // Internal event system
  const events = new Map();

  function emit(eventName, data) {
    const listeners = events.get(eventName);

    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error("PlayHub event error:", error);
        }
      });
    }

    window.dispatchEvent(
      new CustomEvent("playhub:" + eventName, {
        detail: data
      })
    );
  }

  function on(eventName, callback) {
    if (typeof callback !== "function") {
      throw new TypeError("Callback must be a function.");
    }

    if (!events.has(eventName)) {
      events.set(eventName, new Set());
    }

    events.get(eventName).add(callback);

    return function unsubscribe() {
      events.get(eventName)?.delete(callback);
    };
  }

  // Safe provider registration for future Firebase,
  // multiplayer and other integrations.
  function registerProvider(name, provider) {
    if (!Object.prototype.hasOwnProperty.call(providers, name)) {
      throw new Error("Unknown PlayHub provider: " + name);
    }

    if (!provider || typeof provider !== "object") {
      throw new TypeError("Invalid provider.");
    }

    providers[name] = provider;

    emit("provider-ready", { name });
  }

  function requireMethod(provider, method, serviceName) {
    if (!provider || typeof provider[method] !== "function") {
      throw new Error(
        serviceName + " is not connected yet."
      );
    }

    return provider[method].bind(provider);
  }

  // USER / ACCOUNT SERVICE
  const user = {
    async getProfile() {
      if (!providers.auth) return null;

      return requireMethod(
        providers.auth,
        "getProfile",
        "Authentication"
      )();
    },

    async getId() {
      const profile = await this.getProfile();
      return profile?.uid || null;
    },

    onAuthStateChanged(callback) {
      if (providers.auth &&
          typeof providers.auth.onAuthStateChanged === "function") {
        return providers.auth.onAuthStateChanged(callback);
      }

      callback(null);
      return function () {};
    },

    isLoggedIn() {
      return this.getProfile().then(profile => !!profile);
    }
  };

  // MULTIPLAYER SERVICE
  const multiplayer = {
    async joinRoom(options = {}) {
      return requireMethod(
        providers.multiplayer,
        "joinRoom",
        "Multiplayer"
      )(options);
    },

    async leaveRoom() {
      if (!providers.multiplayer) return;

      return requireMethod(
        providers.multiplayer,
        "leaveRoom",
        "Multiplayer"
      )();
    },

    on(eventName, callback) {
      return on("multiplayer:" + eventName, callback);
    }
  };

  // FRIENDS SERVICE
  const friends = {
    async getList() {
      return requireMethod(
        providers.friends,
        "getList",
        "Friends"
      )();
    },

    async sendRequest(userId) {
      return requireMethod(
        providers.friends,
        "sendRequest",
        "Friends"
      )(userId);
    }
  };

  // CURRENCY SERVICE
  const currency = {
    async getBalance() {
      return requireMethod(
        providers.currency,
        "getBalance",
        "Currency"
      )();
    }
  };

  // PUBLIC SDK
  const PlayHub = {
    version: VERSION,

    user,
    multiplayer,
    friends,
    currency,

    on,
    emit,

    ready() {
      return Promise.resolve({
        version: VERSION,
        initialized: true
      });
    },

    getServiceStatus() {
      return Object.keys(providers).reduce((result, name) => {
        result[name] = !!providers[name];
        return result;
      }, {});
    },

    // Reserved for future official integrations.
    // Individual games should not register trusted
    // authentication or payment providers themselves.
    _registerProvider: registerProvider
  };

  Object.freeze(PlayHub);

  window.PlayHub = PlayHub;

  console.log(
    "PlayHub SDK initialized successfully. Version:",
    VERSION
  );

})(window);
