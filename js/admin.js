"use strict";

// Admin functions - really shouldn't be accessible to all users ...

// Returns a list of all users, with uid and name
function getUserList( callback ) {
    const allUsers = [];

    db.collection("users").get().then((snapshot) => {
        console.log("read all users");

        snapshot.forEach( doc => {

            const aUser = { uid: doc.id };
            Object.assign(aUser,doc.data());

            allUsers.push( aUser );
        });
        callback( allUsers );
    });
}
