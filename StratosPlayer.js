var StratosMonitor = {
    attach: function(id) {
        StratosMonitor[id] = new StratosPlayer(id, "StratosMonitor." + id);
        return this.get(id);
    },

    get: function(id) {
        return StratosMonitor[id];
    },

    // Eval function that will eval code within the context of the window.
    // Used to help the Java layer interact with the Javascript layer.

    eval: function(eval) {
        // All 
        var fn = function(w) {
            return function() {
                return w.eval(eval);
            }
        }(window);

        return fn();
    }
};

// Not to be called on it's own. Use StratosMonitor.attach();

function StratosPlayer(id, monitorName) {

    // Note: We'll need to rewrite the AS code to return these instead of create an alert (if possible).
    this.externallyAllowedEvents = [
        "playlist_loaded",
        "playback_start",
        "playback_error",
        "complete",
        "playlist_complete",
        "player_state_change",
        "muted_change",
        "volume_change",
        "current_time_change",
        "bytes_loaded_change",
        "hd_switch",
        "hd_switch_error",
        "ad_initialized",
        "ad_ended",
        "ad_expanded",
        "stream_dropped"
    ];

    // Functions that handle events. 

    this.getAvailableEvents = function() {
        this.app.getAvailableEvents();
    };

    this.setPlayerUpdateTime = function(newTime) {
        var intervalItem = document.getElementById('intervalNum');
        this.app.setPlayerUpdateTime(intervalItem.value);
    };

    this.playlistUpdate = function(playlist) {
        console.log(playlist);
        var playlistTextarea = document.getElementById('playlistText');

        playlistTextarea.value = unescape(playlist);
    };

    this.sendEvent = function(eventName) {
        this.app.sendEvent(eventName);
    };

    this.handleEvent = function(name, param1, param2) {
        this.eventList.push(new Event(name, param1, param2));
    };

    // Functions to help testing.

    this.isInitialized = function() {
        return this.app.sendEvent != null;
    };

    this.hasEvent = function(eventName) {
        // Go in reverse order to increase speed.
        var foundEvent = false;
        for (var index = this.eventList.length - 1; index >= 0; index--) {
            var event = this.eventList[index];
            if (event.name == eventName) {
                foundEvent = true;
                break;
            }
        }

        return foundEvent;
    };

    this.hasPlaybackError = function() {
        return this.hasEvent("playback_error");
    };

    // Object initialization.

    this.id = id;

    this.eventList = [];

    this.app = window[this.id] || document[this.id];

    if (!this.isInitialized()) {
        throw "Player '" + this.id + "' did not initialize correctly or is not a Stratos player.";
    }

    // Dynamically create functions for each externally allowed events, passing in the event name.
    for (var index = 0; index < this.externallyAllowedEvents.length; index++) {
        var eventName = this.externallyAllowedEvents[index];
        var fnNameItems = eventName.split("_");

        // Capitalize each part.
        for (var itemIndex = 0; itemIndex < fnNameItems.length; itemIndex++) {
            var item = fnNameItems[itemIndex];
            fnNameItems[itemIndex] = item.charAt(0).toUpperCase() + item.slice(1);
        }

        var fnName = "handle" + fnNameItems.join("");

        // Create the function, paying attention to the closure.
        var player = this;
        this[fnName] = function(eventName) {
            // This is the function that the AS interface will call.
            return function(param1, param2) {
                player.handleEvent(eventName, param1, param2);
            };
        }(eventName); // <-- Note: function that returns a function, for closure purposes.

        this.app.addJScallback(this.externallyAllowedEvents[index], monitorName + "." + fnName);
    };

    return true;
};

var Event = function(name, param1, param2) {
    this.name = name;
    this.param1 = param1;
    this.param2 = param2;
};
