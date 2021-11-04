export const closeOverlay = document.createElement("div");
closeOverlay.style.display = "none";
document.body.appendChild(closeOverlay);

let onClose = () => console.log("onClose not set");

const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
svg.setAttribute("width", 38);
svg.setAttribute("height", 38);
svg.style.position = "absolute";
svg.style.right = "20px";
svg.style.top = "20px";
svg.addEventListener("click", () => onClose());
closeOverlay.appendChild(svg);

const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
path.setAttribute("d", "M 12,12 L 28,28 M 28,12 12,28");
path.setAttribute("stroke", "#fff");
path.setAttribute("stroke-width", 2);
svg.appendChild(path);

function setOnClose(fn) {
    onClose = fn;
}

function showCloseOverlay(value) {
    closeOverlay.style.display = value ? "" : "none";
}

let lastXrTransform = null;
let lastWidth = null;
let lastHeight = null;

export function createController(renderer, scene, onSelect) {
    const arController = renderer.xr.getController(0);
    arController.addEventListener("select", () => onSelect(lastXrTransform));
    scene.add(arController);
    return arController;
}

export async function start(renderer, renderFn, onStop) {
    if (renderer.xr.getSession() !== null) {
        return;
    }
    renderer.xr.enabled = true;

    const sessionInit = {
        optionalFeatures: ["dom-overlay", "hit-test"],
        domOverlay: { root: closeOverlay }
    };

    showCloseOverlay(true);

    const session = await navigator.xr.requestSession("immersive-ar", sessionInit);
    renderer.xr.setReferenceSpaceType("local");
    renderer.xr.setSession(session);
    const { x, y } = renderer.getSize();
    lastWidth = x;
    lastHeight = y;
    renderer.setSize(window.innerWidth, window.innerHeight);

    lastXrTransform = null;

    renderer.setAnimationLoop(
        await extractHitTransform(
            renderer,
            renderFn,
            (xrTransform) => { lastXrTransform = xrTransform; }));

    setOnClose(onStop);
}

export function stop(renderer) {
    if (renderer.xr.getSession() === null) {
        return;
    }
    renderer.xr.getSession().end();
    renderer.xr.setSession(null);
    lastXrTransform = null;
    showCloseOverlay(false);
    renderer.setAnimationLoop(() => null);
    renderer.setSize(lastWidth, lastHeight);
}

async function extractHitTransform(renderer, renderFn, onXrTransformChange) {
    const session = renderer.xr.getSession();
    const referenceSpace = await session.requestReferenceSpace("viewer");
    const hitTestSource = await session.requestHitTestSource({ space: referenceSpace });

    return (time, frame) => {
        if (frame) {
            // based on https://threejs.org/examples/webxr_ar_hittest.html
            const referenceSpace = renderer.xr.getReferenceSpace();

            if (hitTestSource) {
                const hitTestResults = frame.getHitTestResults(hitTestSource);
                if (hitTestResults.length) {
                    const hit = hitTestResults[0];
                    const pose = hit.getPose(referenceSpace);
                    onXrTransformChange(pose.transform);
                }
            }
        }
        renderFn(time, frame);
    };
}
