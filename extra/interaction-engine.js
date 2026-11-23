//==========================================================================================
// AUDIO SETUP
//==========================================================================================
let dspNode = null;
let dspNodeParams = null;
let jsonParams = null;

const dspName = "engine";
const instance = new FaustWasm2ScriptProcessor(dspName);

if (typeof module === "undefined") {
    window[dspName] = instance;
} else {
    const exp = {};
    exp[dspName] = instance;
    module.exports = exp;
}

engine.createDSP(audioContext, 1024)
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
// INTERACTION 3: phone SPUN while lying flat on a table  ->  ENGINE
// Use case: like revving a motor / a spinning-top game. The faster the phone spins,
// the higher the engine speed; when it stops spinning the engine winds down.
//==========================================================================================
let lastRotZ = null;
let spinSpeed = 0;       // smoothed degrees per frame

function onDspReady() {
    setParam("runtime", 0.5);     // react quickly instead of a 5 s start-up
    setParam("volume", 0.6);
    setParam("gate", 0);
}

function accelerationChange(accx, accy, accz) {}

function rotationChange(rotx, roty, rotz) {
    if (!audioOn()) return;
    if (lastRotZ !== null) {
        let d = rotz - lastRotZ;
        if (d > 180) d -= 360;          // handle the jump at +-180 degrees
        if (d < -180) d += 360;
        spinSpeed = spinSpeed * 0.85 + Math.abs(d) * 0.15;
    }
    lastRotZ = rotz;

    const s = Math.min(spinSpeed / 10, 1);      // ~10 deg/frame = full speed
    if (s > 0.05) {
        setParam("gate", 1);
        setParam("maxSpeed", 0.1 + 0.9 * s);
    } else {
        setParam("gate", 0);
    }
}

function deviceShaken() {
    shaketimer = millis();
    statusLabels[0].style("color", "pink");
}

// Desktop testing: hold mouse = engine on, speed from mouse x-position
function mousePressed() {
    if (!audioOn()) return;
    setParam("maxSpeed", 0.1 + 0.9 * (mouseX / windowWidth));
    setParam("gate", 1);
}
function mouseReleased() {
    if (!audioOn()) return;
    setParam("gate", 0);
}
