//==========================================================================================
// AUDIO SETUP
//==========================================================================================
let dspNode = null;
let dspNodeParams = null;
let jsonParams = null;

const dspName = "bells";
const instance = new FaustWasm2ScriptProcessor(dspName);

if (typeof module === "undefined") {
    window[dspName] = instance;
} else {
    const exp = {};
    exp[dspName] = instance;
    module.exports = exp;
}

bells.createDSP(audioContext, 1024)
    .then(node => {
        dspNode = node;
        dspNode.connect(audioContext.destination);
        console.log('params: ', dspNode.getParams());
        const jsonString = dspNode.getJSON();
        jsonParams = JSON.parse(jsonString)["ui"][0]["items"];
        dspNodeParams = jsonParams;
        onDspReady();
    });

// Finds the full parameter address whose last part matches `suffix`
// (e.g. "density" -> "/rain/density"), so we don't depend on group names.
function findAddress(suffix) {
    const params = dspNode ? dspNode.getParams() : [];
    const hit = params.find(a => a.endsWith("/" + suffix));
    if (!hit) console.warn("Parameter not found:", suffix, "available:", params);
    return hit;
}

function setParam(suffix, value) {
    const addr = findAddress(suffix);
    if (addr) dspNode.setParamValue(addr, value);
}

function audioOn() {
    return dspNode && audioContext.state !== 'suspended';
}

function getMinMaxParam(address) {
    const p = findByAddress(dspNodeParams, address);
    return getParamMinMax(p);
}

function deviceMoved() {
    movetimer = millis();
    statusLabels[2].style("color", "pink");
}

function deviceTurned() {
    threshVals[1] = turnAxis;
}

//==========================================================================================
// INTERACTION 2: phone FREE FALLS for more than 30 cm  ->  BELLS (bells.wasm)
// Use case: drop alarm / fall detection (e.g. for elderly people, or to find a dropped
// phone). A bell is a universally understood alert signal, clearly audible and distinct
// from everyday sounds, so it is ideal to call attention to the event.
//==========================================================================================
// In free fall the accelerometer (including gravity) reads close to 0.
// Falling 30 cm takes about sqrt(2*0.3/9.81) = 0.25 s, so we require ~0.22 s of free fall.
let fallStart = null;
let lastRing = 0;

window.addEventListener("devicemotion", (e) => {
    const a = e.accelerationIncludingGravity;
    if (!a || a.x === null) return;
    const mag = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
    const now = performance.now();
    if (mag < 3) {                              // much less than gravity (9.81) -> falling
        if (fallStart === null) fallStart = now;
        if (now - fallStart > 220 && now - lastRing > 1500) {
            lastRing = now;
            ringBell();
        }
    } else {
        fallStart = null;
    }
});

function onDspReady() {
    // sharper, brighter strike -> sounds more like an alarm bell than a soft, ethereal church bell
    dspNode.setParamValue("/englishBell/strikeSharpness", 3);
    dspNode.setParamValue("/englishBell/strikeCutOff", 12000);
    dspNode.setParamValue("/englishBell/strikePosition", 2);
}

function strike() {
    dspNode.setParamValue("/englishBell/gate", 1);
    setTimeout(() => dspNode.setParamValue("/englishBell/gate", 0), 60);
}

// Alarm pattern: three quick strikes "ding-ding-ding" (urgent, like an alarm)
function ringBell() {
    if (!audioOn()) return;
    strike();
    setTimeout(strike, 250);
    setTimeout(strike, 500);
}

function accelerationChange(accx, accy, accz) {}
function rotationChange(rotx, roty, rotz) {}

function deviceShaken() {
    shaketimer = millis();
    statusLabels[0].style("color", "pink");
}

// Desktop testing: click = bell
function mousePressed() { ringBell(); }
