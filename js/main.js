"use strict";

window.addEventListener("DOMContentLoaded", start);

let clickables = null;
let loggedInUser = false;

const itemtypes = {
  video: "Code-along video",
  lecture: "Informational video",
  exercise: "Exercise",
  assignment: "Milestone assignment",
};

function setupUI() {
  // setup modals
  const modals = document.querySelectorAll(".modal");
  M.Modal.init(modals);

  // custom functions for some modals
  M.Modal.getInstance(document.querySelector("#modal-myskills")).options.onOpenStart = openMySkills;

  M.Modal.getInstance(document.querySelector("#modal-myprogress")).options.onOpenStart = openMyProgress;
  
  M.Modal.getInstance(document.querySelector("#modal-allusers")).options.onOpenStart = openAllUsers;

  M.Modal.getInstance(document.querySelector("#modal-allprogress")).options.onOpenStart = openAllProgress;
}

function setupUser(user) {
  // TODO: Implement admin-only menus

  if (user) {
    // logged in!

    // hide logged out items
    document.querySelectorAll(".logged-out").forEach((elm) => elm.classList.add("hide"));
    // show logged in menus
    document.querySelectorAll(".logged-in").forEach((elm) => elm.classList.remove("hide"));

    db.collection("users")
      .doc(user.uid)
      .get()
      .then((doc) => {
        document.querySelector(".username").textContent = "- " + doc.data().name;
      })
      .catch((err) => {
        // Sometimes the doc isn't ready when the user is newly created - we just ignore that, and get again a bit later.
        console.warn("Error during setupUser - ignored");
      });
  } else {
    // not logged in

    // hide logged in menus
    document.querySelectorAll(".logged-in").forEach((elm) => elm.classList.add("hide"));
    // show logged out menus
    document.querySelectorAll(".logged-out").forEach((elm) => elm.classList.remove("hide"));

    document.querySelector(".username").textContent = "";
  }
}

async function start() {
  console.log("start");
  setupUI();
  // load the SVG
  const svgData = await loadSVG("screen1.svg");
  document.querySelector("#svg_container").innerHTML = svgData;

  // load JSON
  clickables = await loadJSON("screen1.json");

  clickables = clickables.clickables;

  console.log("Loaded JSON!");

  prepareObjects();
  prepareClickables();

  initializeUserHandling();

  updateVisualTree();
}

function prepareObjects() {
  clickables.forEach((clickable) => {
    // make skills into array
    if (clickable.skills) {
      if (typeof clickable.skills.requires === "string") {
        clickable.skills.requires = [clickable.skills.requires];
      }

      if (typeof clickable.skills.unlocks === "string") {
        clickable.skills.unlocks = [clickable.skills.unlocks];
      }
    }
  });
}

function prepareClickables() {
  console.log("prepare!");
  clickables.forEach(prepareClickable);
}

function prepareClickable(elm) {
  // find svg g
  const g = document.querySelector(`#${elm.id}`);
  let geom = null;

  if (elm.type === "video") {
    geom = g.querySelector("circle");
  } else if (elm.type === "exercise") {
    geom = g.querySelector("rect");
  } else if (elm.type === "lecture") {
    geom = g.querySelector("path");
  }

  // handle text
  const bbox = geom.getBBox();
  // create text element
  const textElm = document.createElementNS("http://www.w3.org/2000/svg", "text");

  if (elm.type === "exercise") {
    textElm.textContent = "Exercise: " + elm.description;
  } else {
    textElm.textContent = elm.description;
  }

  textElm.classList.add("description");
  textElm.setAttribute("x", bbox.x + bbox.width + 6);

  if (elm.subdescription) {
    const subText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    subText.textContent = elm.subdescription;
    subText.classList.add("subdescription");
    subText.setAttribute("x", bbox.x + bbox.width + 6);

    textElm.setAttribute("y", bbox.y + 14);

    subText.setAttribute("y", bbox.y + bbox.height / 2 + 11);
    g.append(subText);
  } else {
    textElm.setAttribute("y", bbox.y + bbox.height / 2 + 4);
  }
  g.append(textElm);

  // add click-event to geometry and both texts
  geom.addEventListener("click", openModal);
  textElm.addEventListener("click", openModal);
}

function getItemWithId(id) {
  return clickables.find((item) => item.id === id);
}

function openModal(event) {
  const id = event.target.parentElement.id;
  openInfoBox(id);
}

