//==========================================================================================
// AUDIO SETUP
//------------------------------------------------------------------------------------------
//
//------------------------------------------------------------------------------------------
// Edit just where you're asked to!
//------------------------------------------------------------------------------------------
//
//==========================================================================================
let dspNode = null;
let dspNodeParams = null;
let jsonParams = null;

// Change here to ("tuono") depending on your wasm file name
const dspName = "bells";
const instance = new FaustWasm2ScriptProcessor(dspName);

// output to window or npm package module
if (typeof module === "undefined") {
    window[dspName] = instance;
} else {
    const exp = {};
    exp[dspName] = instance;
    module.exports = exp;
}

// The name should be the same as the WASM file, so change tuono with brass if you use brass.wasm
bells.createDSP(audioContext, 1024)
    .then(node => {
        dspNode = node;
        dspNode.connect(audioContext.destination);
        console.log('params: ', dspNode.getParams());
        const jsonString = dspNode.getJSON();
        jsonParams = JSON.parse(jsonString)["ui"][0]["items"];
        dspNodeParams = jsonParams
        // const exampleMinMaxParam = findByAddress(dspNodeParams, "/thunder/rumble");
        // // ALWAYS PAY ATTENTION TO MIN AND MAX, ELSE YOU MAY GET REALLY HIGH VOLUMES FROM YOUR SPEAKERS
        // const [exampleMinValue, exampleMaxValue] = getParamMinMax(exampleMinMaxParam);
        // console.log('Min value:', exampleMinValue, 'Max value:', exampleMaxValue);
    });


//==========================================================================================
// INTERACTIONS
//------------------------------------------------------------------------------------------
//
//------------------------------------------------------------------------------------------
// Edit the next functions to create interactions
// Decide which parameters you're using and then use playAudio to play the Audio
//------------------------------------------------------------------------------------------
//
//==========================================================================================

// INTERACTION 2: the phone free falls for more than 30 cm -> Bells (alarm)
// Use case: fall detection / drop alarm.
// p5 gives the acceleration WITHOUT gravity (multiplied by 2): ~0 when the phone is still,
// ~19.6 (2 x 9.81) in free fall. Falling 30 cm takes about 0.25 s, so we require ~0.22 s.
let fallStart = null;
let lastRing = 0;

function accelerationChange(accx, accy, accz) {
    const mag = Math.sqrt(accx * accx + accy * accy + accz * accz);
    if (mag > 14 && mag < 26) {                       // close to 2 x g -> falling
        if (fallStart === null) fallStart = millis();
        if (millis() - fallStart > 220 && millis() - lastRing > 1500) {
            lastRing = millis();
            playAudio();
        }
    } else {
        fallStart = null;
    }
}

function rotationChange(rotx, roty, rotz) {
}

function mousePressed() {
    // playAudio()
    // Use this for debugging from the desktop!
}

function deviceMoved() {
    movetimer = millis();
    statusLabels[2].style("color", "pink");
}

function deviceTurned() {
    threshVals[1] = turnAxis;
}
function deviceShaken() {
    shaketimer = millis();
    statusLabels[0].style("color", "pink");
}

function getMinMaxParam(address) {
    const exampleMinMaxParam = findByAddress(dspNodeParams, address);
    // ALWAYS PAY ATTENTION TO MIN AND MAX, ELSE YOU MAY GET REALLY HIGH VOLUMES FROM YOUR SPEAKERS
    const [exampleMinValue, exampleMaxValue] = getParamMinMax(exampleMinMaxParam);
    console.log('Min value:', exampleMinValue, 'Max value:', exampleMaxValue);
    return [exampleMinValue, exampleMaxValue]
}

//==========================================================================================
// AUDIO INTERACTION
//------------------------------------------------------------------------------------------
//
//------------------------------------------------------------------------------------------
// Edit here to define your audio controls 
//------------------------------------------------------------------------------------------
//
//==========================================================================================

function playAudio() {
    if (!dspNode) {
        return;
    }
    if (audioContext.state === 'suspended') {
        return;
    }
    // sharper, brighter strike -> sounds more like an alarm bell than a soft church bell
    dspNode.setParamValue("/englishBell/strikeSharpness", 3)
    dspNode.setParamValue("/englishBell/strikeCutOff", 12000)
    dspNode.setParamValue("/englishBell/strikePosition", 2)
    // three quick strikes: ding-ding-ding
    for (let i = 0; i < 3; i++) {
        setTimeout(() => { dspNode.setParamValue("/englishBell/gate", 1) }, i * 250);
        setTimeout(() => { dspNode.setParamValue("/englishBell/gate", 0) }, i * 250 + 60);
    }
}

//==========================================================================================
// END
//==========================================================================================