"use strict";

let currentProgress = [];

function initializeProgress() {
  addProgressEvent("Signup");
}

function addProgressEvent(eventName, eventData = {}) {
  const user = auth.currentUser;

  // Only add a progress if the user exists ...
  if (user) {
    const data = {
      attime: firebase.firestore.FieldValue.serverTimestamp(),
      event: eventName,
    };

    Object.assign(data, eventData);

    db.collection("progress")
      .doc(user.uid)
      .collection("events")
      .add(data)
      .then(() => {
        console.log(`Created ${eventName} event for this user!`);
      });
  }
}

function hasProgress(eventName, eventData) {
  return (
    undefined !==
    currentProgress.find((event) => {
      if (eventName === event.event) {
        for (let prop in eventData) {
          if (event[prop] !== eventData[prop]) {
            return false;
          }
        }

        return true;
      } else {
        return false;
      }
    })
  );
}

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
}

/* Visual progress representation - HTML table */
class ProgressTable {
  constructor(selector) {
    if (typeof selector === "string") {
      selector = document.querySelector(selector);
    }

    this.progresstable = selector;

    this.progresses = clickables.map(item => { 
      return { id: item.id, type: item.type, description: item.description };
    });

    this.fields = [];

    this.clearBody();
  }

  clearBody() {
    this.progresstable.tBodies[0].innerHTML = "";
  }

  addField(fieldName) {
    this.fields.push(fieldName);
  }

  addHeader() {
    let header = "<tr>";
    header += this.fields.map(field => `<th>${field}</th>`).join("");
    header += this.progresses.map( progress => `<th><span class='text'>${progress.description}</span></th>`).join("");
    header += "</tr>";
    this.progresstable.tHead.innerHTML = header;
  }

  addRow(checkFunction, fields) {
    let row = "<tr>";
    if (fields) {
      row += this.fields.map(fieldName => `<td>${fields[fieldName]}</td>`).join("");
    }
    row += this.progresses.map(item => {
      const mark = checkFunction(item) ? "has" : "missing";
      return `<td class="${mark} ${item.type}"><img src="icons/${item.type}.svg"></td>`;
    }).join("");
    row += "</tr>";

    this.progresstable.tBodies[0].innerHTML += row;
  }
}