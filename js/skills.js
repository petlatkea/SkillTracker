"use strict";

let currentSkills = {};

function resetSkills() {
  const user = auth.currentUser;
  db.collection("skills")
    .doc(user.uid)
    .set({ intro: 1 })
    .then(() => {
      readSkills();
    });
}

// TODO: Could add multiple skills at once
function addSkill(skillName) {
  const user = auth.currentUser;

  let skillValue = 1;

  // if user already has this skill, increase its value
  if (currentSkills[skillName]) {
    skillValue += currentSkills[skillName];
  }

  // create skill object
  const data = {};
  data[skillName] = skillValue;

  // update skill
  db.collection("skills")
    .doc(user.uid)
    .update(data)
    .then(() => {
      console.log(`Added skill ${skillName} to current user`);
    });
}

function readSkills() {
  const user = auth.currentUser;

  db.collection("skills")
    .doc(user.uid)
    .onSnapshot(
      (snapshot) => {
        // loaded skills for this user
        console.log("re-read skills");
        // Make sure we don't set the list of skills to -undefined-
        const skills = snapshot.data();
        if (skills) {
          currentSkills = skills;
        }
        updateVisualTree();
      },
      function (err) {
        console.error("Error reading skills: ", err.message);
      }
    );
}

function hasSkills(listOfSkills) {
  return listOfSkills.every((skill) => currentSkills[skill] !== undefined);
}

/* returns a list of all the skills found in the given array of items */
function allAvailableSkills(clickables) {
  // TODO: Allow for sorting by item-id or something that can't be seen directly in the skill-names

  // Make a Set of all skills that can be unlocked
  const skillNames = new Set(clickables.map((cl) => (cl.skills ? cl.skills.unlocks : [""])).flat());

  // remove "xp" - that isn't really a skill
  skillNames.delete("xp");

  // Return as a plain array - to avoid Set-issues
  return Array.from(skillNames);
}
