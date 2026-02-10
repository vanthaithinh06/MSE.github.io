document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('container');
    const registerBtn = document.getElementById('register');
    const loginBtn = document.getElementById('login');
    const forgotPasswordLink = document.querySelector('.fp');
    const forgotPasswordForm = document.querySelector('.form-container.forgot-password');
    const signInForm = document.querySelector('.form-container.sign-in');
    const forgotPasswordEmailInput = forgotPasswordForm.querySelector('input[type="email"]');
    const forgotPasswordSubmitButton = forgotPasswordForm.querySelector('button[type="submit"]');

    // Toggle between sign-in and sign-up forms
    registerBtn.addEventListener('click', () => {
        container.classList.add("active");
        signInForm.style.display = 'none';
        forgotPasswordForm.style.display = 'none';
    });

    loginBtn.addEventListener('click', () => {
        container.classList.remove("active");
        signInForm.style.display = 'block';
        forgotPasswordForm.style.display = 'none';
    });

    // Show forgot password form
    forgotPasswordLink.addEventListener('click', (event) => {
        event.preventDefault();
        signInForm.style.display = 'none';
        forgotPasswordForm.style.display = 'block';
        forgotPasswordEmailInput.value = ''; // Clear the input field
        forgotPasswordSubmitButton.disabled = true; // Disable submit button initially
    });

    // Enable submit button if email input is not empty
    forgotPasswordEmailInput.addEventListener('input', () => {
        if (forgotPasswordEmailInput.value.trim() !== '') {
            forgotPasswordSubmitButton.disabled = false;
        } else {
            forgotPasswordSubmitButton.disabled = true;
        }
    });

    // Handle forgot password form submission
    forgotPasswordForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const email = forgotPasswordEmailInput.value.trim();

        fetch('/forgot-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: email })
        })
        .then(response => response.json())
        .then(data => {
            alert(data.message);
            if (data.success) {
                forgotPasswordForm.style.display = 'none';
                signInForm.style.display = 'block';
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
    });
});

const passwordField = document.getElementById("password")

const handleMouseMove = event => {
    if (!document.querySelector("#password:is(:focus)") && !document.querySelector("#password:is(:user-invalid)")) {
        const eyes = document.getElementsByClassName('eye')
  
        for (let eye of eyes) {
               const x = eye.getBoundingClientRect().left + 10;
               const y = eye.getBoundingClientRect().top + 10;
               const rad = Math.atan2(event.pageX - x, event.pageY - y);
               const rot = (rad * (180 / Math.PI) * -1) + 180;
        
               eye.style.transform = `rotate(${rot}deg)`;
            }
    }
}

const handleFocusPassword = event => {
    document.getElementById('face').style.transform = 'translateX(30px)'
    const eyes = document.getElementsByClassName('eye')

    for (let eye of eyes) {
        eye.style.transform = `rotate(100deg)`;
     }
     
}

const handleFocusOutPassword = event => {
    document.getElementById('face').style.transform = 'translateX(0)'
    if(event.target.checkValidity()) {
        document.getElementById('ball').classList.toggle('sad')
    } else {
        document.getElementById('ball').classList.toggle('sad')
        const eyes = document.getElementsByClassName('eye')
  
        for (let eye of eyes) {
               eye.style.transform = `rotate(215deg)`;
            }
    }
}

var scene, camera, renderer;
init();
render();

function init() {
    // S C E N E
    scene = new THREE.Scene();

    // C A M E R A
    camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.0001, 10000 );
    camera.position.set( 0, 0, 5 );
    scene.add( camera );

    // R E N D E R E R
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.querySelector('[data-js="stage"]').appendChild(renderer.domElement);
}
// geometry for orbiter
var orbitGeometry = new THREE.IcosahedronGeometry(0.05, 1);

// color for each orbiter/light
var colors = [ 0xff0000, 0x00ff00, 0x0000ff, 0xffffff, 0xff00ff, 0xffff00, 0x00ffff, 0xff7f00, 0x7f00ff, 0x00ff7f, 0xffc080, 0x800080, 0x008000, 0x808000, 0x008080 ];
for ( i = 0; i < 15; i++ ) {
    // setting different color to each orbiter
    var orbitMaterial = new THREE.MeshBasicMaterial({
        color: colors[i],
    });

    // wraps one orbiter and one light
    // provides rotation
    wrapper = new THREE.Object3D( 3, 0, 0 );
    wrapper.rotation.order = 'ZXY';
    wrapper.rotation.set( 0, 0, 0 - i );
    scene.add( wrapper );

    // glowing light
    light = new THREE.PointLight( colors[i], 2, 1 );
    light.position.set(0, 1, 1);
    wrapper.add( light );

    // orbiter
    orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
    orbit.position.set( light.position.x, light.position.y, light.position.z );
    wrapper.add( orbit );

    // animation for each wrapper
    TweenMax.to( wrapper.rotation, 2, {
        ease: Power0.easeNone,
        x: Math.PI * 2,
        repeat: -1,
        delay: i * -0.7
    });
}

window.addEventListener('resize', resizeHandler);

function render() {
    requestAnimationFrame(render);
    renderer.render(scene, camera);
}

function resizeHandler() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
}

    
document.addEventListener("mousemove", event => handleMouseMove(event))
passwordField.addEventListener('focus', event => handleFocusPassword(event))
passwordField.addEventListener('focusout', event => handleFocusOutPassword(event))

document.getElementById('submit').addEventListener("mouseover", event => document.getElementById('ball').classList.toggle('look_at'))
document.getElementById('submit').addEventListener("mouseout", event => document.getElementById('ball').classList.toggle('look_at'))

