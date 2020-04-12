"use strict";

let currentProgress = [];

function initializeProgress() {
  addProgressEvent("Signup");
}

function addProgressEvent(eventName, eventData = {}) {
  const user = auth.currentUser;

  const data = {
    attime: firebase.firestore.FieldValue.serverTimestamp(),
    event: eventName
  };

  Object.assign(data, eventData);

  db.collection('progress').doc(user.uid).collection('events').add(data).then(() => {
    console.log(`Created ${eventName} event for this user!`);
  });
}


function hasProgress(eventName, eventData) {
  return undefined !== currentProgress.find(event => {
    if (eventName === event.event) {

      for ( let prop in eventData) {
        if (event[prop] !== eventData[prop]) {
          return false;
        }
      }

      return true;

    } else {
      return false;
    }

  })
}

function readProgressEvents() {
  const user = auth.currentUser;

  db.collection('progress').doc(user.uid).collection('events').onSnapshot(snapshot => {
    // load progressEvents for this user
    console.log("re-read progress");
    
    currentProgress = [];
    currentProgress = snapshot.docs.map(doc => doc.data());

    // TODO: Mark this progress somewhere?
    updateVisualTree();

    }, function (err) {
    console.error("Error reading progress: ", err.message);
  });

}