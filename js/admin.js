"use strict";

// Admin functions - really shouldn't be accessible to all users ...

// Returns a (promise of a) list of all users, with uid, role and name
function getUserList() {

    return new Promise((resolve, reject) => {
        db.collection("users").get().then((snapshot) => {
            console.log("read all users");
            const allUsers = [];
    
            snapshot.forEach( doc => {
                const user = { uid: doc.id };
                const data = doc.data();
                if( data.admin ) {
                    user.role = "admin";
                } else {
                    user.role = "user";
                }
                user.name = data.name;
    
                allUsers.push(user);
            });
            
            resolve( allUsers );
    
        }).catch(err => {
            reject( err );
        });
    });
}


function getProgressForUser( uid ) {
    return new Promise((resolve, reject) => {
        db.collection("progress").doc(uid)
        .collection("events").where( "event" ,"==", "completed")
        .get().then((snapshot)=> {

            // This could probably be made more elegant ...
            const progresses = [];
            snapshot.forEach( doc => {
                progresses.push(doc.data());
            });
            resolve(progresses);
        }).catch( err => reject(err) );
    });
}

/*
function readProgressEvents() {
    const user = auth.currentUser;
  
    db.collection("progress")
      .doc(user.uid)
      .collection("events")
      .onSnapshot(
        (snapshot) => {
          // load progressEvents for this user
          console.log("re-read progress");
  
          currentProgress = [];
          currentProgress = snapshot.docs.map((doc) => doc.data());
  
          // TODO: Mark this progress somewhere?
          updateVisualTree();
        },
        function (err) {
          console.error("Error reading progress: ", err.message);
        }
      );
  }*/