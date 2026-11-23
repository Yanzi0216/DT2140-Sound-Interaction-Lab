//==========================================================================================
// AUDIO SETUP
//==========================================================================================
let dspNode = null;
let dspNodeParams = null;
let jsonParams = null;

const dspName = "brass";
const instance = new FaustWasm2ScriptProcessor(dspName);

if (typeof module === "undefined") {
    window[dspName] = instance;
} else {
    const exp = {};
    exp[dspName] = instance;
    module.exports = exp;
}

brass.createDSP(audioContext, 1024)
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
// INTERACTION 3: phone POINTED STRAIGHT UP  ->  BRASS (brass.wasm)
// Use case: a "virtual trumpet" / fanfare. Raising the phone towards the sky imitates
// lifting a trumpet to announce something. The closer the phone points straight up,
// the stronger you "blow" (higher breath pressure = louder brass); lowering it stops the sound.
//==========================================================================================
let pMin = 0, pMax = 1;

function onDspReady() {
    const [mn, mx] = getMinMaxParam("/brass/blower/pressure");
    if (mn !== undefined) { pMin = mn; pMax = mx; }
    dspNode.setParamValue("/brass/blower/pressure", 0);
    dspNode.setParamValue("/brass/brassModel/mute", 0);   // open (louder) trumpet
}

// The brass model only starts sounding above a certain breath pressure,
// so t = 0 -> silence, t > 0 -> pressure from 0.55 (soft) to 1.0 (full).
function blow(t) {
    dspNode.setParamValue("/brass/blower/pressure", t <= 0 ? 0 : 0.55 + 0.45 * t);
}

function accelerationChange(accx, accy, accz) {}

function rotationChange(rotx, roty, rotz) {
    if (!audioOn()) return;
    // rotationX is ~0 when flat and ~90 when the phone's top points straight up
    const t = constrain((rotx - 50) / 40, 0, 1);   // 50 deg -> silent, 90 deg -> full
    blow(t);
}

function deviceShaken() {
    shaketimer = millis();
    statusLabels[0].style("color", "pink");
}

// Desktop testing: hold mouse = blow, strength from mouse x-position
function mousePressed() {
    if (!audioOn()) return;
    blow(0.05 + 0.95 * (mouseX / windowWidth));
}
function mouseReleased() {
    if (!audioOn()) return;
    blow(0);
}
