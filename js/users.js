"use strict";

// user status
auth.onAuthStateChanged(user => {
//  console.log("Auth state change");
//  console.log(user);
  if (user) {
    // logged in
    console.log("User logged in");

    readProgressEvents();
    readSkills();

    // NOTE: If user had just been created, data might not be available yet!
    setupUser(user);

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
    setupUser(user);
//    setupUI();
//    setupGuides([]);
  }

});


// signup
document.querySelector("#signup-form").addEventListener("submit", signup);

function signup(event) {
  event.preventDefault();
  
  const signupForm = document.querySelector("#signup-form");
  const email = signupForm['signup-email'].value;
  const password1 = signupForm['signup-password'].value;
  const password2 = signupForm['repeat-password'].value;

  signupForm.querySelector(".error").innerHTML = "";

  if (password1 !== password2) {
    
    signupForm.querySelector(".error").innerHTML = "Passwords don't match";
  } else {

    let user = null;
  
    auth.createUserWithEmailAndPassword(email, password1).then(cred => {
      console.log("signup complete!");
      // store the user, so we can call setupUser <- the authStateChange won't alway wait until we are ready
      user = cred.user;
      
      return db.collection('users').doc(cred.user.uid).set({
        name: signupForm['signup-name'].value
      });

    }).then(() => {
      console.log("stored user's name");

      initializeProgress();

      resetSkills();
      // succesfully added data to users collection
      // update UI
      setupUser(user);

      // succes! Clear and close the modal
      signupForm.reset();
      M.Modal.getInstance(document.querySelector("#modal-signup")).close();
    }).catch(err => {
      signupForm.querySelector(".error").innerHTML = err.message;
    });
  }
}

// login
document.querySelector("#login-form").addEventListener("submit", login);

function login(event) {
  event.preventDefault();

  const loginForm = document.querySelector("#login-form");
  const email = loginForm['login-email'].value;
  const password = loginForm['login-password'].value;

  loginForm.querySelector(".error").innerHTML = "";

  auth.signInWithEmailAndPassword(email, password).then(cred => {
    console.log("logged in!");

    addProgressEvent("login");

    // close modal and clear input
    loginForm.reset();
    M.Modal.getInstance(document.querySelector("#modal-login")).close();
  }).catch(err => {
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
