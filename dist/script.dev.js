"use strict";

document.addEventListener('DOMContentLoaded', function () {
  var container = document.getElementById('container');
  var registerBtn = document.getElementById('register');
  var loginBtn = document.getElementById('login');
  var forgotPasswordLink = document.querySelector('.fp');
  var forgotPasswordForm = document.querySelector('.form-container.forgot-password');
  var signInForm = document.querySelector('.form-container.sign-in');
  var forgotPasswordEmailInput = forgotPasswordForm.querySelector('input[type="email"]');
  var forgotPasswordSubmitButton = forgotPasswordForm.querySelector('button[type="submit"]'); // Toggle between sign-in and sign-up forms

  registerBtn.addEventListener('click', function () {
    container.classList.add("active");
    signInForm.style.display = 'none';
    forgotPasswordForm.style.display = 'none';
  });
  loginBtn.addEventListener('click', function () {
    container.classList.remove("active");
    signInForm.style.display = 'block';
    forgotPasswordForm.style.display = 'none';
  }); // Show forgot password form

  forgotPasswordLink.addEventListener('click', function (event) {
    event.preventDefault();
    signInForm.style.display = 'none';
    forgotPasswordForm.style.display = 'block';
    forgotPasswordEmailInput.value = ''; // Clear the input field

    forgotPasswordSubmitButton.disabled = true; // Disable submit button initially
  }); // Enable submit button if email input is not empty

  forgotPasswordEmailInput.addEventListener('input', function () {
    if (forgotPasswordEmailInput.value.trim() !== '') {
      forgotPasswordSubmitButton.disabled = false;
    } else {
      forgotPasswordSubmitButton.disabled = true;
    }
  }); // Handle forgot password form submission

  forgotPasswordForm.addEventListener('submit', function (event) {
    event.preventDefault();
    var email = forgotPasswordEmailInput.value.trim();
    fetch('/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email
      })
    }).then(function (response) {
      return response.json();
    }).then(function (data) {
      alert(data.message);

      if (data.success) {
        forgotPasswordForm.style.display = 'none';
        signInForm.style.display = 'block';
      }
    })["catch"](function (error) {
      console.error('Error:', error);
    });
  });
});
var passwordField = document.getElementById("password");

var handleMouseMove = function handleMouseMove(event) {
  if (!document.querySelector("#password:is(:focus)") && !document.querySelector("#password:is(:user-invalid)")) {
    var eyes = document.getElementsByClassName('eye');
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = eyes[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var eye = _step.value;
        var x = eye.getBoundingClientRect().left + 10;
        var y = eye.getBoundingClientRect().top + 10;
        var rad = Math.atan2(event.pageX - x, event.pageY - y);
        var rot = rad * (180 / Math.PI) * -1 + 180;
        eye.style.transform = "rotate(".concat(rot, "deg)");
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator["return"] != null) {
          _iterator["return"]();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }
  }
};

var handleFocusPassword = function handleFocusPassword(event) {
  document.getElementById('face').style.transform = 'translateX(30px)';
  var eyes = document.getElementsByClassName('eye');
  var _iteratorNormalCompletion2 = true;
  var _didIteratorError2 = false;
  var _iteratorError2 = undefined;

  try {
    for (var _iterator2 = eyes[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
      var eye = _step2.value;
      eye.style.transform = "rotate(100deg)";
    }
  } catch (err) {
    _didIteratorError2 = true;
    _iteratorError2 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion2 && _iterator2["return"] != null) {
        _iterator2["return"]();
      }
    } finally {
      if (_didIteratorError2) {
        throw _iteratorError2;
      }
    }
  }
};

var handleFocusOutPassword = function handleFocusOutPassword(event) {
  document.getElementById('face').style.transform = 'translateX(0)';

  if (event.target.checkValidity()) {
    document.getElementById('ball').classList.toggle('sad');
  } else {
    document.getElementById('ball').classList.toggle('sad');
    var eyes = document.getElementsByClassName('eye');
    var _iteratorNormalCompletion3 = true;
    var _didIteratorError3 = false;
    var _iteratorError3 = undefined;

    try {
      for (var _iterator3 = eyes[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
        var eye = _step3.value;
        eye.style.transform = "rotate(215deg)";
      }
    } catch (err) {
      _didIteratorError3 = true;
      _iteratorError3 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion3 && _iterator3["return"] != null) {
          _iterator3["return"]();
        }
      } finally {
        if (_didIteratorError3) {
          throw _iteratorError3;
        }
      }
    }
  }
};

var scene, camera, renderer;
init();
render();

function init() {
  // S C E N E
  scene = new THREE.Scene(); // C A M E R A

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.0001, 10000);
  camera.position.set(0, 0, 5);
  scene.add(camera); // R E N D E R E R

  renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.querySelector('[data-js="stage"]').appendChild(renderer.domElement);
} // geometry for orbiter


var orbitGeometry = new THREE.IcosahedronGeometry(0.05, 1); // color for each orbiter/light

var colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffffff, 0xff00ff, 0xffff00, 0x00ffff, 0xff7f00, 0x7f00ff, 0x00ff7f, 0xffc080, 0x800080, 0x008000, 0x808000, 0x008080];

for (i = 0; i < 15; i++) {
  // setting different color to each orbiter
  var orbitMaterial = new THREE.MeshBasicMaterial({
    color: colors[i]
  }); // wraps one orbiter and one light
  // provides rotation

  wrapper = new THREE.Object3D(3, 0, 0);
  wrapper.rotation.order = 'ZXY';
  wrapper.rotation.set(0, 0, 0 - i);
  scene.add(wrapper); // glowing light

  light = new THREE.PointLight(colors[i], 2, 1);
  light.position.set(0, 1, 1);
  wrapper.add(light); // orbiter

  orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
  orbit.position.set(light.position.x, light.position.y, light.position.z);
  wrapper.add(orbit); // animation for each wrapper

  TweenMax.to(wrapper.rotation, 2, {
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

document.addEventListener("mousemove", function (event) {
  return handleMouseMove(event);
});
passwordField.addEventListener('focus', function (event) {
  return handleFocusPassword(event);
});
passwordField.addEventListener('focusout', function (event) {
  return handleFocusOutPassword(event);
});
document.getElementById('submit').addEventListener("mouseover", function (event) {
  return document.getElementById('ball').classList.toggle('look_at');
});
document.getElementById('submit').addEventListener("mouseout", function (event) {
  return document.getElementById('ball').classList.toggle('look_at');
});
//# sourceMappingURL=script.dev.js.map
