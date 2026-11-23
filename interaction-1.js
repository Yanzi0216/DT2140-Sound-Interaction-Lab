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
const dspName = "drop";
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
drop.createDSP(audioContext, 1024)
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

// INTERACTION 1: the phone is used to measure the angle of a surface, like a level -> Bubbles
// Like the air bubble in a real spirit level: the more tilted the surface, the faster and
// higher-pitched the bubbles. When the surface is level, it is silent.
let lastBubble = 0;

function accelerationChange(accx, accy, accz) {
    // playAudio()
}

function rotationChange(rotx, roty, rotz) {
    const tilt = Math.max(Math.abs(rotx), Math.abs(roty));   // 0 when the phone lies flat
    if (tilt < 3) return;                                     // level -> silence
    const t = Math.min(tilt, 30) / 30;                        // 0..1
    const interval = 900 - 650 * t;                           // 900 ms .. 250 ms between bubbles
    if (millis() - lastBubble > interval) {
        lastBubble = millis();
        playAudio(t);
    }
}

function mousePressed() {
    playAudio(mouseX / windowWidth)
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

function playAudio(t) {
    if (!dspNode) {
        return;
    }
    if (audioContext.state === 'suspended') {
        return;
    }
    // Edit here the addresses ("/thunder/rumble") depending on your WASM controls (you can see 
    // them printed on the console of your browser when you load the page)
    // For example if you change to a bell sound, here you could use "/churchBell/gate" instead of
    // "/thunder/rumble".
    dspNode.setParamValue("/drop/Freeverb/Wet", 0.08)             // less reverb -> clearer bubbles
    dspNode.setParamValue("/drop/Freeverb/0x00/RoomSize", 0.2)
    dspNode.setParamValue("/drop/freq/0x00", 350 + 650 * t)       // more tilt -> higher pitch (range 150-2000)
    dspNode.setParamValue("/drop/drop", 1)
    setTimeout(() => { dspNode.setParamValue("/drop/drop", 0) }, 30);
}

//==========================================================================================
// END
//==========================================================================================