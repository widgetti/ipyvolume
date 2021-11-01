import { WebXRManager } from 'three'

export function createButton( renderer, onStart, onEnd, sessionInit = {} ) {

    const button = document.createElement( 'button' );
    console.log('__renderer:', renderer)

    function showStartAR( /*device*/ ) {

        if ( sessionInit.domOverlay === undefined ) {

            var overlay = document.createElement( 'div' );
            overlay.id = 'aroverlay';
            overlay.style.display = 'none';
            document.body.appendChild( overlay );
            // document.document.getElementById('bliep').appendChild( overlay );

            var svg = document.createElementNS( 'http://www.w3.org/2000/svg', 'svg' );
            svg.setAttribute( 'width', 38 );
            svg.setAttribute( 'height', 38 );
            svg.style.position = 'absolute';
            svg.style.right = '20px';
            svg.style.top = '20px';
            svg.addEventListener( 'click', function () {
                onEnd();
                console.log('end');
                currentSession.end();

            } );
            overlay.appendChild( svg );

            var path = document.createElementNS( 'http://www.w3.org/2000/svg', 'path' );
            path.setAttribute( 'd', 'M 12,12 L 28,28 M 28,12 12,28' );
            path.setAttribute( 'stroke', '#fff' );
            path.setAttribute( 'stroke-width', 2 );
            svg.appendChild( path );

            if ( sessionInit.optionalFeatures === undefined ) {

                sessionInit.optionalFeatures = [];

            }

            sessionInit.optionalFeatures.push( 'dom-overlay' );
            sessionInit.domOverlay = { root: overlay };

        }

        //

        let currentSession = null;

        async function onSessionStarted( session ) {
            session.addEventListener( 'end', onSessionEnded );
            console.log('rr', renderer);
            console.log('start session', renderer.xr)
            renderer.xr.setReferenceSpaceType( 'local' );
            console.log('b4 set session');
            await renderer.xr.setSession( session );
            renderer.setSize( window.innerWidth, window.innerHeight );
            console.log('after set session');
            button.textContent = 'STOP AR';
            sessionInit.domOverlay.root.style.display = '';
            sessionInit.domOverlay.root.style.display = '';

            currentSession = session;

        }

        function onSessionEnded( /*event*/ ) {

            currentSession.removeEventListener( 'end', onSessionEnded );

            button.textContent = 'START AR';
            sessionInit.domOverlay.root.style.display = 'none';

            currentSession = null;

        }

        //

        button.style.display = '';
        button.id = 'arbtn';

        button.style.cursor = 'pointer';
        button.style.left = 'calc(50% - 50px)';
        button.style.width = '100px';

        button.textContent = 'START AR';

        button.onmouseenter = function () {

            button.style.opacity = '1.0';

        };

        button.onmouseleave = function () {

            button.style.opacity = '0.5';

        };

        button.onclick = function () {
            console.log('current', currentSession);
            if ( currentSession === null ) {
                console.log('requesting session')
                onStart();
                navigator.xr.requestSession( 'immersive-ar', sessionInit ).then( onSessionStarted );

            } else {

                currentSession.end();

            }

        };

    }

    function disableButton() {

        button.style.display = '';

        button.style.cursor = 'auto';
        button.style.left = 'calc(50% - 75px)';
        button.style.width = '150px';

        button.onmouseenter = null;
        button.onmouseleave = null;

        button.onclick = null;

    }

    function showARNotSupported() {
        console.log('ar not supported');
        disableButton();

        button.textContent = 'AR NOT SUPPORTED';

    }

    function stylizeElement( element ) {

        element.style.position = 'absolute';
        element.style.bottom = '20px';
        element.style.padding = '12px 6px';
        element.style.border = '1px solid #fff';
        element.style.borderRadius = '4px';
        element.style.background = 'rgba(0,0,0,0.1)';
        element.style.color = '#fff';
        element.style.font = 'normal 13px sans-serif';
        element.style.textAlign = 'center';
        element.style.opacity = '0.5';
        element.style.outline = 'none';
        element.style.zIndex = '999';

    }
    console.log('xr:', 'xr' in navigator);
    if ( 'xr' in navigator ) {

        button.id = 'ARButton';
        // button.style.display = 'none';

        stylizeElement( button );

        navigator.xr.isSessionSupported( 'immersive-ar' ).then( function ( supported ) {
            console.log('supported!:', supported)
            console.log('context', renderer.getContext());
            supported ? showStartAR() : showARNotSupported();

        } ).catch( showARNotSupported );

        return button;

    } else {

        const message = document.createElement( 'a' );

        if ( window.isSecureContext === false ) {

            message.href = document.location.href.replace( /^http:/, 'https:' );
            message.innerHTML = 'WEBXR NEEDS HTTPS'; // TODO Improve message

        } else {

            message.href = 'https://immersiveweb.dev/';
            message.innerHTML = 'WEBXR NOT AVAILABLE';

        }

        message.style.left = 'calc(50% - 90px)';
        message.style.width = '180px';
        message.style.textDecoration = 'none';

        stylizeElement( message );

        return message;

    }

}
