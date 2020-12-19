var Service, Characteristic;
var rpi433 = require('rpi-433-v3');

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerPlatform("homebridge-homelink", "HomeLink", HomeLinkPlatform);
};

function HomeLinkPlatform(log, config) {
    var self = this;
    self.config = config;
    self.log = log;
    self.pin = config["pin"] || 2; // Listen on GPIO 2 (or Physical PIN 13)
    self.delay = config["debounceDelay"] || 300;

    self.rfSniffer = rpi433.sniffer({
            pin: self.pin,                     
            debounceDelay: self.delay          
        });

    self.rfSniffer.on('data', function (data) {
        self.log('Code received: '+ data.code +' pulse length : ' + data.pulseLength);
        if(self.accessories) {
            self.accessories.forEach(function(accessory) {
                accessory.notify.call(accessory, data.code);
            });
        }
    });
}

HomeLinkPlatform.prototype.accessories = function(callback) {
    var self = this;
    self.accessories = [];
    self.config.buttons.forEach(function(button) {
        self.accessories.push(new HomeLinkAccessory(button, self.log, self.config));
    });

    callback(self.accessories);
};

function HomeLinkAccessory(button, log, config) {
    var self = this;
    self.name = button.name;
    self.button = button;
    self.log = log;
    self.config = config;

    self.service = new Service.StatelessProgrammableSwitch(self.name);
    self.service.getCharacteristic(Characteristic.ProgrammableSwitchEvent).setProps({maxValue: 0}); // Single tap only
}

HomeLinkAccessory.prototype.pressed = function() {
    var self = this;
    self.log("%s pressed", self.button.name);
    self.service.getCharacteristic(Characteristic.ProgrammableSwitchEvent).setValue(0 /* BUTTON PRESSED EVENT */);
};

HomeLinkAccessory.prototype.notify = function(code) {
    var self = this;
    if(self.button.codes.indexOf(code) !== -1) {
        self.pressed();
    }
};

HomeLinkAccessory.prototype.getServices = function() {
    return [this.service];
};