function openInfoBox(id) {
  const infobox = document.querySelector("#item-modal");
  const item = getItemWithId(id);

  const hasCompleted = hasProgress("completed", { id: id });
  let hasRequiredSkills = true; // initially - set to false later, when checking skills

  // show clickable as active
  document.querySelector(`#${id}`).classList.add("active");

  // initially - hide requires and unlocks lines!
  infobox.querySelector(".requires-line").classList.add("hide");
  infobox.querySelector(".unlocks-line").classList.add("hide");

  // put data in infobox
  infobox.querySelector("h1").textContent = item.description;
  infobox.querySelector("h2").textContent = item.subdescription ? item.subdescription : "";

  infobox.querySelector("[data-data='type']").textContent = itemtypes[item.type];

  // Add video - if exists
  if (item.youtube) {
    document.querySelector(".video-wrapper").classList.remove("hide");
    const videoframe = document.querySelector("[data-data='video']");
    videoframe.src = "https://www.youtube.com/embed/" + item.youtube;
  } else {
    document.querySelector(".video-wrapper").classList.add("hide");
  }

  // handle differences between exercise and video (an exercise could also have a video, so don't exclude it)
  // hide "everything"
  document.querySelector(".exercise-description").classList.add("hide");
  document.querySelector(".complete_text.exercise").classList.add("hide");
  document.querySelector(".complete_text.video").classList.add("hide");

  if (item.type === "exercise") {
    document.querySelector(".complete_text.exercise").classList.remove("hide");

    // load description content
    fetch(`exercises/${item.id} exercise.html`)
      .then((response) => response.text())
      .then((html) => {
        // TODO: parse html, and extract body? - is it necessary?

        document.querySelector(".exercise-description").innerHTML = html;

        document.querySelector(".exercise-description").classList.remove("hide");
      });
  } else {
    document.querySelector(".complete_text.video").classList.remove("hide");
  }

  // skills
  if (item.skills) {
    if (item.skills.requires) {
      const requires = infobox.querySelector("[data-data='requires']");
      requires.innerHTML = item.skills.requires
        .map((requirement) => {
          const hasThisSkill = hasSkills([requirement]);
          hasRequiredSkills = hasRequiredSkills & hasThisSkill;

          const modifier = loggedInUser ? (hasThisSkill ? "bolder" : "pulse") : "";

          // Mark if user has this requirement or not
          return `<div class='chip ${modifier}'>${requirement}</div>`;
        })
        .join(" ");
      infobox.querySelector(".requires-line").classList.remove("hide");
    }

    const unlocks = infobox.querySelector("[data-data='unlocks']");

    // Handle XP
    if (item.skills.unlocks[0] === "xp") {
      unlocks.innerHTML = item.skills.requires
        .map((requirement) => {
          return `<div class='chip'>${requirement}+</div>`;
        })
        .join(" ");
    } else {
      // normal skills
      unlocks.innerHTML = item.skills.unlocks
        .map((unlocked) => {
          return `<div class='chip'>${unlocked}</div>`;
          // TODO: Mark if user has already unlocked this skill
        })
        .join(" ");
    }
    infobox.querySelector(".unlocks-line").classList.remove("hide");
  }

  if (loggedInUser && hasRequiredSkills) {
    document.querySelector(".missing-requirements").classList.add("hide");
    document.querySelector(".has-requirements").classList.remove("hide");
  } else {
    document.querySelector(".missing-requirements").classList.remove("hide");
    document.querySelector(".has-requirements").classList.add("hide");
  }

  // completion
  const checkbox = document.querySelector("#completed_activity");
  if (hasCompleted) {
    console.log("User has already completed this task");
    // mark checkbox as checked, and disable
    checkbox.checked = true;
    checkbox.setAttribute("disabled", "disabled");
  } else {
    checkbox.checked = false;
    checkbox.removeAttribute("disabled");
  }

  function closeThisModal() {
    // mark clickable as no longer active
    document.querySelector(`#${id}`).classList.remove("active");

    const checkbox = document.querySelector("#completed_activity");

    if (checkbox.checked) {
      // add all skills unlocked
      if (item.skills) {
        item.skills.unlocks.forEach((unlock) => {
          if (unlock === "xp") {
            item.skills.requires.forEach(addSkill);
          } else {
            addSkill(unlock);
          }
        });
      }

      // Mark this in progress!
      addProgressEvent("completed", { id: id });

      // Display this as completed
      document.querySelector(`#${id}`).classList.add("completed");
    }
  }

  addProgressEvent("openmodal", { id: id });

  const modal = M.Modal.getInstance(infobox);
  modal.options.onCloseEnd = closeThisModal;
  modal.open();
}

