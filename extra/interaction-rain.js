//==========================================================================================
// AUDIO SETUP
//==========================================================================================
let dspNode = null;
let dspNodeParams = null;
let jsonParams = null;

const dspName = "rain";
const instance = new FaustWasm2ScriptProcessor(dspName);

if (typeof module === "undefined") {
    window[dspName] = instance;
} else {
    const exp = {};
    exp[dspName] = instance;
    module.exports = exp;
}

rain.createDSP(audioContext, 1024)
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
// INTERACTION 1: phone is SHAKEN  ->  RAIN
// Use case: the phone becomes a "rain stick". The harder you shake,
// the denser the rain, and it fades out when you stop - like real rain sticks.
//==========================================================================================
let shakeEnergy = 0;     // 0..1, how vigorously the phone is being shaken
let lastAcc = null;

function onDspReady() {
    setParam("density", 0);
    setParam("volume", 0.6);
}

function accelerationChange(accx, accy, accz) {
    if (!audioOn()) return;
    if (lastAcc) {
        // change in acceleration between frames = how much the phone is being shaken
        const jerk = Math.abs(accx - lastAcc[0]) + Math.abs(accy - lastAcc[1]) + Math.abs(accz - lastAcc[2]);
        shakeEnergy = Math.max(shakeEnergy * 0.95, Math.min(jerk / 15, 1));  // fast attack, slow decay
    }
    lastAcc = [accx, accy, accz];
    setParam("density", Math.round(shakeEnergy * 1000));   // density slider is 0..1000
}

function rotationChange(rotx, roty, rotz) {}

function deviceShaken() {
    shaketimer = millis();
    statusLabels[0].style("color", "pink");
}

// Desktop testing: click anywhere = short burst of rain
function mousePressed() {
    if (!audioOn()) return;
    shakeEnergy = 1;
    setParam("density", 1000);
    setTimeout(() => setParam("density", 0), 600);
}
