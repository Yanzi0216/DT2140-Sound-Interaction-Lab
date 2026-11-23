//==========================================================================================
// AUDIO SETUP
//==========================================================================================
let dspNode = null;
let dspNodeParams = null;
let jsonParams = null;

const dspName = "drop";
const instance = new FaustWasm2ScriptProcessor(dspName);

if (typeof module === "undefined") {
    window[dspName] = instance;
} else {
    const exp = {};
    exp[dspName] = instance;
    module.exports = exp;
}

drop.createDSP(audioContext, 1024)
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
// INTERACTION 1: phone used as a LEVEL (spirit level)  ->  BUBBLES (drop.wasm)
// Use case: hanging a shelf without looking at the screen. Like the air bubble in a
// real spirit level: the more the surface is tilted, the faster and higher-pitched the
// bubbles. When the surface is level, it goes silent.
//==========================================================================================
let lastBubble = 0;
let fMin = 150, fMax = 2000;

function onDspReady() {
    const [mn, mx] = getMinMaxParam("/drop/freq/0x00");
    if (mn !== undefined) { fMin = mn; fMax = mx; }
}

function accelerationChange(accx, accy, accz) {}

function rotationChange(rotx, roty, rotz) {
    if (!audioOn()) return;
    const tilt = Math.max(Math.abs(rotx), Math.abs(roty));   // 0 when lying flat
    if (tilt < 2) return;                                     // level -> silence
    const t = Math.min(tilt, 30) / 30;                        // 0..1
    const interval = 600 - 520 * t;                           // 600 ms .. 80 ms between bubbles
    if (millis() - lastBubble > interval) {
        lastBubble = millis();
        dspNode.setParamValue("/drop/freq/0x00", fMin + (Math.min(fMax, 1500) - fMin) * t);
        playBubble();
    }
}

function playBubble() {
    dspNode.setParamValue("/drop/drop", 1);
    setTimeout(() => dspNode.setParamValue("/drop/drop", 0), 30);
}

function deviceShaken() {
    shaketimer = millis();
    statusLabels[0].style("color", "pink");
}

// Desktop testing: click = one bubble, pitch from mouse x-position
function mousePressed() {
    if (!audioOn()) return;
    dspNode.setParamValue("/drop/freq/0x00", fMin + (Math.min(fMax, 1500) - fMin) * (mouseX / windowWidth));
    playBubble();
}