function updateVisualTree() {
  // go through all clickables - if the user has the necessary skills, enable it, otherwise, disable
  clickables.forEach((elm) => {
    const g = document.querySelector(`#${elm.id}`);

    // only if it requires skills - otherwise, leave it enabled!
    if (elm.skills && elm.skills.requires) {
      g.classList.remove("enabled");
      g.classList.remove("disabled");

      if (hasSkills(elm.skills.requires)) {
        g.classList.add("enabled");
      } else {
        g.classList.add("disabled");
      }
    } else {
      g.classList.remove("disabled");
      g.classList.add("enabled");
    }

    // check if it is completed or not
    if (hasProgress("completed", { id: elm.id })) {
      g.classList.add("completed");
    } else {
      g.classList.remove("completed");
    }
  });
}

/* MySkills */
function openMySkills() {
  const allSkills = allAvailableSkills(clickables);

  const modal = document.querySelector("#modal-myskills");
  const unlockedskills = Object.getOwnPropertyNames(currentSkills);

  // Find the skills that are still locked.
  const lockedskills = allSkills.filter((skillName) => !unlockedskills.includes(skillName));

  // TODO: Allow for sorting and ordering

  // Show unlocked skills, with info about experience points
  modal.querySelector(".myskills").innerHTML = unlockedskills
    .map((skillName) => {
      const skillValue = currentSkills[skillName];

      if (skillValue === 1) {
        return `<div class='chip'>${skillName}</div>`;
      } else {
        return `<div class='chip'>${skillName}<span class="plus">+${skillValue > 2 ? skillValue - 1 : ""}</span></div>`;
      }
    })
    .join("");

  // Show skills still locked.
  modal.querySelector(".lockedskills").innerHTML = lockedskills.map((skillName) => `<div class='chip'>${skillName}</div>`).join("");
}

/* MyProgress */
function openMyProgress() {
  console.log("Open my progress");

  // find all clickables - sort them v first, then e, 
  const progresses = clickables.map(item => { 
    return { id: item.id, type: item.type, description: item.description };
  });
  
  // TODO: Sort
  document.querySelector(".progresslist").innerHTML = progresses.map(item => {
    // mark the li if the user has this progress or not
    let mark = "missing";
    if (hasProgress("completed", { id: item.id })) {
      mark = "has";
    }
    return `<li class="${mark}"><span class="${item.type}"></span><span class="text">${item.description}</span></li>`;
  }).join("");

/*
  <ul class="progresslist"></ul>

  <li><span class="lecture"></span><span class="text">How this course is structured</span></li>
*/
}




function openAllUsers() {
  console.log("open all users");

  const table = document.querySelector("table#usertable tbody")
  const template = document.querySelector("template#user_in_table");
  
  // clear userlist
  table.innerHTML = "";

  // find all users
  getUserList().then( users => {

    users.sort( (a,b) => {
      return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1;
    });

    // TODO: Make the list sortable from the UI

    users.forEach( user => {
      // clone template
      const clone = template.content.cloneNode(true);

      // fill template
      clone.querySelector("[data-field='name']").textContent = user.name;
      clone.querySelector("[data-field='role']").textContent = user.role;

      // append template
      table.append(clone);
    });
  } );
}

function openAllProgress() {
  console.log("open all progress");

  // find all clickables - TODO: sort them v first, then e, 
  // These are the progresses all users are compared to
  const progresses = clickables.map(item => { 
    return { id: item.id, type: item.type, description: item.description };
  });

  // find the progress-table - clear it completely, and rebuild a new header
  const progresstable = document.querySelector("#progresstable");

  // build new header from progresses
  let header = "<tr><th>User</th>";
  header += progresses.map( progress => `<th><span class='text'>${progress.description}</span></th>`).join("");
  header += "</tr>";

  progresstable.tHead.innerHTML = header;

  // Clear body
  progresstable.tBodies[0].innerHTML = ""

  // get all the users
  getUserList().then( users => {
    // for each user, get all completed progress only ...
    users.forEach( user => {
      getProgressForUser( user.uid ).then( completed => {

        // Then build display
        let html = `<tr><td>${user.name}</td>`;
        
        console.log("user: " + user.name);

        console.log( completed );

        html += progresses.map(item => {
          // does the user have this progress?
          // if completed contains an object with this items is - then this user has completed!
          const mark = completed.find( progress => progress.id === item.id)?"has":"missing";
        
          return `<td class="${mark} ${item.type}"><img src="icons/${item.type}.svg"></td>`;
        }).join("");
     
        html += "</tr>";

        progresstable.tBodies[0].innerHTML += html;

      });
    });
  });
}

async function loadJSON(url) {
  const response = await fetch(url);
  return response.json();
}

async function loadSVG(url, destination) {
  const response = await fetch(url);
  return response.text();
}
