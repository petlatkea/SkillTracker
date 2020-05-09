"use strict";

// user status
function initializeUserHandling() {
  auth.onAuthStateChanged(authStateChanged);
}

function authStateChanged(user) {
  // console.log("Auth state change");
  //  console.log(user);
  if (user) {
    // logged in
    console.log("User logged in");
    loggedInUser = true;

    // Read user info
    db.collection("users").doc(user.uid).get().then((doc) => {
      const data = doc.data();
      console.log(data);
      user.name = data.name;
      // TODO: Use real claims for user roles! Just for securitys sake ...
      user.isAdmin = data.admin !== undefined;

      setupUser(user);
      
      readProgressEvents();
      readSkills();
    })
      .catch((err) => {
        if (err.message === "Missing or insufficient permissions.") {
          databaseUnavailable();
        } else {
          

          // Sometimes the doc isn't ready when the user is newly created - we just ignore that, and get again a bit later.
          console.warn("Error during setupUser - ignored");
          console.warn(err.message);
        }
     });

    // NOTE: If user had just been created, data might not be available yet!

    // check if user is admin
    /*    
    user.getIdTokenResult().then(idTokenResult => {
//      console.log(idTokenResult.claims);
//      console.log(idTokenResult.claims.admin);
      user.admin = idTokenResult.claims.admin; // store admin status on local user variable
      setupUI(user); // moved here, because it has to wait for the promise to return
    })
    
    // get data
    //    db.collection("guides").get().then(snapshot => {
      db.collection("guides").onSnapshot(snapshot => {
        //  console.log(snapshot.docs);
        setupGuides(snapshot.docs);
      }, function (err) {
        console.log("error: ", err.message);
      });
  */
  } else {
    console.log("User logged out");
    loggedInUser = false;
    currentProgress = [];
    currentSkills = {};
    updateVisualTree();
    setupUser(user);
  }
}

// signup
document.querySelector("#signup-form").addEventListener("submit", signup);

function signup(event) {
  event.preventDefault();

  const signupForm = document.querySelector("#signup-form");
  const email = signupForm["signup-email"].value;
  const password1 = signupForm["signup-password"].value;
  const password2 = signupForm["repeat-password"].value;

  signupForm.querySelector(".error").innerHTML = "";

  if (password1 !== password2) {
    signupForm.querySelector(".error").innerHTML = "Passwords don't match";
  } else {
    let user = null;

    auth
      .createUserWithEmailAndPassword(email, password1)
      .then((cred) => {
        console.log("signup complete!");
        // store the user, so we can call setupUser <- the authStateChange won't alway wait until we are ready
        user = cred.user;

        return db.collection("users").doc(cred.user.uid).set({
          name: signupForm["signup-name"].value,
        });
      })
      .then(() => {
        console.log("stored user's name");

        initializeProgress();

        resetSkills();
        // succesfully added data to users collection
        // update UI
        setupUser(user);

        // succes! Clear and close the modal
        signupForm.reset();
        M.Modal.getInstance(document.querySelector("#modal-signup")).close();

        // Then open the modal for the "How this course is structured"
        openInfoBox("v00_01");
      })
      .catch((err) => {
        signupForm.querySelector(".error").innerHTML = err.message;
      });
  }
}

// login
document.querySelector("#login-form").addEventListener("submit", login);

function login(event) {
  event.preventDefault();

  const loginForm = document.querySelector("#login-form");
  const email = loginForm["login-email"].value;
  const password = loginForm["login-password"].value;

  loginForm.querySelector(".error").innerHTML = "";

  auth
    .signInWithEmailAndPassword(email, password)
    .then((cred) => {
      console.log("logged in!");

      addProgressEvent("login");

      // close modal and clear input
      loginForm.reset();
      M.Modal.getInstance(document.querySelector("#modal-login")).close();
    })
    .catch((err) => {
      loginForm.querySelector(".error").innerHTML = err.message;
    });
}

// logout
document.querySelector("#logout").addEventListener("click", logout);

function logout(event) {
  event.preventDefault();

  auth.signOut().then(() => {
    console.log("User logged out");
  });
}
