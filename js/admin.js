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